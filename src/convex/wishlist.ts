import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { findOrCreateBook, logActivity, requireViewer } from "./lib";
import { bookPayload } from "./books";

const priority = v.union(v.literal("someday"), v.literal("soon"), v.literal("next"));

export const list = query({
  args: {},
  handler: async (ctx) => {
    const viewer = await requireViewer(ctx);
    const [items, books, profiles] = await Promise.all([
      ctx.db
        .query("wishlistItems")
        .withIndex("by_household", (q) => q.eq("householdId", viewer.household._id))
        .collect(),
      ctx.db
        .query("books")
        .withIndex("by_household", (q) => q.eq("householdId", viewer.household._id))
        .collect(),
      ctx.db
        .query("profiles")
        .withIndex("by_household", (q) => q.eq("householdId", viewer.household._id))
        .collect(),
    ]);
    const booksById = new Map(books.map((book) => [book._id, book]));
    const joined: Array<{ item: (typeof items)[number]; book: (typeof books)[number] }> = [];
    for (const item of items) {
      const book = booksById.get(item.bookId);
      if (book) joined.push({ item, book });
    }
    return {
      items: joined,
      readers: profiles.map((profile) => ({
        userId: profile.userId,
        displayName: profile.displayName,
        isSample: profile.isSample ?? false,
      })),
      myUserId: viewer.userId,
    };
  },
});

export const add = mutation({
  args: {
    book: bookPayload,
    readerIds: v.array(v.id("users")),
    priority,
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const viewer = await requireViewer(ctx);
    if (!args.readerIds.length) throw new ConvexError("Choose at least one reader.");
    const book = await findOrCreateBook(
      ctx,
      viewer.household._id,
      viewer.userId,
      args.book,
      { fromDiscover: true },
    );
    const existing = await ctx.db
      .query("wishlistItems")
      .withIndex("by_book", (q) => q.eq("bookId", book._id))
      .collect();
    for (const readerId of args.readerIds) {
      const match = existing.find((item) => item.readerId === readerId);
      if (match) {
        await ctx.db.patch(match._id, {
          priority: args.priority,
          note: args.note ?? match.note,
        });
      } else {
        await ctx.db.insert("wishlistItems", {
          householdId: viewer.household._id,
          bookId: book._id,
          readerId,
          priority: args.priority,
          note: args.note?.slice(0, 1000),
          isSample: false,
          addedAt: Date.now(),
        });
      }
    }
    await logActivity(ctx, {
      householdId: viewer.household._id,
      readerId: viewer.userId,
      type: "wishlist",
      bookId: book._id,
      title: book.title,
      detail: args.readerIds.length > 1 ? "Added to the Together wishlist" : "Added to the wishlist",
    });
    return book._id;
  },
});

export const update = mutation({
  args: {
    itemId: v.id("wishlistItems"),
    priority: v.optional(priority),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const viewer = await requireViewer(ctx);
    const item = await ctx.db.get(args.itemId);
    if (!item || item.householdId !== viewer.household._id) {
      throw new ConvexError("That wishlist entry was not found.");
    }
    if (item.readerId !== viewer.userId) {
      throw new ConvexError("You can only change your own wishlist entry.");
    }
    await ctx.db.patch(item._id, {
      priority: args.priority ?? item.priority,
      note: args.note !== undefined ? args.note.slice(0, 1000) : item.note,
    });
    return true;
  },
});

export const remove = mutation({
  args: { itemId: v.id("wishlistItems") },
  handler: async (ctx, args) => {
    const viewer = await requireViewer(ctx);
    const item = await ctx.db.get(args.itemId);
    if (!item || item.householdId !== viewer.household._id) {
      throw new ConvexError("That wishlist entry was not found.");
    }
    if (item.readerId !== viewer.userId) {
      throw new ConvexError("You can only remove your own wishlist entry.");
    }
    await ctx.db.delete(item._id);
    return true;
  },
});

