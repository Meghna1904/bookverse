import { requireSupabase } from "./supabase";
import {
  HOUSEHOLD_ID,
  normalizeRows,
  READER_IDS,
} from "./db-types";
import { getReaderId } from "./reader-store";
import { announceDataChange } from "./data-hooks";

type Row = Record<string, any> & { id: string };
const DAY_MS = 86_400_000;
const now = () => Date.now();
const dayKey = (time = now()) => {
  const date = new Date(time);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

function localDayOffset(offset: number, base = new Date(now())) {
  const date = new Date(base);
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() - offset);
  return dayKey(date.getTime());
}

function dayOrdinal(key: string) {
  const [year, month, day] = key.split("-").map(Number);
  return Date.UTC(year, month - 1, day) / DAY_MS;
}

function streakSummary(dayKeys: Iterable<string>) {
  const days = [...new Set(dayKeys)].sort();
  let best = 0;
  let run = 0;
  let previous = -2;
  for (const key of days) {
    const ordinal = dayOrdinal(key);
    run = ordinal === previous + 1 ? run + 1 : 1;
    best = Math.max(best, run);
    previous = ordinal;
  }

  const qualified = new Set(days);
  const today = dayKey();
  let cursor = qualified.has(today) ? today : localDayOffset(1);
  let current = 0;
  while (qualified.has(cursor)) {
    current += 1;
    const previousDate = new Date(`${cursor}T12:00:00`);
    previousDate.setDate(previousDate.getDate() - 1);
    cursor = dayKey(previousDate.getTime());
  }
  return { days: qualified, current, best };
}

function readerStreak(sessions: Row[], readerId: string) {
  return streakSummary(
    sessions
      .filter((session) => session.readerId === readerId && Number(session.pages) > 0)
      .map((session) => session.dayKey),
  );
}

async function rows(table: string): Promise<Row[]> {
  const { data, error } = await requireSupabase().from(table).select("*");
  if (error) throw error;
  return (data ?? []) as Row[];
}

async function one(table: string, id: string): Promise<Row | null> {
  const { data, error } = await requireSupabase().from(table).select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return (data as Row | null) ?? null;
}

async function insert(table: string, value: Record<string, any>) {
  const { data, error } = await requireSupabase().from(table).insert(value).select("*").single();
  if (error) throw error;
  return data as Row;
}

async function update(table: string, id: string, value: Record<string, any>) {
  const { data, error } = await requireSupabase().from(table).update(value).eq("id", id).select("*").single();
  if (error) throw error;
  return data as Row;
}

async function remove(table: string, id: string) {
  const { error } = await requireSupabase().from(table).delete().eq("id", id);
  if (error) throw error;
}

const currentId = () => getReaderId();

async function household() {
  const row = await one("households", HOUSEHOLD_ID);
  if (!row) throw new Error("Run supabase/schema.sql in the Supabase SQL editor first.");
  return row;
}

async function profiles() {
  return normalizeRows(await rows("profiles"));
}

async function books() {
  return normalizeRows(await rows("books"));
}

async function records() {
  return normalizeRows(await rows("readingRecords"));
}

async function wishes() {
  return normalizeRows(await rows("wishlistItems"));
}

async function sessions() {
  return normalizeRows(await rows("readingSessions"));
}

async function documents() {
  return normalizeRows(await rows("libraryDocuments"));
}

async function findOrCreateBook(
  payload: Record<string, any>,
  discovered = false,
  updateExisting = false,
) {
  const list = await books();
  const isbn = (payload.isbn ?? "").replace(/[^0-9Xx]/g, "").toUpperCase();
  const existing = list.find((book) =>
    isbn ? (book.isbn ?? "").replace(/[^0-9Xx]/g, "").toUpperCase() === isbn
      : book.title.toLowerCase() === String(payload.title).toLowerCase() &&
        book.author.toLowerCase() === String(payload.author).toLowerCase(),
  );
  if (existing) {
    if (!updateExisting) return existing;
    const patch: Record<string, any> = {};
    for (const field of [
      "title", "author", "isbn", "description", "coverUrl", "genre", "language",
      "publisher", "series", "format",
    ]) {
      if (typeof payload[field] === "string" && payload[field].trim()) {
        patch[field] = payload[field].trim();
      }
    }
    for (const field of ["pageCount", "publishedYear"]) {
      if (typeof payload[field] === "number" && payload[field] > 0) {
        patch[field] = payload[field];
      }
    }
    return Object.keys(patch).length ? await update("books", existing.id, patch) : existing;
  }
  return await insert("books", {
    householdId: HOUSEHOLD_ID,
    title: String(payload.title ?? "Untitled").trim(),
    author: String(payload.author ?? "Unknown author").trim(),
    isbn: payload.isbn || null,
    description: payload.description || null,
    coverUrl: payload.coverUrl || null,
    genre: payload.genre || null,
    language: payload.language || null,
    pageCount: payload.pageCount || null,
    publisher: payload.publisher || null,
    publishedYear: payload.publishedYear || null,
    series: payload.series || null,
    externalRef: payload.externalRef || null,
    format: payload.format || null,
    isSample: false,
    createdBy: currentId(),
    createdAt: now(),
    discoveredAt: discovered ? now() : null,
  });
}

async function logActivity(type: string, title: string, detail?: string, bookId?: string, documentId?: string) {
  await insert("activity", {
    householdId: HOUSEHOLD_ID,
    readerId: currentId(),
    type,
    title,
    detail: detail ?? null,
    bookId: bookId ?? null,
    documentId: documentId ?? null,
    isSample: false,
    createdAt: now(),
  });
}

