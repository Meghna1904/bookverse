import { ConvexError, v } from "convex/values";
import { mutation } from "./_generated/server";
import {
  dayKeyFrom,
  DAY_MS,
  logActivity,
  requireViewer,
  safeDayKey,
  STREAK_MINUTES,
  STREAK_PAGES,
} from "./lib";

/** Daily reading check-in for physical books that cannot be tracked live. */
export const checkIn = mutation({
  args: {
    bookId: v.optional(v.id("books")),
    documentId: v.optional(v.id("libraryDocuments")),
    pages: v.number(),
    minutes: v.number(),
    dayKey: v.optional(v.string()),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const viewer = await requireViewer(ctx);
    const pages = Math.round(args.pages);
    const minutes = Math.round(args.minutes);
    if (!Number.isFinite(pages) || !Number.isFinite(minutes)) {
      throw new ConvexError("Enter pages and minutes as numbers.");
    }
    if (pages < 0 || minutes < 0) throw new ConvexError("Reading amounts cannot be negative.");
    if (pages > 1000) throw new ConvexError("That is more than 1000 pages in a day.");
    if (minutes > 720) throw new ConvexError("That is more than 12 hours in a day.");
    if (pages === 0 && minutes === 0) {
      throw new ConvexError("Log at least some pages or minutes.");
    }
    const key = safeDayKey(args.dayKey);
    const time = Date.parse(`${key}T00:00:00Z`);
    const today = Date.parse(`${dayKeyFrom(Date.now())}T00:00:00Z`);
    if (time > today) throw new ConvexError("You cannot log reading in the future.");
    if (today - time > 365 * DAY_MS) throw new ConvexError("Log reading within the last year.");

    if (args.bookId) {
      const book = await ctx.db.get(args.bookId);
      if (!book || book.householdId !== viewer.household._id) {
        throw new ConvexError("That book is not in your shared library.");
      }
    }
    if (args.documentId) {
      const doc = await ctx.db.get(args.documentId);
      if (!doc || doc.householdId !== viewer.household._id) {
        throw new ConvexError("That document is not available.");
      }
      if (doc.visibility === "private" && doc.ownerId !== viewer.userId) {
        throw new ConvexError("That document is not available.");
      }
    }

    const todaysSessions = await ctx.db
      .query("readingSessions")
      .withIndex("by_household_day", (q) =>
        q.eq("householdId", viewer.household._id).eq("dayKey", key),
      )
      .collect();
    const existing = todaysSessions.find(
      (session) =>
        session.readerId === viewer.userId &&
        session.bookId === args.bookId &&
        session.documentId === args.documentId,
    );
    if (existing) {
      // Replace rather than add, so re-submitting a form cannot inflate a streak.
      await ctx.db.patch(existing._id, {
        pages: Math.max(existing.pages, pages),
        minutes: Math.max(existing.minutes, minutes),
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("readingSessions", {
        householdId: viewer.household._id,
        readerId: viewer.userId,
        bookId: args.bookId,
        documentId: args.documentId,
        dayKey: key,
        pages,
        minutes,
        source: args.documentId ? "digital" : "physical",
        isSample: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }
    const otherSessions = todaysSessions.filter(
      (session) =>
        session.readerId === viewer.userId &&
        session._id !== existing?._id,
    );
    const dayPages =
      otherSessions.reduce((sum, session) => sum + session.pages, 0) + pages;
    const dayMinutes =
      otherSessions.reduce((sum, session) => sum + session.minutes, 0) + minutes;

    const book = args.bookId ? await ctx.db.get(args.bookId) : null;
    await logActivity(ctx, {
      householdId: viewer.household._id,
      readerId: viewer.userId,
      type: args.documentId ? "pdf-session" : "session",
      title: book?.title ?? "Reading session",
      detail: `${pages} pages · ${minutes} minutes${
        args.note ? ` — ${args.note.slice(0, 80)}` : ""
      }`,
      bookId: args.bookId,
      documentId: args.documentId,
    });
    return {
      qualifies: dayPages >= STREAK_PAGES || dayMinutes >= STREAK_MINUTES,
      dayPages,
      dayMinutes,
    };
  },
});