/** Move a wish into Currently Reading, keeping one central book record. */
export const start = mutation({
  args: {
    bookId: v.id("books"),
    readerIds: v.array(v.id("users")),
    mode: v.union(v.literal("individual"), v.literal("together")),
  },
  handler: async (ctx, args) => {
    const viewer = await requireViewer(ctx);
    const book = await ctx.db.get(args.bookId);
    if (!book || book.householdId !== viewer.household._id) {
      throw new ConvexError("That book was not found.");
    }
    if (!args.readerIds.length) throw new ConvexError("Choose at least one reader.");
    const now = Date.now();
    const records = await ctx.db
      .query("readingRecords")
      .withIndex("by_book", (q) => q.eq("bookId", book._id))
      .collect();
    for (const readerId of args.readerIds) {
      const existing = records.find((record) => record.readerId === readerId);
      if (existing) {
        if (existing.status === "completed") {
          throw new ConvexError("This reader has already finished this book.");
        }
        await ctx.db.patch(existing._id, { mode: args.mode, updatedAt: now });
      } else {
        await ctx.db.insert("readingRecords", {
          householdId: viewer.household._id,
          bookId: book._id,
          readerId,
          mode: args.mode,
          status: "reading",
          source: "physical",
          startDate: now,
          currentPage: 0,
          isSample: false,
          createdAt: now,
          updatedAt: now,
        });
      }
    }
    const wishes = await ctx.db
      .query("wishlistItems")
      .withIndex("by_book", (q) => q.eq("bookId", book._id))
      .collect();
    for (const wish of wishes) {
      if (args.readerIds.includes(wish.readerId)) await ctx.db.delete(wish._id);
    }
    await logActivity(ctx, {
      householdId: viewer.household._id,
      readerId: viewer.userId,
      type: "started",
      bookId: book._id,
      title: book.title,
      detail: args.readerIds.length > 1 ? "Starting together" : "Started from the wishlist",
    });
    return true;
  },
});

/** Combine separate wishes into one shared wishlist entry. */
export const combine = mutation({
  args: { bookId: v.id("books"), priority: v.optional(priority) },
  handler: async (ctx, args) => {
    const viewer = await requireViewer(ctx);
    const book = await ctx.db.get(args.bookId);
    if (!book || book.householdId !== viewer.household._id) {
      throw new ConvexError("That book was not found.");
    }
    const profiles = await ctx.db
      .query("profiles")
      .withIndex("by_household", (q) => q.eq("householdId", viewer.household._id))
      .collect();
    const wishes = await ctx.db
      .query("wishlistItems")
      .withIndex("by_book", (q) => q.eq("bookId", book._id))
      .collect();
    for (const profile of profiles) {
      const match = wishes.find((wish) => wish.readerId === profile.userId);
      if (match) {
        await ctx.db.patch(match._id, { priority: args.priority ?? match.priority });
      } else {
        await ctx.db.insert("wishlistItems", {
          householdId: viewer.household._id,
          bookId: book._id,
          readerId: profile.userId,
          priority: args.priority ?? "soon",
          isSample: false,
          addedAt: Date.now(),
        });
      }
    }
    await logActivity(ctx, {
      householdId: viewer.household._id,
      readerId: viewer.userId,
      type: "wishlist",
      bookId: book._id,
      title: book.title,
      detail: "Combined into a Together wish",
    });
    return true;
  },
});

/** "Already read": create the completion record directly from the wishlist. */
export const markAlreadyRead = mutation({
  args: {
    bookId: v.id("books"),
    rating: v.number(),
    review: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const viewer = await requireViewer(ctx);
    const book = await ctx.db.get(args.bookId);
    if (!book || book.householdId !== viewer.household._id) {
      throw new ConvexError("That book was not found.");
    }
    if (args.rating < 1 || args.rating > 5) {
      throw new ConvexError("Choose a rating between one and five stars.");
    }
    const now = Date.now();
    const existing = (
      await ctx.db
        .query("readingRecords")
        .withIndex("by_book", (q) => q.eq("bookId", book._id))
        .collect()
    ).find((record) => record.readerId === viewer.userId);
    if (existing) {
      await ctx.db.patch(existing._id, {
        status: "completed",
        completionDate: now,
        currentPage: book.pageCount ?? existing.currentPage,
        rating: args.rating,
        review: args.review?.slice(0, 4000),
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("readingRecords", {
        householdId: viewer.household._id,
        bookId: book._id,
        readerId: viewer.userId,
        mode: "individual",
        status: "completed",
        source: "physical",
        startDate: now,
        completionDate: now,
        currentPage: book.pageCount ?? 0,
        rating: args.rating,
        review: args.review?.slice(0, 4000),
        isSample: false,
        createdAt: now,
        updatedAt: now,
      });
    }
    const wishes = await ctx.db
      .query("wishlistItems")
      .withIndex("by_book", (q) => q.eq("bookId", book._id))
      .collect();
    for (const wish of wishes) {
      if (wish.readerId === viewer.userId) await ctx.db.delete(wish._id);
    }
    await logActivity(ctx, {
      householdId: viewer.household._id,
      readerId: viewer.userId,
      type: "finished",
      bookId: book._id,
      title: book.title,
      detail: "Marked as already read",
    });
    return true;
  },
});