async function getOrCreateRecord(bookId: string, readerId: string, mode = "individual") {
  const all = await records();
  let record: any = all.find((item) => item.bookId === bookId && item.readerId === readerId);
  if (!record) {
    record = await insert("readingRecords", {
      householdId: HOUSEHOLD_ID,
      bookId,
      readerId,
      mode,
      status: "reading",
      source: "physical",
      startDate: now(),
      currentPage: 0,
      isSample: false,
      createdAt: now(),
      updatedAt: now(),
    });
  }
  return record;
}

function mapReaders(list: Row[]) {
  return list.map((profile) => ({
    userId: profile.id,
    profileId: profile.id,
    displayName: profile.displayName,
    bio: profile.bio ?? "",
    avatarUrl: profile.avatarUrl ?? null,
    favoriteGenres: profile.favoriteGenres ?? [],
    languages: profile.languages ?? ["English"],
    shareActivity: profile.shareActivity ?? true,
    isSample: Boolean(profile.isSample),
    joinedAt: profile.joinedAt,
  }));
}

async function bootstrap() {
  const [home, people] = await Promise.all([household(), profiles()]);
  const me = people.find((person) => person.id === currentId()) ?? people[0];
  return {
    signedIn: true as const,
    hasHousehold: true as const,
    me: me ? { userId: me.id, profileId: me.id, displayName: me.displayName, avatarUrl: me.avatarUrl ?? null } : null,
    household: { id: home.id, name: home.name, inviteCode: home.inviteCode ?? "", sampleSeededAt: home.sampleSeededAt ?? null },
    members: mapReaders(people),
    hasPhoto: Boolean(me?.avatarUrl),
  };
}

function groupBy<T>(list: T[], key: (value: T) => string) {
  const result = new Map<string, T[]>();
  for (const item of list) {
    const value = key(item);
    const group = result.get(value) ?? [];
    group.push(item);
    result.set(value, group);
  }
  return result;
}

async function readShelf() {
  const [allBooks, allRecords, people] = await Promise.all([books(), records(), profiles()]);
  const completed = allRecords.filter((record) => record.status === "completed");
  const ids = new Set(completed.map((record) => record.bookId));
  return {
    items: allBooks.filter((book) => ids.has(book.id)).map((book) => ({
      book: { ...book, _id: book.id },
      records: completed.filter((record) => record.bookId === book.id).map((record) => ({ ...record, _id: record.id })),
    })),
    readers: people.map((profile) => ({ userId: profile.id, displayName: profile.displayName, isSample: Boolean(profile.isSample) })),
  };
}

async function readWishlist() {
  const [allWishes, allBooks, people] = await Promise.all([wishes(), books(), profiles()]);
  const byId = new Map(allBooks.map((book) => [book.id, book]));
  return {
    items: allWishes.flatMap((item) => {
      const book = byId.get(item.bookId);
      return book ? [{ item: { ...item, _id: item.id }, book: { ...book, _id: book.id } }] : [];
    }),
    readers: people.map((profile) => ({ userId: profile.id, displayName: profile.displayName, isSample: false })),
    myUserId: currentId(),
  };
}

async function readMemories() {
  const [allBooks, allRecords, allWishes, allDocs, people, allProgress] = await Promise.all([
    books(), records(), wishes(), documents(), profiles(), rows("documentProgress"),
  ]);
  const byBook = new Map(allBooks.map((book) => [book.id, book]));
  const readerById = new Map(people.map((person) => [person.id, person]));
  const cover = (book: Row) => book.coverUrl ?? null;
  const bookItems = [...groupBy(allRecords, (record) => record.bookId)].flatMap(([bookId, group]) => {
    const book = byBook.get(bookId);
    if (!book) return [];
    const complete = group.filter((record) => record.status === "completed");
    const active = group.filter((record) => record.status === "reading");
    if (!complete.length && !active.length) return [];
    const readerIds = [...new Set((complete.length ? complete : active).map((record) => record.readerId))];
    const focus = complete.find((record) => record.readerId === currentId()) ?? complete[0];
    return [{
      id: `book-${bookId}`, kind: "book", status: complete.length ? "completed" : "reading",
      title: book.title, author: book.author, coverUrl: cover(book), date: Math.max(...(complete.length ? complete : active).map((record) => record.completionDate ?? record.updatedAt)),
      bookId: book.id, readerIds, readers: readerIds.map((id) => readerById.get(id)).filter(Boolean).map((person) => ({ userId: person!.id, displayName: person!.displayName, avatarUrl: person!.avatarUrl ?? null })),
      together: readerIds.length > 1 || group.some((record) => record.mode === "together"),
      review: complete.find((record) => record.readerId === currentId() && record.review)?.review ?? complete.find((record) => record.review)?.review,
      rating: focus?.rating, progress: complete.length ? 100 : undefined,
      currentPage: active.length ? Math.max(...active.map((record) => record.currentPage)) : undefined,
      pageCount: book.pageCount, note: book.description,
    }];
  });
  const wishItems = [...groupBy(allWishes, (wish) => wish.bookId)].flatMap(([bookId, group]) => {
    const book = byBook.get(bookId);
    if (!book) return [];
    const readerIds = [...new Set(group.map((wish) => wish.readerId))];
    return [{ id: `wish-${bookId}`, kind: "book", status: "wishlist", title: book.title, author: book.author, coverUrl: cover(book), date: Math.max(...group.map((wish) => wish.addedAt)), bookId, readerIds,
      readers: readerIds.map((id) => readerById.get(id)).filter(Boolean).map((person) => ({ userId: person!.id, displayName: person!.displayName, avatarUrl: person!.avatarUrl ?? null })),
      together: readerIds.length > 1, note: group.find((wish) => wish.note)?.note, rating: undefined }];
  });
  const docItems = allDocs.filter((doc) => doc.visibility === "shared" || doc.ownerId === currentId()).map((doc) => {
    const progress = allProgress.find((row: Row) => row.documentId === doc.id && row.readerId === currentId());
    const linkedBook = doc.bookId ? byBook.get(doc.bookId) : undefined;
    return { id: `document-${doc.id}`, kind: "document", status: "document", title: doc.title, author: doc.author || "Digital document",
      coverUrl: doc.coverUrl ?? (linkedBook ? cover(linkedBook) : null), date: doc.updatedAt, documentId: doc.id, bookId: doc.bookId,
      readerIds: doc.visibility === "shared" ? people.map((person) => person.id) : [doc.ownerId],
      readers: people.filter((person) => doc.visibility === "shared" || person.id === doc.ownerId).map((person) => ({ userId: person.id, displayName: person.displayName, avatarUrl: person.avatarUrl ?? null })),
      together: doc.visibility === "shared" && people.length > 1, note: `${doc.totalPages} pages · ${doc.visibility} PDF`,
      progress: progress ? Math.min(100, Math.round((progress.lastPage / Math.max(progress.totalPages, 1)) * 100)) : undefined,
      currentPage: progress?.lastPage, pageCount: doc.totalPages };
  });
  return { items: [...bookItems, ...wishItems, ...docItems], readers: people.map((person) => ({ userId: person.id, displayName: person.displayName, avatarUrl: person.avatarUrl ?? null })), myUserId: currentId() };
}

