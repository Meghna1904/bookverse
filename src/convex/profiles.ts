import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import { aggregateDays, DAY_MS, dayKeyFrom, qualifies, requireViewer, streakInfo } from "./lib";

export const overview = query({
  args: {},
  handler: async (ctx) => {
    const viewer = await requireViewer(ctx);
    const [books, records, sessions, profiles, wishes] = await Promise.all([
      ctx.db
        .query("books")
        .withIndex("by_household", (q) => q.eq("householdId", viewer.household._id))
        .collect(),
      ctx.db
        .query("readingRecords")
        .withIndex("by_household", (q) => q.eq("householdId", viewer.household._id))
        .collect(),
      ctx.db
        .query("readingSessions")
        .withIndex("by_household", (q) => q.eq("householdId", viewer.household._id))
        .collect(),
      ctx.db
        .query("profiles")
        .withIndex("by_household", (q) => q.eq("householdId", viewer.household._id))
        .collect(),
      ctx.db
        .query("wishlistItems")
        .withIndex("by_household", (q) => q.eq("householdId", viewer.household._id))
        .collect(),
    ]);
    const booksById = new Map(books.map((book) => [book._id, book]));
    const daysByReader = aggregateDays(sessions);

    const people = await Promise.all(
      profiles.map(async (profile) => {
        const theirRecords = records.filter((record) => record.readerId === profile.userId);
        const theirSessions = sessions.filter((session) => session.readerId === profile.userId);
        const streak = streakInfo(daysByReader.get(profile.userId));
        const ratings = theirRecords
          .map((record) => record.rating)
          .filter((rating): rating is number => typeof rating === "number");
        const user = await ctx.db.get(profile.userId);
        const reading = theirRecords
          .filter((record) => record.status === "reading")
          .map((record) => ({ record, book: booksById.get(record.bookId) }))
          .filter((entry) => Boolean(entry.book));
        const finished = theirRecords
          .filter((record) => record.status === "completed")
          .map((record) => ({ record, book: booksById.get(record.bookId) }))
          .filter((entry) => Boolean(entry.book));
        const wishlist = wishes
          .filter((wish) => wish.readerId === profile.userId)
          .map((wish) => ({ item: wish, book: booksById.get(wish.bookId) }))
          .filter((entry) => Boolean(entry.book));
        const week = [0, 1, 2, 3, 4, 5, 6].filter((offset) =>
          qualifies(daysByReader.get(profile.userId)?.get(dayKeyFrom(Date.now() - offset * DAY_MS))),
        ).length;
        const privateActivity =
          profile.userId !== viewer.userId && profile.shareActivity === false;
        return {
          userId: profile.userId,
          profileId: profile._id,
          displayName: profile.displayName,
          bio: profile.bio ?? "",
          avatarUrl: profile.avatarStorageId
            ? await ctx.storage.getUrl(profile.avatarStorageId)
            : (user?.image ?? null),
          favoriteGenres: profile.favoriteGenres,
          languages: profile.languages,
          shareActivity: profile.shareActivity,
          isSample: profile.isSample ?? false,
          isMe: profile.userId === viewer.userId,
          email: profile.userId === viewer.userId ? (user?.email ?? null) : null,
          joinedAt: profile.joinedAt,
          stats: {
            currentStreak: streak.current,
            bestStreak: streak.best,
            readingDays: streak.totalDays,
            weekDays: week,
            booksCompleted: finished.length,
            pagesRead: theirSessions.reduce((sum, session) => sum + session.pages, 0),
            minutesRead: theirSessions.reduce((sum, session) => sum + session.minutes, 0),
            averageRating: ratings.length
              ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10
              : null,
          },
          privateActivity,
          reading: privateActivity ? [] : reading,
          finished: privateActivity
            ? []
            : finished.sort(
                (a, b) => (b.record.completionDate ?? 0) - (a.record.completionDate ?? 0),
              ),
          wishlist: privateActivity ? [] : wishlist,
        };
      }),
    );

    return {
      people,
      household: {
        name: viewer.household.name,
        inviteCode: viewer.household.inviteCode,
        memberCount: profiles.length,
        sampleSeededAt: viewer.household.sampleSeededAt ?? null,
      },
      myUserId: viewer.userId,
      isSample: profiles.some((profile) => profile.isSample),
    };
  },
});

export const updateProfile = mutation({
  args: {
    displayName: v.optional(v.string()),
    bio: v.optional(v.string()),
    favoriteGenres: v.optional(v.array(v.string())),
    languages: v.optional(v.array(v.string())),
    shareActivity: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const viewer = await requireViewer(ctx);
    const patch: Partial<Doc<"profiles">> = {};
    if (args.displayName !== undefined) {
      patch.displayName = args.displayName.trim().slice(0, 60) || "Reader";
    }
    if (args.bio !== undefined) patch.bio = args.bio.slice(0, 600);
    if (args.favoriteGenres !== undefined) {
      patch.favoriteGenres = args.favoriteGenres
        .map((genre) => genre.trim().slice(0, 40))
        .filter(Boolean)
        .slice(0, 12);
    }
    if (args.languages !== undefined) {
      patch.languages = args.languages
        .map((language) => language.trim().slice(0, 40))
        .filter(Boolean)
        .slice(0, 12);
    }
    if (args.shareActivity !== undefined) patch.shareActivity = args.shareActivity;
    if (!Object.keys(patch).length) throw new ConvexError("Nothing to update.");
    await ctx.db.patch(viewer.profile._id, patch);
    return true;
  },
});
