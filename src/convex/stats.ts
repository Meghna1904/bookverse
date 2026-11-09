import { query } from "./_generated/server";
import {
  aggregateDays,
  canAccessDocument,
  DAY_MS,
  dayKeyFrom,
  householdMembers,
  qualifies,
  requireViewer,
  STREAK_MINUTES,
  STREAK_PAGES,
  streakInfo,
} from "./lib";

const WEEKDAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const MILESTONES = [7, 14, 30, 60, 100];

export const home = query({
  args: {},
  handler: async (ctx) => {
    const viewer = await requireViewer(ctx);
    const [books, records, sessions, activity, profiles, documents, progress, wishes] =
      await Promise.all([
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
          .query("activity")
          .withIndex("by_household", (q) => q.eq("householdId", viewer.household._id))
          .collect(),
        householdMembers(ctx, viewer.household._id),
        ctx.db
          .query("libraryDocuments")
          .withIndex("by_household", (q) => q.eq("householdId", viewer.household._id))
          .collect(),
        ctx.db
          .query("documentProgress")
          .withIndex("by_reader", (q) => q.eq("readerId", viewer.userId))
          .collect(),
        ctx.db
          .query("wishlistItems")
          .withIndex("by_household", (q) => q.eq("householdId", viewer.household._id))
          .collect(),
      ]);

    const nameOf = new Map<string, string>();
    const avatarOf = new Map<string, string | null>();
    for (const profile of profiles) {
      nameOf.set(profile.userId, profile.displayName);
      avatarOf.set(
        profile.userId,
        profile.avatarStorageId
          ? await ctx.storage.getUrl(profile.avatarStorageId)
          : null,
      );
    }

    const daysByReader = aggregateDays(sessions);
    const readerStats = profiles.map((profile) => {
      const streak = streakInfo(daysByReader.get(profile.userId));
      const weekDays = [0, 1, 2, 3, 4, 5, 6].filter((offset) => {
        const key = dayKeyFrom(Date.now() - offset * DAY_MS);
        return qualifies(daysByReader.get(profile.userId)?.get(key));
      }).length;
      return {
        userId: profile.userId,
        displayName: profile.displayName,
        avatarUrl: avatarOf.get(profile.userId) ?? null,
        isSample: profile.isSample ?? false,
        current: streak.current,
        best: streak.best,
        totalDays: streak.totalDays,
        weekDays,
      };
    });

    const sharedQualified = new Set<string>();
    if (profiles.length === 2) {
      const [first, second] = profiles;
      for (const [key] of daysByReader.get(first.userId) ?? []) {
        if (
          qualifies(daysByReader.get(first.userId)?.get(key)) &&
          qualifies(daysByReader.get(second.userId)?.get(key))
        ) {
          sharedQualified.add(key);
        }
      }
    }
    const sharedDaysThisWeek = [0, 1, 2, 3, 4, 5, 6].filter((offset) =>
      sharedQualified.has(dayKeyFrom(Date.now() - offset * DAY_MS)),
    ).length;

    const activeRecords = records.filter((record) => record.status === "reading");
    const booksById = new Map(books.map((book) => [book._id, book]));
    const grouped = new Map<string, typeof activeRecords>();
    for (const record of activeRecords) {
      const list = grouped.get(record.bookId) ?? [];
      list.push(record);
      grouped.set(record.bookId, list);
    }
    const currentlyReading = [...grouped.entries()]
      .map(([bookId, group]) => {
        const book = booksById.get(bookId as typeof books[number]["_id"]);
        if (!book) return null;
        const total = book.pageCount ?? 0;
        const entries = group.map((record) => ({
          record,
          readerId: record.readerId,
          readerName: nameOf.get(record.readerId) ?? "Reader",
          percent: total ? Math.min(100, Math.round((record.currentPage / total) * 100)) : 0,
        }));
        const bestPercent = Math.max(...entries.map((entry) => entry.percent), 0);
        return { book, records: entries, percent: bestPercent, total };
      })
      .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry))
      .sort((a, b) => b.percent - a.percent);

    const digitalItems: Array<{
      document: typeof documents[number];
      percent: number;
      lastPage: number;
      coverUrl: string | null;
      ownerName: string;
    }> = [];
    for (const doc of documents) {
      if (!canAccessDocument(doc, viewer)) continue;
      const myProgress = progress.find((row) => row.documentId === doc._id);
      if (!myProgress || myProgress.completedAt) continue;
      if (myProgress.lastPage <= 1) continue;
      digitalItems.push({
        document: doc,
        percent: Math.min(
          100,
          Math.round((myProgress.lastPage / Math.max(doc.totalPages, 1)) * 100),
        ),
        lastPage: myProgress.lastPage,
        coverUrl: doc.coverStorageId
          ? await ctx.storage.getUrl(doc.coverStorageId)
          : null,
        ownerName:
          doc.ownerId === viewer.userId ? "You" : (nameOf.get(doc.ownerId) ?? "Reader"),
      });
    }

    const weekly = [6, 5, 4, 3, 2, 1, 0].map((offset) => {
      const date = new Date(Date.now() - offset * DAY_MS);
      const key = dayKeyFrom(date.getTime());
      const perReader = profiles.map((profile) =>
        daysByReader.get(profile.userId)?.get(key)?.pages ?? 0,
      );
      return {
        dayKey: key,
        label: WEEKDAY[date.getUTCDay()],
        pages: perReader,
        shared: sharedQualified.has(key),
      };
    });

    const weekStart = Date.parse(`${dayKeyFrom(Date.now() - 6 * DAY_MS)}T00:00:00Z`);
    const weekSessions = sessions.filter(
      (session) => Date.parse(`${session.dayKey}T00:00:00Z`) >= weekStart,
    );

    const completedRecords = records.filter((record) => record.status === "completed");
    const completedBookCount = new Set(completedRecords.map((record) => record.bookId)).size;
    const sharedCompleted = books.filter((book) => {
      const completedFor = completedRecords.filter((record) => record.bookId === book._id);
      const readers = new Set(completedFor.map((record) => record.readerId));
      return readers.size >= 2 || completedFor.some((record) => record.mode === "together");
    }).length;

    return {
      householdName: viewer.household.name,
      readers: readerStats,
      shared: {
        daysThisWeek: sharedDaysThisWeek,
        totalDays: sharedQualified.size,
        booksCompleted: completedBookCount,
        readingRecordsCompleted: completedRecords.length,
        pagesRead: sessions.reduce((sum, session) => sum + session.pages, 0),
        minutesRead: sessions.reduce((sum, session) => sum + session.minutes, 0),
        currentlyReading: grouped.size + digitalItems.length,
        sharedBooksCompleted: sharedCompleted,
        wishlistCount: wishes.length,
      },
      currentlyReading,
      digital: digitalItems,
      weekly: {
        days: weekly,
        pages: weekSessions.reduce((sum, session) => sum + session.pages, 0),
        minutes: weekSessions.reduce((sum, session) => sum + session.minutes, 0),
        readingDays: new Set(weekSessions.map((session) => session.dayKey)).size,
        readerPages: profiles.map((profile) =>
          weekSessions
            .filter((session) => session.readerId === profile.userId)
            .reduce((sum, session) => sum + session.pages, 0),
        ),
      },
      activity: activity
        .filter(
          (item) =>
            item.readerId === viewer.userId ||
            profiles.find((profile) => profile.userId === item.readerId)?.shareActivity !== false,
        )
        // Documents that are private to another reader must not appear in the feed.
        .filter((item) => {
          if (!item.documentId) return true;
          const doc = documents.find((entry) => entry._id === item.documentId);
          return doc ? canAccessDocument(doc, viewer) : false;
        })
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, 9)
        .map((item) => ({
          ...item,
          readerName: nameOf.get(item.readerId) ?? "Reader",
          isMine: item.readerId === viewer.userId,
        })),
      myUserId: viewer.userId,
      streakRule: { minutes: STREAK_MINUTES, pages: STREAK_PAGES },
    };
  },
});