export async function runQuery(name: string, args: any): Promise<any> {
  switch (name) {
    case "households.bootstrap": return await bootstrap();
    case "users.currentUser": {
      const person = (await profiles()).find((profile) => profile.id === currentId());
      return person ? { _id: person.id, name: person.displayName, image: person.avatarUrl ?? null, email: null } : null;
    }
    case "books.shelf": return await readShelf();
    case "books.memories": return await readMemories();
    case "books.recentDiscoveries": return (await books()).filter((book) => book.discoveredAt).sort((a, b) => b.discoveredAt - a.discoveredAt).slice(0, 10);
    case "books.bookDetail": {
      const book = await one("books", args.bookId);
      if (!book) return null;
      const [allRecords, allProfiles, allWishes, allDocs, allSessions] = await Promise.all([records(), profiles(), wishes(), documents(), sessions()]);
      return { book: { ...book, _id: book.id }, coverUrl: book.coverUrl ?? null,
        records: allRecords.filter((record) => record.bookId === book.id).map((record) => ({ ...record, _id: record.id })),
        readers: allProfiles.map((profile) => ({ userId: profile.id, displayName: profile.displayName, isSample: false })),
        wishes: allWishes.filter((wish) => wish.bookId === book.id).map((wish) => ({ ...wish, _id: wish.id })),
        documents: (await documents()).filter((doc) => doc.bookId === book.id && (doc.visibility === "shared" || doc.ownerId === currentId())).map((doc) => ({ ...doc, _id: doc.id })),
        history: allSessions.filter((session) => session.bookId === book.id).sort((a, b) => b.dayKey.localeCompare(a.dayKey)).slice(0, 16), myUserId: currentId() };
    }
    case "wishlist.list": return await readWishlist();
    case "library.list": {
      const [docs, progress, people] = await Promise.all([documents(), rows("documentProgress"), profiles()]);
      const visible = docs.filter((doc) => doc.visibility === "shared" || doc.ownerId === currentId());
      return { items: visible.map((doc) => ({ document: { ...doc, _id: doc.id }, progress: progress.find((row: Row) => row.documentId === doc.id && row.readerId === currentId()) ?? null,
        ownerName: doc.ownerId === currentId() ? "You" : people.find((p) => p.id === doc.ownerId)?.displayName ?? "Reader", isMine: doc.ownerId === currentId(), coverUrl: doc.coverUrl ?? null })).sort((a: any, b: any) => b.document.updatedAt - a.document.updatedAt),
        readers: people.map((person) => ({ userId: person.id, displayName: person.displayName, isSample: false })), myUserId: currentId() };
    }
    case "library.get": {
      const doc = await one("libraryDocuments", args.documentId);
      if (!doc || (doc.visibility === "private" && doc.ownerId !== currentId())) return null;
      const { data, error } = await requireSupabase().storage.from("bookverse-pdfs").createSignedUrl(doc.storagePath, 3600);
      if (error) throw error;
      const progress = (await rows("documentProgress")).find((row) => row.documentId === doc.id && row.readerId === currentId());
      return { document: { ...doc, _id: doc.id, publicUrl: data.signedUrl }, progress: progress ?? null, coverUrl: doc.coverUrl ?? null, canEdit: doc.ownerId === currentId() };
    }
    case "library.myProgressForBook": return (await documents()).filter((doc) => doc.bookId === args.bookId && (doc.visibility === "shared" || doc.ownerId === currentId())).map((doc) => ({ ...doc, _id: doc.id }));
    case "profiles.overview": return await profileOverview();
    case "stats.home": return await homeStats();
    case "stats.statsPage": return await statsPage();
    default: throw new Error(`Unknown query: ${name}`);
  }
}

