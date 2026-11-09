import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import {
  DAY_MS,
  canAccessDocument,
  findOrCreateBook,
  logActivity,
  requireViewer,
  safeDayKey,
} from "./lib";

type MemoryReader = {
  userId: Id<"users">;
  displayName: string;
  avatarUrl: string | null;
};

type MemoryItem = {
  id: string;
  kind: "book" | "document";
  status: "completed" | "reading" | "wishlist" | "document";
  title: string;
  author: string;
  coverUrl: string | null;
  date: number;
  readerIds: Id<"users">[];
  readers: MemoryReader[];
  together: boolean;
  bookId?: Id<"books">;
  documentId?: Id<"libraryDocuments">;
  review?: string;
  note?: string;
  rating?: number;
  progress?: number;
  currentPage?: number;
  pageCount?: number;
};

export const bookPayload = v.object({
  title: v.string(),
  author: v.string(),
  isbn: v.optional(v.string()),
  description: v.optional(v.string()),
  coverUrl: v.optional(v.string()),
  genre: v.optional(v.string()),
  language: v.optional(v.string()),
  pageCount: v.optional(v.number()),
  publisher: v.optional(v.string()),
  publishedYear: v.optional(v.number()),
  series: v.optional(v.string()),
  externalRef: v.optional(v.string()),
  format: v.optional(v.string()),
});