export const statsPage = query({
  args: {},
  handler: async (ctx) => {
    const viewer = await requireViewer(ctx);
    const [books, records, sessions, profiles, documents] = await Promise.all([
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
      householdMembers(ctx, viewer.household._id),
      ctx.db
        .query("libraryDocuments")
        .withIndex("by_household", (q) => q.eq("householdId", viewer.household._id))
        .collect(),
    ]);

    const daysByReader = aggregateDays(sessions);
    const booksById = new Map(books.map((book) => [book._id, book]));
    const completed = records.filter((record) => record.status === "completed");

    const readers = await Promise.all(profiles.map(async (profile) => {
      const streak = streakInfo(daysByReader.get(profile.userId));
      const theirSessions = sessions.filter((session) => session.readerId === profile.userId);
      const theirRecords = completed.filter((record) => record.readerId === profile.userId);
      const ratings = theirRecords
        .map((record) => record.rating)
        .filter((rating): rating is number => typeof rating === "number");
      return {
        userId: profile.userId,
        displayName: profile.displayName,
        isSample: profile.isSample ?? false,
        avatarUrl: profile.avatarStorageId
          ? await ctx.storage.getUrl(profile.avatarStorageId)
          : null,
        booksCompleted: theirRecords.length,
        pagesRead: theirSessions.reduce((sum, session) => sum + session.pages, 0),
        minutesRead: theirSessions.reduce((sum, session) => sum + session.minutes, 0),
        currentStreak: streak.current,
        bestStreak: streak.best,
        readingDays: streak.totalDays,
        currentlyReading: records.filter(
          (record) => record.readerId === profile.userId && record.status === "reading",
        ).length,
        averageRating: ratings.length
          ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10
          : null,
        ratingsGiven: ratings.length,
        milestones: MILESTONES.map((days) => ({
          days,
          achieved: streak.best >= days,
          shared: false,
        })),
      };
    }));

    const sharedIntersection = new Map<string, Map<string, { pages: number; minutes: number }>>();
    if (profiles.length === 2) {
      const sharedDays = new Map<string, { pages: number; minutes: number }>();
      for (const [key] of daysByReader.get(profiles[0].userId) ?? []) {
        const a = daysByReader.get(profiles[0].userId)?.get(key);
        const b = daysByReader.get(profiles[1].userId)?.get(key);
        if (qualifies(a) && qualifies(b)) {
          sharedDays.set(key, {
            pages: (a?.pages ?? 0) + (b?.pages ?? 0),
            minutes: (a?.minutes ?? 0) + (b?.minutes ?? 0),
          });
        }
      }
      sharedIntersection.set("shared", sharedDays);
    }
    const sharedStreak = streakInfo(sharedIntersection.get("shared"));
    const sharedDays = sharedStreak.totalDays;

    const now = new Date();
    const weekDays = [6, 5, 4, 3, 2, 1, 0].map((offset) => {
      const date = new Date(Date.now() - offset * DAY_MS);
      const key = dayKeyFrom(date.getTime());
      const bothQualify =
        profiles.length === 2 &&
        qualifies(daysByReader.get(profiles[0].userId)?.get(key)) &&
        qualifies(daysByReader.get(profiles[1].userId)?.get(key));
      return {
        label: WEEKDAY[date.getUTCDay()],
        dayKey: key,
        pages: profiles.map(
          (profile) => daysByReader.get(profile.userId)?.get(key)?.pages ?? 0,
        ),
        minutes: profiles.map(
          (profile) => daysByReader.get(profile.userId)?.get(key)?.minutes ?? 0,
        ),
        shared: bothQualify,
      };
    });

    const monthly: Array<{
      label: string;
      pages: number[];
      minutes: number[];
      books: number[];
    }> = [];
    for (let index = 5; index >= 0; index -= 1) {
      const date = new Date(now.getFullYear(), now.getMonth() - index, 1);
      const monthStart = date.getTime();
      const nextMonth = new Date(date.getFullYear(), date.getMonth() + 1, 1).getTime();
      monthly.push({
        label: `${MONTH[date.getMonth()]}${date.getMonth() === 0 ? ` ’${String(date.getFullYear()).slice(2)}` : ""}`,
        pages: profiles.map((profile) =>
          sessions
            .filter((session) => {
              const time = Date.parse(`${session.dayKey}T00:00:00Z`);
              return (
                session.readerId === profile.userId &&
                time >= monthStart &&
                time < nextMonth
              );
            })
            .reduce((sum, session) => sum + session.pages, 0),
        ),
        minutes: profiles.map((profile) =>
          sessions
            .filter((session) => {
              const time = Date.parse(`${session.dayKey}T00:00:00Z`);
              return (
                session.readerId === profile.userId &&
                time >= monthStart &&
                time < nextMonth
              );
            })
            .reduce((sum, session) => sum + session.minutes, 0),
        ),
        books: profiles.map(
          (profile) =>
            completed.filter(
              (record) =>
                record.readerId === profile.userId &&
                record.completionDate !== undefined &&
                record.completionDate >= monthStart &&
                record.completionDate < nextMonth,
            ).length,
        ),
      });
    }

    const genreMap = new Map<string, number>();
    for (const record of completed) {
      const book = booksById.get(record.bookId);
      const genre = book?.genre || "Unclassified";
      genreMap.set(genre, (genreMap.get(genre) ?? 0) + 1);
    }
    const genres = [...genreMap.entries()]
      .map(([genre, count]) => ({ genre, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 7);

    const streakHistory: Array<{ dayKey: string; readers: boolean[]; shared: boolean }> = [];
    for (let offset = 55; offset >= 0; offset -= 1) {
      const key = dayKeyFrom(Date.now() - offset * DAY_MS);
      const readerFlags = profiles.map((profile) =>
        qualifies(daysByReader.get(profile.userId)?.get(key)),
      );
      streakHistory.push({
        dayKey: key,
        readers: readerFlags,
        shared: readerFlags.length === 2 && readerFlags.every(Boolean),
      });
    }

    const pagesTogether = profiles.length === 2
      ? sharedIntersection.get("shared")?.size
        ? [...sharedIntersection.get("shared")!.values()].reduce((sum, day) => sum + day.pages, 0)
        : 0
      : 0;
    const booksTogether = books.filter((book) => {
      const forBook = completed.filter((record) => record.bookId === book._id);
      return forBook.some((record) => record.mode === "together");
    }).length;

    const visibleDocs = documents.filter((doc) => canAccessDocument(doc, viewer));

    return {
      readers,
      shared: {
        booksReadTogether: booksTogether,
        pagesReadTogether: pagesTogether,
        sharedReadingDays: sharedDays,
        sharedCurrentStreak: sharedStreak.current,
        sharedBestStreak: sharedStreak.best,
        totalBooksCompleted: new Set(completed.map((record) => record.bookId)).size,
        totalPagesRead: sessions.reduce((sum, session) => sum + session.pages, 0),
        totalMinutesRead: sessions.reduce((sum, session) => sum + session.minutes, 0),
        digitalDocuments: visibleDocs.length,
        milestones: MILESTONES.map((days) => ({
          days,
          achieved: sharedStreak.best >= days,
          shared: true,
        })),
      },
      weekly: weekDays,
      monthly,
      genres,
      streakHistory,
      streakRule: { minutes: STREAK_MINUTES, pages: STREAK_PAGES },
      myUserId: viewer.userId,
      weekLabel: { weekOf: dayKeyFrom(Date.now()) },
    };
  },
});