async function profileOverview() {
  const [allBooks, allRecords, allSessions, people, allWishes] = await Promise.all([books(), records(), sessions(), profiles(), wishes()]);
  const byBook = new Map(allBooks.map((book) => [book.id, book]));
  const peopleData = people.map((person) => {
    const personRecords = allRecords.filter((record) => record.readerId === person.id);
    const personSessions = allSessions.filter((session) => session.readerId === person.id);
    const streak = readerStreak(allSessions, person.id);
    const completed = personRecords.filter((record) => record.status === "completed");
    const ratings = completed.map((record) => record.rating).filter((rating) => typeof rating === "number");
    return { userId: person.id, profileId: person.id, displayName: person.displayName, bio: person.bio ?? "", avatarUrl: person.avatarUrl ?? null,
      favoriteGenres: person.favoriteGenres ?? [], languages: person.languages ?? ["English"], shareActivity: person.shareActivity ?? true,
      isSample: false, isMe: person.id === currentId(), email: null, joinedAt: person.joinedAt,
      stats: { currentStreak: streak.current, bestStreak: streak.best, readingDays: streak.days.size,
        weekDays: 0, booksCompleted: completed.length, pagesRead: personSessions.reduce((a, s) => a + s.pages, 0), minutesRead: personSessions.reduce((a, s) => a + s.minutes, 0),
        averageRating: ratings.length ? Math.round(ratings.reduce((a, b) => a + b, 0) / ratings.length * 10) / 10 : null }, privateActivity: false,
      reading: personRecords.filter((record) => record.status === "reading").map((record) => ({ record, book: byBook.get(record.bookId) })).filter((item) => item.book),
      finished: completed.map((record) => ({ record, book: byBook.get(record.bookId) })).filter((item) => item.book),
      wishlist: allWishes.filter((wish) => wish.readerId === person.id).map((item) => ({ item, book: byBook.get(item.bookId) })).filter((item) => item.book) };
  });
  return { people: peopleData, household: { name: (await household()).name, inviteCode: "", memberCount: people.length, sampleSeededAt: null }, myUserId: currentId(), isSample: false };
}

async function homeStats() {
  const [home, allBooks, allRecords, allSessions, activity, people, docs, progress, allWishes] = await Promise.all([
    household(), books(), records(), sessions(), rows("activity"), profiles(), documents(), rows("documentProgress"), wishes(),
  ]);
  const names = new Map(people.map((person) => [person.id, person.displayName]));
  const bookById = new Map(allBooks.map((book) => [book.id, book]));
  const grouped = groupBy(allRecords.filter((record) => record.status === "reading"), (record) => record.bookId);
  const currentlyReading = [...grouped].flatMap(([bookId, list]) => {
    const book = bookById.get(bookId);
    if (!book) return [];
    const entries = list.map((record) => ({ record, readerId: record.readerId, readerName: names.get(record.readerId) ?? "Reader", percent: book.pageCount ? Math.min(100, Math.round(record.currentPage / book.pageCount * 100)) : 0 }));
    return [{ book: { ...book, _id: book.id }, records: entries, percent: Math.max(...entries.map((item) => item.percent), 0), total: book.pageCount ?? 0 }];
  });
  const readerStreaks = new Map(people.map((person) => [person.id, readerStreak(allSessions, person.id)]));
  const weekStart = localDayOffset(6);
  const readers = people.map((person) => {
    const streak = readerStreaks.get(person.id)!;
    return {
      userId: person.id,
      displayName: person.displayName,
      avatarUrl: person.avatarUrl ?? null,
      isSample: false,
      current: streak.current,
      best: streak.best,
      totalDays: streak.days.size,
      weekDays: [...streak.days].filter((key) => key >= weekStart).length,
    };
  });
  const sharedDays = people.length > 1
    ? [...(readerStreaks.get(people[0].id)?.days ?? [])].filter((key) =>
      people.slice(1).every((person) => readerStreaks.get(person.id)?.days.has(key)),
    )
    : [];
  const sharedStreak = streakSummary(sharedDays);
  const completed = allRecords.filter((record) => record.status === "completed");
  const finishedIds = new Set(completed.map((record) => record.bookId));
  const activityItems = activity.sort((a, b) => b.createdAt - a.createdAt).slice(0, 9).map((item) => ({ ...item, _id: item.id, readerName: names.get(item.readerId) ?? "Reader", isMine: item.readerId === currentId() }));
  const weekly = [6,5,4,3,2,1,0].map((offset) => {
    const key = localDayOffset(offset);
    const date = new Date(`${key}T12:00:00`);
    const todaySessions = allSessions.filter((session) => session.dayKey === key);
    return {
      dayKey: key,
      label: ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][date.getDay()],
      pages: people.map((person) => todaySessions.filter((session) => session.readerId === person.id).reduce((sum, session) => sum + session.pages, 0)),
      shared: sharedStreak.days.has(key),
    };
  });
  const weekSessions = allSessions.filter((session) => session.dayKey >= weekStart);
  return {
    householdName: home.name,
    readers,
    shared: {
      daysThisWeek: sharedDays.filter((key) => key >= weekStart).length,
      totalDays: 0,
      booksCompleted: finishedIds.size,
      readingRecordsCompleted: completed.length,
      pagesRead: allSessions.reduce((sum, session) => sum + session.pages, 0),
      minutesRead: allSessions.reduce((sum, session) => sum + session.minutes, 0),
      currentlyReading: grouped.size,
      sharedBooksCompleted: 0,
      wishlistCount: allWishes.length,
      currentStreak: sharedStreak.current,
      bestStreak: sharedStreak.best,
    },
    currentlyReading,
    digital: [],
    weekly: {
      days: weekly,
      pages: weekSessions.reduce((sum, session) => sum + session.pages, 0),
      minutes: weekSessions.reduce((sum, session) => sum + session.minutes, 0),
      readingDays: new Set(weekSessions.filter((session) => session.pages > 0).map((session) => session.dayKey)).size,
      readerPages: people.map((person) => weekSessions.filter((session) => session.readerId === person.id).reduce((sum, session) => sum + session.pages, 0)),
    },
    activity: activityItems,
    myUserId: currentId(),
    streakRule: { pages: 1 },
  };
}

