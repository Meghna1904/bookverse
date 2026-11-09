export type DbRow = Record<string, any> & { _id: string; id?: string };
export type ReaderRow = { userId: string; profileId?: string; displayName: string; avatarUrl?: string | null; favoriteGenres: string[]; languages: string[]; isSample?: boolean; [key: string]: any };
export type MemoryRow = { id: string; kind: "book" | "document"; status: "completed" | "reading" | "wishlist" | "document"; title: string; author: string; coverUrl: string | null; date: number; readerIds: string[]; readers: { userId: string; displayName: string; avatarUrl: string | null }[]; together: boolean; bookId?: string; documentId?: string; review?: string; note?: string; rating?: number; progress?: number; currentPage?: number; pageCount?: number };
export type HomeResult = {
  householdName: string;
  readers: (ReaderRow & { current: number; best: number; totalDays: number; weekDays: number })[];
  shared: DbRow;
  currentlyReading: { book: DbRow; records: { record: DbRow; readerId: string; readerName: string; percent: number }[]; percent: number; total: number }[];
  digital: DbRow[];
  weekly: { days: { dayKey: string; label: string; pages: number[]; shared: boolean }[]; pages: number; minutes: number; readingDays: number; readerPages: number[] };
  activity: DbRow[];
  myUserId: string;
  streakRule: { minutes: number; pages: number };
};
export type ProfileOverviewPerson = ReaderRow & {
  bio: string; isMe: boolean; stats: DbRow;
  reading: { record: DbRow; book: DbRow }[];
  finished: { record: DbRow; book: DbRow }[];
  wishlist: { item: DbRow; book: DbRow }[];
};
export type StatsPageResult = {
  readers: (DbRow & { displayName: string; readingDays: number; pagesRead: number; booksCompleted: number; currentStreak: number; milestones: { days: number; achieved: boolean; shared: boolean }[] })[];
  shared: DbRow & { milestones: { days: number; achieved: boolean; shared: boolean }[] };
  weekly: { label: string; dayKey: string; pages: number[]; minutes: number[]; shared: boolean }[];
  monthly: { label: string; pages: number[]; minutes: number[]; books: number[] }[];
  genres: { genre: string; count: number }[];
  streakHistory: { dayKey: string; readers: boolean[]; shared: boolean }[];
  streakRule: { minutes: number; pages: number };
  allBooksCompleted: number;
};
export type QueryResultMap = {
  "households.bootstrap": { signedIn: true; hasHousehold: true; me: ReaderRow; household: DbRow; members: ReaderRow[]; hasPhoto: boolean };
  "users.currentUser": { _id: string; name: string; image?: string | null; email?: string | null } | null;
  "books.shelf": { items: { book: DbRow; records: DbRow[] }[]; readers: ReaderRow[] };
  "books.memories": { items: MemoryRow[]; readers: ReaderRow[]; myUserId: string };
  "books.recentDiscoveries": DbRow[];
  "books.bookDetail": { book: DbRow; coverUrl: string | null; records: DbRow[]; readers: ReaderRow[]; wishes: DbRow[]; documents: DbRow[]; history: DbRow[]; myUserId: string } | null;
  "wishlist.list": { items: { item: DbRow; book: DbRow }[]; readers: ReaderRow[]; myUserId: string };
  "library.list": { items: { document: DbRow; progress: DbRow | null; ownerName: string; isMine: boolean; coverUrl: string | null }[]; readers: ReaderRow[]; myUserId: string };
  "library.get": { document: DbRow; progress: DbRow | null; coverUrl: string | null; canEdit: boolean } | null;
  "library.myProgressForBook": DbRow[];
  "profiles.overview": { people: ProfileOverviewPerson[]; household: DbRow; myUserId: string; isSample: boolean };
  "stats.home": HomeResult;
  "stats.statsPage": StatsPageResult;
};
export type QueryName = keyof QueryResultMap;
export type QueryRef<T> = { kind: "query"; name: QueryName; __result?: T };
export type MutationRef = { kind: "mutation"; name: string };
const q = <T>(name: QueryName): QueryRef<T> => ({ kind: "query", name });
const m = (name: string): MutationRef => ({ kind: "mutation", name });

export const api = {
  households: {
    bootstrap: q<QueryResultMap["households.bootstrap"]>("households.bootstrap"),
    renameLibrary: m("households.renameLibrary"),
    saveAvatar: m("households.saveAvatar"),
  },
  users: { currentUser: q<QueryResultMap["users.currentUser"]>("users.currentUser") },
  books: {
    shelf: q<QueryResultMap["books.shelf"]>("books.shelf"),
    memories: q<QueryResultMap["books.memories"]>("books.memories"),
    recentDiscoveries: q<QueryResultMap["books.recentDiscoveries"]>("books.recentDiscoveries"),
    bookDetail: q<QueryResultMap["books.bookDetail"]>("books.bookDetail"),
    startReading: m("books.startReading"),
    updateProgress: m("books.updateProgress"),
    completeRecord: m("books.completeRecord"),
    markAsRead: m("books.markAsRead"),
    saveReview: m("books.saveReview"),
    setSpineColor: m("books.setSpineColor"),
  },
  wishlist: {
    list: q<QueryResultMap["wishlist.list"]>("wishlist.list"),
    add: m("wishlist.add"),
    update: m("wishlist.update"),
    remove: m("wishlist.remove"),
    start: m("wishlist.start"),
    combine: m("wishlist.combine"),
    markAlreadyRead: m("wishlist.markAlreadyRead"),
  },
  library: {
    list: q<QueryResultMap["library.list"]>("library.list"),
    get: q<QueryResultMap["library.get"]>("library.get"),
    myProgressForBook: q<QueryResultMap["library.myProgressForBook"]>("library.myProgressForBook"),
    generateUploadUrl: m("library.generateUploadUrl"),
    createDocument: m("library.createDocument"),
    issueToken: m("library.issueToken"),
    updateDocument: m("library.updateDocument"),
    removeDocument: m("library.removeDocument"),
    saveProgress: m("library.saveProgress"),
    completeDocument: m("library.completeDocument"),
  },
  profiles: {
    overview: q<QueryResultMap["profiles.overview"]>("profiles.overview"),
    updateProfile: m("profiles.updateProfile"),
  },
  stats: { home: q<QueryResultMap["stats.home"]>("stats.home"), statsPage: q<QueryResultMap["stats.statsPage"]>("stats.statsPage") },
  sessions: { checkIn: m("sessions.checkIn") },
};