/** Completed books, one spine per central book, with every reader's record. */
export const shelf = query({
  args: {},
  handler: async (ctx) => {
    const viewer = await requireViewer(ctx);
    const [records, books, profiles] = await Promise.all([
      ctx.db
        .query("readingRecords")
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
    const completed = records.filter((r) => r.status === "completed");
    const bookIds = new Set(completed.map((r) => r.bookId));
    const items = books
      .filter((book) => bookIds.has(book._id))
      .map((book) => ({
        book,
        records: completed.filter((record) => record.bookId === book._id),
      }));
    return {
      items,
      readers: profiles.map((profile) => ({
        userId: profile.userId,
        displayName: profile.displayName,
        isSample: profile.isSample ?? false,
      })),
    };
  },
});

export const setSpineColor = mutation({
  args: {
    bookId: v.id("books"),
    color: v.union(v.string(), v.null()),
  },
  handler: async (ctx, args) => {
    const viewer = await requireViewer(ctx);
    const book = await ctx.db.get(args.bookId);
    if (!book || book.householdId !== viewer.household._id) {
      throw new ConvexError("That book is not in your shared library.");
    }
    if (args.color !== null && !/^#[0-9a-fA-F]{6}$/.test(args.color)) {
      throw new ConvexError("Choose a valid spine colour.");
    }
    await ctx.db.patch(book._id, {
      spineColor: args.color ?? undefined,
    });
    return { ok: true };
  },
});

/** A single wall of finished and open books, wishes and digital documents. */
export const memories = query({
  args: {},
  handler: async (ctx) => {
    const viewer = await requireViewer(ctx);
    const [books, records, wishes, documents, profiles, progress] = await Promise.all([
      ctx.db
        .query("books")
        .withIndex("by_household", (q) => q.eq("householdId", viewer.household._id))
        .collect(),
      ctx.db
        .query("readingRecords")
        .withIndex("by_household", (q) => q.eq("householdId", viewer.household._id))
        .collect(),
      ctx.db
        .query("wishlistItems")
        .withIndex("by_household", (q) => q.eq("householdId", viewer.household._id))
        .collect(),
      ctx.db
        .query("libraryDocuments")
        .withIndex("by_household", (q) => q.eq("householdId", viewer.household._id))
        .collect(),
      ctx.db
        .query("profiles")
        .withIndex("by_household", (q) => q.eq("householdId", viewer.household._id))
        .collect(),
      ctx.db
        .query("documentProgress")
        .withIndex("by_reader", (q) => q.eq("readerId", viewer.userId))
        .collect(),
    ]);

    const readerList: MemoryReader[] = await Promise.all(
      profiles.map(async (profile) => ({
        userId: profile.userId,
        displayName: profile.displayName,
        avatarUrl: profile.avatarStorageId
          ? await ctx.storage.getUrl(profile.avatarStorageId)
          : null,
      })),
    );
    const readerById = new Map(readerList.map((reader) => [reader.userId, reader]));
    const bookById = new Map(books.map((book) => [book._id, book]));

    const bookCover = new Map<Id<"books">, string | null>();
    for (const book of books) {
      bookCover.set(
        book._id,
        book.coverUrl ??
          (book.coverStorageId ? await ctx.storage.getUrl(book.coverStorageId) : null),
      );
    }

    const recordsByBook = new Map<Id<"books">, typeof records>();
    for (const record of records) {
      const group = recordsByBook.get(record.bookId) ?? [];
      group.push(record);
      recordsByBook.set(record.bookId, group);
    }

    const bookItems: MemoryItem[] = [];
    for (const [bookId, group] of recordsByBook) {
      const book = bookById.get(bookId);
      if (!book) continue;
      const completed = group.filter((record) => record.status === "completed");
      const active = group.filter((record) => record.status === "reading");
      if (!completed.length && !active.length) continue;

      const focus = completed.find((record) => record.readerId === viewer.userId) ?? completed[0];
      const readerIds = [...new Set((completed.length ? completed : active).map((record) => record.readerId))];
      const progress = active.length
        ? Math.max(
            ...active.map((record) =>
              book.pageCount
                ? Math.min(100, Math.round((record.currentPage / book.pageCount) * 100))
                : 0,
            ),
          )
        : undefined;
      const date = completed.length
        ? Math.max(...completed.map((record) => record.completionDate ?? record.updatedAt))
        : Math.max(...active.map((record) => record.updatedAt));
      const reviewRecord =
        completed.find((record) => record.readerId === viewer.userId && record.review) ??
        completed.find((record) => record.review);

      bookItems.push({
        id: `book-${bookId}`,
        kind: "book",
        status: completed.length ? "completed" : "reading",
        title: book.title,
        author: book.author,
        coverUrl: bookCover.get(book._id) ?? null,
        date,
        bookId: book._id,
        readerIds,
        readers: readerIds
          .map((readerId) => readerById.get(readerId))
          .filter((reader): reader is MemoryReader => Boolean(reader)),
        together:
          readerIds.length > 1 ||
          [...completed, ...active].some((record) => record.mode === "together"),
        review: reviewRecord?.review,
        rating: focus?.rating,
        progress: completed.length ? 100 : progress,
        currentPage: active.length
          ? Math.max(...active.map((record) => record.currentPage))
          : undefined,
        pageCount: book.pageCount,
        note: book.description,
      });
    }

    const wishByBook = new Map<Id<"books">, typeof wishes>();
    for (const wish of wishes) {
      const group = wishByBook.get(wish.bookId) ?? [];
      group.push(wish);
      wishByBook.set(wish.bookId, group);
    }
    const wishItems: MemoryItem[] = [];
    for (const [bookId, group] of wishByBook) {
      const book = bookById.get(bookId);
      if (!book) continue;
      const readerIds = [...new Set(group.map((wish) => wish.readerId))];
      wishItems.push({
        id: `wish-${bookId}`,
        kind: "book",
        status: "wishlist",
        title: book.title,
        author: book.author,
        coverUrl: bookCover.get(book._id) ?? null,
        date: Math.max(...group.map((wish) => wish.addedAt)),
        bookId: book._id,
        readerIds,
        readers: readerIds
          .map((readerId) => readerById.get(readerId))
          .filter((reader): reader is MemoryReader => Boolean(reader)),
        together: readerIds.length > 1,
        note: group.find((wish) => wish.note)?.note,
        rating: undefined,
      });
    }

    const visibleDocuments = documents.filter((doc) => canAccessDocument(doc, viewer));
    const documentItems: MemoryItem[] = [];
    for (const doc of visibleDocuments) {
      const linkedBook = doc.bookId ? bookById.get(doc.bookId) : undefined;
      const shared = doc.visibility === "shared";
      const readerIds = shared
        ? readerList.map((reader) => reader.userId)
        : [doc.ownerId];
      const myProgress = progress.find((row) => row.documentId === doc._id);
      documentItems.push({
        id: `document-${doc._id}`,
        kind: "document",
        status: "document",
        title: doc.title,
        author: doc.author || "Digital document",
        coverUrl:
          (doc.coverStorageId ? await ctx.storage.getUrl(doc.coverStorageId) : null) ??
          (linkedBook ? (bookCover.get(linkedBook._id) ?? null) : null),
        date: doc.updatedAt,
        documentId: doc._id,
        bookId: doc.bookId,
        readerIds,
        readers: readerIds
          .map((readerId) => readerById.get(readerId))
          .filter((reader): reader is MemoryReader => Boolean(reader)),
        together: shared && readerList.length > 1,
        note: `${doc.totalPages.toLocaleString()} pages · ${shared ? "shared" : "private"} PDF`,
        progress: myProgress
          ? Math.min(
              100,
              Math.round((myProgress.lastPage / Math.max(myProgress.totalPages, 1)) * 100),
            )
          : undefined,
        currentPage: myProgress?.lastPage,
        pageCount: doc.totalPages,
      });
    }

    return {
      items: [...bookItems, ...wishItems, ...documentItems],
      readers: readerList,
      myUserId: viewer.userId,
    };
  },
});

/** Books saved through Discover, newest first. */
export const recentDiscoveries = query({
  args: {},
  handler: async (ctx) => {
    const viewer = await requireViewer(ctx);
    const books = await ctx.db
      .query("books")
      .withIndex("by_household", (q) => q.eq("householdId", viewer.household._id))
      .collect();
    return books
      .filter((book) => Boolean(book.discoveredAt))
      .sort((a, b) => (b.discoveredAt ?? 0) - (a.discoveredAt ?? 0))
      .slice(0, 10);
  },
});

export const bookDetail = query({
  args: { bookId: v.id("books") },
  handler: async (ctx, args) => {
    const viewer = await requireViewer(ctx);
    const book = await ctx.db.get(args.bookId);
    if (!book || book.householdId !== viewer.household._id) return null;
    const [records, profiles, wishes, documents, sessions] = await Promise.all([
      ctx.db
        .query("readingRecords")
        .withIndex("by_book", (q) => q.eq("bookId", book._id))
        .collect(),
      ctx.db
        .query("profiles")
        .withIndex("by_household", (q) => q.eq("householdId", viewer.household._id))
        .collect(),
      ctx.db
        .query("wishlistItems")
        .withIndex("by_book", (q) => q.eq("bookId", book._id))
        .collect(),
      ctx.db
        .query("libraryDocuments")
        .withIndex("by_household", (q) => q.eq("householdId", viewer.household._id))
        .collect(),
      ctx.db
        .query("readingSessions")
        .withIndex("by_household", (q) => q.eq("householdId", viewer.household._id))
        .collect(),
    ]);
    const visibleDocs = documents.filter(
      (doc) =>
        doc.visibility === "shared" || doc.ownerId === viewer.userId,
    );
    const visibleDocIds = new Set(visibleDocs.map((doc) => doc._id));
    return {
      book,
      coverUrl:
        book.coverUrl ??
        (book.coverStorageId ? await ctx.storage.getUrl(book.coverStorageId) : null),
      records: records.sort((a, b) => a.startDate - b.startDate),
      readers: profiles.map((profile) => ({
        userId: profile.userId,
        displayName: profile.displayName,
        isSample: profile.isSample ?? false,
      })),
      wishes,
      documents: visibleDocs.filter((doc) => doc.bookId === book._id),
      history: sessions
        .filter((session) => session.bookId === book._id)
        // Never reveal that a partner read from a private document.
        .filter(
          (session) => !session.documentId || visibleDocIds.has(session.documentId),
        )
        .sort((a, b) => (a.dayKey < b.dayKey ? 1 : a.dayKey > b.dayKey ? -1 : 0))
        .slice(0, 16),
      myUserId: viewer.userId,
    };
  },
});

export const startReading = mutation({
  args: {
    book: bookPayload,
    readerIds: v.array(v.id("users")),
    mode: v.union(v.literal("individual"), v.literal("together")),
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
    const now = Date.now();
    for (const readerId of args.readerIds) {
      const existing = (
        await ctx.db
          .query("readingRecords")
          .withIndex("by_book", (q) => q.eq("bookId", book._id))
          .collect()
      ).find((record) => record.readerId === readerId);
      if (existing) {
        if (existing.status === "completed") {
          await ctx.db.patch(existing._id, {
            status: "reading",
            completionDate: undefined,
            currentPage: 0,
            startDate: now,
            updatedAt: now,
          });
        }
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
      const wishes = await ctx.db
        .query("wishlistItems")
        .withIndex("by_book", (q) => q.eq("bookId", book._id))
        .collect();
      for (const wish of wishes) {
        if (wish.readerId === readerId) await ctx.db.delete(wish._id);
      }
    }
    await logActivity(ctx, {
      householdId: viewer.household._id,
      readerId: viewer.userId,
      type: "started",
      bookId: book._id,
      title: book.title,
      detail:
        args.readerIds.length > 1
          ? "Started reading together"
          : "Started reading",
    });
    return book._id;
  },
});

/** Progress updates also log a real reading session for the pages turned. */
export const updateProgress = mutation({
  args: {
    recordId: v.id("readingRecords"),
    currentPage: v.number(),
    dayKey: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const viewer = await requireViewer(ctx);
    const record = await ctx.db.get(args.recordId);
    if (!record || record.householdId !== viewer.household._id) {
      throw new ConvexError("That reading record was not found.");
    }
    if (record.readerId !== viewer.userId) {
      throw new ConvexError("You can only update your own reading progress.");
    }
    const book = await ctx.db.get(record.bookId);
    const total = book?.pageCount ?? Math.max(args.currentPage, 1);
    const nextPage = Math.max(0, Math.min(Math.round(args.currentPage), total));
    if (nextPage < record.currentPage) {
      throw new ConvexError("Progress cannot move backwards — use the page you are on.");
    }
    const pagesRead = nextPage - record.currentPage;
    await ctx.db.patch(record._id, {
      currentPage: nextPage,
      updatedAt: Date.now(),
    });
    if (pagesRead > 0) {
      const key = safeDayKey(args.dayKey);
      const sessions = await ctx.db
        .query("readingSessions")
        .withIndex("by_household_day", (q) =>
          q.eq("householdId", viewer.household._id).eq("dayKey", key),
        )
        .collect();
      const existing = sessions.find(
        (session) =>
          session.readerId === viewer.userId &&
          session.bookId === record.bookId &&
          session.documentId === undefined,
      );
      if (existing) {
        await ctx.db.patch(existing._id, {
          pages: existing.pages + pagesRead,
          updatedAt: Date.now(),
        });
      } else {
        await ctx.db.insert("readingSessions", {
          householdId: viewer.household._id,
          readerId: viewer.userId,
          bookId: record.bookId,
          dayKey: key,
          pages: pagesRead,
          minutes: 0,
          source: "physical",
          isSample: false,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      }
      await logActivity(ctx, {
        householdId: viewer.household._id,
        readerId: viewer.userId,
        type: "progress",
        bookId: record.bookId,
        title: book?.title ?? "Reading progress",
        detail: `Page ${nextPage} of ${total}`,
      });
    }
    return nextPage;
  },
});

export const completeRecord = mutation({
  args: {
    recordId: v.id("readingRecords"),
    rating: v.number(),
    review: v.optional(v.string()),
    notes: v.optional(v.string()),
    completionDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const viewer = await requireViewer(ctx);
    const record = await ctx.db.get(args.recordId);
    if (!record || record.householdId !== viewer.household._id) {
      throw new ConvexError("That reading record was not found.");
    }
    if (record.readerId !== viewer.userId) {
      throw new ConvexError("You can only finish your own reading record.");
    }
    if (args.rating < 1 || args.rating > 5) {
      throw new ConvexError("Choose a rating between one and five stars.");
    }
    const book = await ctx.db.get(record.bookId);
    const completionDate = args.completionDate ?? Date.now();
    if (completionDate > Date.now() + DAY_MS) {
      throw new ConvexError("The completion date cannot be in the future.");
    }
    await ctx.db.patch(record._id, {
      status: "completed",
      completionDate,
      currentPage: book?.pageCount ?? record.currentPage,
      rating: args.rating,
      review: args.review?.slice(0, 4000),
      notes: args.notes?.slice(0, 2000),
      updatedAt: Date.now(),
    });
    await logActivity(ctx, {
      householdId: viewer.household._id,
      readerId: viewer.userId,
      type: "finished",
      bookId: record.bookId,
      title: book?.title ?? "A book",
      detail: "Finished reading",
      documentId: record.documentId,
    });
    return true;
  },
});

export const saveReview = mutation({
  args: {
    recordId: v.id("readingRecords"),
    rating: v.optional(v.number()),
    review: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const viewer = await requireViewer(ctx);
    const record = await ctx.db.get(args.recordId);
    if (!record || record.householdId !== viewer.household._id) {
      throw new ConvexError("That reading record was not found.");
    }
    if (record.readerId !== viewer.userId) {
      throw new ConvexError("You can only edit your own review.");
    }
    if (args.rating !== undefined && (args.rating < 1 || args.rating > 5)) {
      throw new ConvexError("Choose a rating between one and five stars.");
    }
    await ctx.db.patch(record._id, {
      rating: args.rating,
      review: args.review?.slice(0, 4000),
      notes: args.notes?.slice(0, 2000),
      updatedAt: Date.now(),
    });
    return true;
  },
});