async function statsPage() {
  const [allBooks, allRecords, allSessions, people] = await Promise.all([books(), records(), sessions(), profiles()]);
  const completed = allRecords.filter((record) => record.status === "completed");
  const readers = people.map((person) => {
    const ss = allSessions.filter((session) => session.readerId === person.id);
    const streak = readerStreak(allSessions, person.id);
    const rr = completed.filter((record) => record.readerId === person.id);
    const rated = rr.map((record) => record.rating).filter((rating) => typeof rating === "number");
    return { userId: person.id, displayName: person.displayName, isSample: false, avatarUrl: person.avatarUrl ?? null,
      booksCompleted: rr.length, pagesRead: ss.reduce((a,s)=>a+s.pages,0), minutesRead: ss.reduce((a,s)=>a+s.minutes,0), currentStreak: streak.current,
      bestStreak: streak.best, readingDays: streak.days.size, currentlyReading: allRecords.filter((record)=>record.readerId===person.id&&record.status==="reading").length,
      averageRating: rated.length ? Math.round(rated.reduce((a,b)=>a+b,0)/rated.length*10)/10 : null, ratingsGiven: rated.length,
      milestones: [7,14,30,60,100].map((days)=>({days,achieved:streak.best>=days,shared:false})) };
  });
  const genres = [...groupBy(completed, (record) => allBooks.find((book) => book.id === record.bookId)?.genre ?? "Unclassified")].map(([genre, group])=>({genre,count:group.length})).sort((a,b)=>b.count-a.count).slice(0,7);
  const readerStreaks = new Map(people.map((person) => [person.id, readerStreak(allSessions, person.id)]));
  const sharedDays = people.length > 1
    ? [...(readerStreaks.get(people[0].id)?.days ?? [])].filter((key) => people.slice(1).every((person) => readerStreaks.get(person.id)?.days.has(key)))
    : [];
  const sharedStreak = streakSummary(sharedDays);
  const weekDays = [6,5,4,3,2,1,0].map((offset) => {
    const key = localDayOffset(offset);
    const date = new Date(`${key}T12:00:00`);
    const daily = allSessions.filter((session) => session.dayKey === key);
    return {
      label: ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][date.getDay()],
      dayKey: key,
      pages: people.map((person) => daily.filter((session) => session.readerId === person.id).reduce((sum, session) => sum + session.pages, 0)),
      minutes: people.map((person) => daily.filter((session) => session.readerId === person.id).reduce((sum, session) => sum + session.minutes, 0)),
      shared: sharedStreak.days.has(key),
    };
  });
  const streakHistory = Array.from({ length: 56 }, (_, index) => {
    const key = localDayOffset(55 - index);
    const flags = people.map((person) => readerStreaks.get(person.id)?.days.has(key) ?? false);
    return { dayKey: key, readers: flags, shared: flags.length === 2 && flags.every(Boolean) };
  });
  const monthly = Array.from({length:6},(_,i)=>{const date=new Date();date.setDate(1);date.setMonth(date.getMonth()-(5-i));const key=`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}`;const ms=allSessions.filter((s)=>s.dayKey.startsWith(key));return{label:date.toLocaleString("en",{month:"short"}),pages:people.map((p)=>ms.filter((s)=>s.readerId===p.id).reduce((a,s)=>a+s.pages,0)),minutes:people.map((p)=>ms.filter((s)=>s.readerId===p.id).reduce((a,s)=>a+s.minutes,0)),books:people.map((p)=>completed.filter((r)=>r.readerId===p.id&&String(r.completionDate??"").startsWith(key)).length)};});
  const totalPagesRead = allSessions.reduce((sum, session) => sum + session.pages, 0);
  const totalMinutesRead = allSessions.reduce((sum, session) => sum + session.minutes, 0);
  return {
    readers,
    shared: {
      currentStreak: sharedStreak.current, bestStreak: sharedStreak.best, readingDays: sharedStreak.days.size, pagesRead: totalPagesRead, minutesRead: totalMinutesRead,
      booksCompleted: completed.length, booksTogether: 0, pagesTogether: 0, booksReadTogether: 0,
      pagesReadTogether: 0, sharedReadingDays: sharedStreak.days.size, sharedCurrentStreak: sharedStreak.current, sharedBestStreak: sharedStreak.best,
      totalBooksCompleted: completed.length, totalPagesRead, totalMinutesRead, digitalDocuments: 0,
      milestones: [7,14,30,60,100].map((days)=>({days,achieved:sharedStreak.best>=days,shared:true})),
    },
    weekly: weekDays, monthly, genres, streakHistory,
    streakRule: { pages: 1 },
    allBooksCompleted: completed.length,
  };
}

export async function runMutation(name: string, args: any): Promise<any> {
  const db = requireSupabase();
  const readerId = currentId();
  const timestamp = now();
  let result: any;
  switch (name) {
    case "households.renameLibrary": result = await update("households", HOUSEHOLD_ID, { name: String(args.name ?? "Our BookVerse").trim() || "Our BookVerse" }); break;
    case "households.saveAvatar": {
      const path = `${readerId}/${Date.now()}-${args.file.name}`;
      const { error } = await db.storage.from("bookverse-pdfs").upload(path, args.file, { upsert: true });
      if (error) throw error;
      const { data } = db.storage.from("bookverse-pdfs").getPublicUrl(path);
      result = await update("profiles", readerId, { avatarUrl: data.publicUrl }); break;
    }
    case "books.setSpineColor": result = await update("books", args.bookId, { spineColor: args.color }); break;
    case "books.updateDetails": {
      const book = await one("books", args.bookId);
      if (!book) throw new Error("Book not found.");
      const details = args.details ?? {};
      const title = String(details.title ?? "").trim();
      const author = String(details.author ?? "").trim();
      if (!title || !author) throw new Error("Title and author are required.");
      const optionalText = (value: unknown) => String(value ?? "").trim() || null;
      const positiveNumber = (value: unknown) => {
        const number = Number(value);
        return Number.isFinite(number) && number > 0 ? Math.round(number) : null;
      };
      result = await update("books", book.id, {
        title,
        author,
        isbn: optionalText(details.isbn),
        description: optionalText(details.description),
        coverUrl: optionalText(details.coverUrl),
        genre: optionalText(details.genre),
        language: optionalText(details.language),
        pageCount: positiveNumber(details.pageCount),
        publisher: optionalText(details.publisher),
        publishedYear: positiveNumber(details.publishedYear),
        series: optionalText(details.series),
        externalRef: optionalText(details.externalRef),
        format: optionalText(details.format),
        spineColor: optionalText(details.spineColor),
      });
      break;
    }
    case "books.updateRecord": {
      const record = await one("readingRecords", args.recordId);
      if (!record) throw new Error("Reading record not found.");
      const book = await one("books", record.bookId);
      const values = args.record ?? {};
      const status = values.status === "completed" ? "completed" : "reading";
      const mode = values.mode === "together" ? "together" : "individual";
      const source = values.source === "digital" ? "digital" : "physical";
      const startDate = Number(values.startDate);
      const currentPage = Number(values.currentPage);
      const completionDate = values.completionDate ? Number(values.completionDate) : null;
      if (!Number.isFinite(startDate) || startDate <= 0) throw new Error("Enter a valid start date.");
      if (!Number.isFinite(currentPage) || currentPage < 0) throw new Error("Page number must be zero or greater.");
      if (book?.pageCount && currentPage > book.pageCount) throw new Error("Current page cannot exceed the book’s page count.");
      if (completionDate !== null && (!Number.isFinite(completionDate) || completionDate <= 0)) {
        throw new Error("Enter a valid completion date.");
      }
      if (status === "completed" && completionDate === null) throw new Error("Enter the date you finished reading.");
      const rating = values.rating === "" || values.rating == null ? null : Number(values.rating);
      if (rating !== null && (!Number.isFinite(rating) || rating < 0.5 || rating > 5 || rating * 2 !== Math.round(rating * 2))) {
        throw new Error("Rating must be between half a star and five stars in half-star steps.");
      }
      result = await update("readingRecords", record.id, {
        status,
        mode,
        source,
        startDate: Math.round(startDate),
        completionDate: status === "completed" ? completionDate : null,
        currentPage: Math.round(currentPage),
        rating,
        review: String(values.review ?? "").trim() || null,
        notes: String(values.notes ?? "").trim() || null,
        updatedAt: timestamp,
      });
      break;
    }
    case "books.startReading": {
      const book = await findOrCreateBook(args.book, true, Boolean(args.updateBookDetails));
      const readerIds = args.readerIds?.length ? args.readerIds : [readerId];
      for (const id of readerIds) {
        const old = (await records()).find((record) => record.bookId === book.id && record.readerId === id);
        if (old) await update("readingRecords", old.id, { status: "reading", completionDate: null, currentPage: 0, startDate: timestamp, updatedAt: timestamp, mode: args.mode ?? "individual" });
        else await insert("readingRecords", { householdId: HOUSEHOLD_ID, bookId: book.id, readerId: id, mode: args.mode ?? "individual", status: "reading", source: "physical", startDate: timestamp, currentPage: 0, isSample: false, createdAt: timestamp, updatedAt: timestamp });
        const wish = (await wishes()).find((row) => row.bookId === book.id && row.readerId === id);
        if (wish) await remove("wishlistItems", wish.id);
      }
      await logActivity("started", book.title, readerIds.length > 1 ? "Started reading together" : "Started reading", book.id);
      result = book.id; break;
    }
    case "books.updateProgress": {
      const record = await one("readingRecords", args.recordId);
      if (!record) throw new Error("Reading record not found.");
      const book = await one("books", record.bookId);
      const next = Math.max(record.currentPage, Math.min(Math.round(args.currentPage), book?.pageCount ?? args.currentPage));
      await update("readingRecords", record.id, { currentPage: next, updatedAt: timestamp });
      const pages = Math.max(0, next - record.currentPage);
      if (pages) await upsertSession(record.bookId, null, pages, 0, args.dayKey);
      result = next; break;
    }
    case "books.completeRecord": {
      const record = await one("readingRecords", args.recordId); if (!record) throw new Error("Reading record not found.");
      const book = await one("books", record.bookId);
      result = await update("readingRecords", record.id, { status: "completed", completionDate: args.completionDate ?? timestamp, currentPage: book?.pageCount ?? record.currentPage, rating: args.rating, review: args.review ?? null, notes: args.notes ?? null, updatedAt: timestamp });
      await logActivity("finished", book?.title ?? "A book", "Finished reading", record.bookId); break;
    }
    case "books.removeReading": {
      const activeRecords = (await records()).filter(
        (record) => record.bookId === args.bookId && record.status === "reading",
      );
      await Promise.all(activeRecords.map((record) => remove("readingRecords", record.id)));
      result = activeRecords.length;
      break;
    }
    case "books.markAsRead": {
      const book = await findOrCreateBook(args.book, true, Boolean(args.updateBookDetails));
      const readerIds = args.readerIds?.length ? args.readerIds : [readerId];
      for (const id of readerIds) {
        const old = (await records()).find((record) => record.bookId === book.id && record.readerId === id);
        if (old) {
          await update("readingRecords", old.id, {
            status: "completed",
            completionDate: timestamp,
            currentPage: book.pageCount ?? old.currentPage,
            source: "physical",
            updatedAt: timestamp,
          });
        } else {
          await insert("readingRecords", {
            householdId: HOUSEHOLD_ID,
            bookId: book.id,
            readerId: id,
            mode: readerIds.length > 1 ? "together" : "individual",
            status: "completed",
            source: "physical",
            startDate: timestamp,
            completionDate: timestamp,
            currentPage: book.pageCount ?? 0,
            isSample: false,
            createdAt: timestamp,
            updatedAt: timestamp,
          });
        }
        const wish = (await wishes()).find((item) => item.bookId === book.id && item.readerId === id);
        if (wish) await remove("wishlistItems", wish.id);
      }
      await logActivity("finished", book.title, "Marked as already read", book.id);
      result = book.id;
      break;
    }
    case "books.saveReview": {
      const record = await one("readingRecords", args.recordId); if (!record) throw new Error("Reading record not found.");
      result = await update("readingRecords", record.id, { rating: args.rating ?? record.rating, review: args.review ?? record.review, notes: args.notes ?? record.notes, updatedAt: timestamp }); break;
    }
    case "wishlist.add": {
      const book = await findOrCreateBook(args.book, true, Boolean(args.updateBookDetails));
      for (const id of (args.readerIds?.length ? args.readerIds : [readerId])) {
        const old = (await wishes()).find((wish) => wish.bookId === book.id && wish.readerId === id);
        if (old) await update("wishlistItems", old.id, { priority: args.priority, note: args.note ?? old.note });
        else await insert("wishlistItems", { householdId: HOUSEHOLD_ID, bookId: book.id, readerId: id, priority: args.priority ?? "soon", note: args.note ?? null, isSample: false, addedAt: timestamp });
      }
      await logActivity("wishlist", book.title, "Added to the wishlist", book.id); result = book.id; break;
    }
    case "wishlist.update": result = await update("wishlistItems", args.itemId, { priority: args.priority, note: args.note }); break;
    case "wishlist.remove": result = await remove("wishlistItems", args.itemId); break;
    case "wishlist.start": {
      const book = await one("books", args.bookId); if (!book) throw new Error("Book not found.");
      const readerIds = args.readerIds?.length ? args.readerIds : [readerId];
      for (const id of readerIds) { await getOrCreateRecord(book.id, id, args.mode); const wish = (await wishes()).find((w) => w.bookId === book.id && w.readerId === id); if (wish) await remove("wishlistItems", wish.id); }
      await logActivity("started", book.title, "Started from the wishlist", book.id); result = true; break;
    }
    case "wishlist.combine": {
      const book = await one("books", args.bookId); if (!book) throw new Error("Book not found.");
      for (const profile of await profiles()) { const old = (await wishes()).find((wish) => wish.bookId === book.id && wish.readerId === profile.id); if (old) await update("wishlistItems", old.id, { priority: args.priority ?? old.priority }); else await insert("wishlistItems", { householdId: HOUSEHOLD_ID, bookId: book.id, readerId: profile.id, priority: args.priority ?? "soon", isSample: false, addedAt: timestamp }); }
      result = true; break;
    }
    case "wishlist.markAlreadyRead": {
      const book = await one("books", args.bookId); if (!book) throw new Error("Book not found.");
      const old = (await records()).find((record) => record.bookId === book.id && record.readerId === readerId);
      if (old) await update("readingRecords", old.id, { status: "completed", completionDate: timestamp, currentPage: book.pageCount ?? old.currentPage, rating: args.rating, review: args.review ?? null, updatedAt: timestamp });
      else await insert("readingRecords", { householdId: HOUSEHOLD_ID, bookId: book.id, readerId, mode: "individual", status: "completed", source: "physical", startDate: timestamp, completionDate: timestamp, currentPage: book.pageCount ?? 0, rating: args.rating, review: args.review ?? null, isSample: false, createdAt: timestamp, updatedAt: timestamp });
      const wish = (await wishes()).find((item) => item.bookId === book.id && item.readerId === readerId); if (wish) await remove("wishlistItems", wish.id); result = true; break;
    }
    case "profiles.updateProfile": result = await update("profiles", readerId, args); break;
    case "sessions.checkIn": result = await checkIn(args); break;
    case "library.generateUploadUrl": result = null; break;
    case "library.createDocument": result = await createDocument(args); break;
    case "library.issueToken": {
      const doc = await one("libraryDocuments", args.documentId); if (!doc) throw new Error("Document not found.");
      const { data, error } = await db.storage.from("bookverse-pdfs").createSignedUrl(doc.storagePath, 3600); if (error) throw error; result = data.signedUrl; break;
    }
    case "library.updateDocument": {
      const { documentId, title, author, description, visibility, coverUrl } = args;
      result = await update("libraryDocuments", documentId, { title, author, description, visibility, ...(coverUrl === undefined ? {} : { coverUrl }), updatedAt: timestamp });
      break;
    }
    case "library.removeDocument": {
      const doc = await one("libraryDocuments", args.documentId); if (!doc) throw new Error("Document not found.");
      await remove("libraryDocuments", doc.id); const { error } = await db.storage.from("bookverse-pdfs").remove([doc.storagePath]); if (error) throw error; result = true; break;
    }
    case "library.saveProgress": result = await saveDocumentProgress(args); break;
    case "library.completeDocument": result = await completeDocument(args); break;
    default: throw new Error(`Unknown action: ${name}`);
  }
  announceDataChange();
  return result;
}

async function upsertSession(bookId: string | null, documentId: string | null, pages: number, minutes: number, key?: string) {
  const date = key ?? dayKey();
  const current = (await sessions()).find((session) => session.readerId === currentId() && session.bookId === bookId && session.documentId === documentId && session.dayKey === date);
  if (current) await update("readingSessions", current.id, { pages: current.pages + pages, minutes: current.minutes + minutes, updatedAt: now() });
  else await insert("readingSessions", { householdId: HOUSEHOLD_ID, readerId: currentId(), bookId, documentId, dayKey: date, pages, minutes, source: documentId ? "digital" : "physical", isSample: false, createdAt: now(), updatedAt: now() });
}

async function checkIn(args: any) {
  const pages = Math.max(0, Math.round(args.pages));
  const minutes = Math.max(0, Math.round(args.minutes));
  await upsertSession(args.bookId ?? null, args.documentId ?? null, pages, minutes, args.dayKey);
  const book = args.bookId ? await one("books", args.bookId) : null;
  await logActivity(args.documentId ? "pdf-session" : "session", book?.title ?? "Reading session", `${pages} pages · ${minutes} minutes`, args.bookId, args.documentId);
  return { qualifies: pages > 0, dayPages: pages, dayMinutes: minutes };
}

async function createDocument(args: any) {
  const path = args.storagePath;
  const book = await findOrCreateBook({ title: args.title, author: args.author || "Unknown author", description: args.description, coverUrl: args.coverUrl, pageCount: args.totalPages, format: "digital" });
  const doc = await insert("libraryDocuments", { householdId: HOUSEHOLD_ID, bookId: book.id, ownerId: currentId(), title: args.title,
    author: args.author ?? null, description: args.description ?? null, fileName: args.fileName, storagePath: path, coverUrl: args.coverUrl ?? null,
    mimeType: "application/pdf", size: args.size ?? 0, totalPages: args.totalPages, visibility: args.visibility ?? "shared", isSample: false, createdAt: now(), updatedAt: now() });
  await insert("documentProgress", { documentId: doc.id, householdId: HOUSEHOLD_ID, readerId: currentId(), lastPage: 1, totalPages: args.totalPages, minutes: 0, updatedAt: now() });
  return doc.id;
}

async function saveDocumentProgress(args: any) {
  const old = (await rows("documentProgress")).find((item) => item.documentId === args.documentId && item.readerId === currentId());
  const doc = await one("libraryDocuments", args.documentId); if (!doc) throw new Error("Document not found.");
  const lastPage = Math.max(1, Math.min(Math.round(args.lastPage), doc.totalPages));
  if (old) await update("documentProgress", old.id, { lastPage, minutes: old.minutes + Math.max(0, args.minutes ?? 0), updatedAt: now() });
  else await insert("documentProgress", { documentId: doc.id, householdId: HOUSEHOLD_ID, readerId: currentId(), lastPage, totalPages: doc.totalPages, minutes: Math.max(0, args.minutes ?? 0), updatedAt: now() });
  await update("libraryDocuments", doc.id, { updatedAt: now() });
  const pageAdvance = Math.max(0, lastPage - (old?.lastPage ?? 1));
  if (pageAdvance > 0 || (args.minutes ?? 0) > 0) {
    await upsertSession(doc.bookId ?? null, doc.id, pageAdvance, args.minutes ?? 0, args.dayKey);
  }
  return { lastPage };
}

async function completeDocument(args: any) {
  const doc = await one("libraryDocuments", args.documentId); if (!doc) throw new Error("Document not found.");
   const book = doc.bookId ? await one("books", doc.bookId) : await findOrCreateBook({ title: doc.title, author: doc.author ?? "Unknown author", pageCount: doc.totalPages, format: "digital" });
   if (!book) throw new Error("Book not found.");
  if (!doc.bookId) await update("libraryDocuments", doc.id, { bookId: book.id });
  const old = (await records()).find((record) => record.bookId === book.id && record.readerId === currentId());
  const payload = { status: "completed", completionDate: args.completionDate ?? now(), currentPage: doc.totalPages, rating: args.rating, review: args.review ?? null, notes: args.notes ?? null, source: "digital", documentId: doc.id, mode: "individual", updatedAt: now() };
  if (old) await update("readingRecords", old.id, payload);
  else await insert("readingRecords", { householdId: HOUSEHOLD_ID, bookId: book.id, readerId: currentId(), startDate: now(), isSample: false, createdAt: now(), ...payload });
  await logActivity("finished", doc.title, "Finished a digital book", book.id, doc.id);
  return book.id;
}
