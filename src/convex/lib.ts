import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";

export const DAY_MS = 24 * 60 * 60 * 1000;
export const STREAK_MINUTES = 10;
export const STREAK_PAGES = 5;
export const MAX_FILE_BYTES = 40 * 1024 * 1024;

export function dayKeyFrom(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

/** A local calendar day from the browser, validated to avoid wild dates. */
export function safeDayKey(input?: string): string {
  if (input && /^\d{4}-\d{2}-\d{2}$/.test(input)) {
    const parsed = Date.parse(`${input}T00:00:00Z`);
    if (!Number.isNaN(parsed)) return input;
  }
  return dayKeyFrom(Date.now());
}

export function normalize(value?: string | null): string {
  return (value ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function normalizeIsbn(value?: string | null): string {
  return (value ?? "").replace(/[^0-9Xx]/g, "").toUpperCase();
}

export function inviteCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  for (const byte of bytes) out += alphabet[byte % alphabet.length];
  return out;
}

export function randomToken(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function getViewer(ctx: QueryCtx | MutationCtx) {
  const userId = await getAuthUserId(ctx);
  if (!userId) return null;
  // A Convex Auth session alone is not enough: the reader must hold a room PIN.
  // This rejects legacy email and guest sessions at every data boundary.
  const credential = await ctx.db
    .query("pinCredentials")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .unique();
  if (!credential) return null;
  const profile = await ctx.db
    .query("profiles")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .unique();
  if (!profile) return { userId, profile: null, household: null };
  const household = await ctx.db.get(profile.householdId);
  return { userId, profile, household };
}

export type Viewer = {
  userId: Id<"users">;
  profile: Doc<"profiles">;
  household: Doc<"households">;
};

export async function requireViewer(
  ctx: QueryCtx | MutationCtx,
): Promise<Viewer> {
  const viewer = await getViewer(ctx);
  if (!viewer) throw new ConvexError("Please sign in to continue.");
  if (!viewer.profile || !viewer.household) {
    throw new ConvexError("Create or join a shared library first.");
  }
  return viewer as Viewer;
}

export async function householdMembers(ctx: QueryCtx | MutationCtx, householdId: Id<"households">) {
  const profiles = await ctx.db
    .query("profiles")
    .withIndex("by_household", (q) => q.eq("householdId", householdId))
    .collect();
  return profiles.sort((a, b) => a.joinedAt - b.joinedAt);
}

/** Only the owner may reach a private document; shared docs are household-wide. */
export function canAccessDocument(
  doc: Doc<"libraryDocuments">,
  viewer: Viewer,
): boolean {
  if (doc.householdId !== viewer.household._id) return false;
  if (doc.visibility === "shared") return true;
  return doc.ownerId === viewer.userId;
}

export function ratingAverage(ratings: Array<number | undefined>): number | null {
  const values = ratings.filter((r): r is number => typeof r === "number");
  if (!values.length) return null;
  return Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10;
}

export type DayTotals = { pages: number; minutes: number };

export function aggregateDays(
  sessions: Array<{ readerId: string; dayKey: string; pages: number; minutes: number }>,
): Map<string, Map<string, DayTotals>> {
  const byReader = new Map<string, Map<string, DayTotals>>();
  for (const session of sessions) {
    let days = byReader.get(session.readerId);
    if (!days) {
      days = new Map();
      byReader.set(session.readerId, days);
    }
    const current = days.get(session.dayKey) ?? { pages: 0, minutes: 0 };
    current.pages += session.pages;
    current.minutes += session.minutes;
    days.set(session.dayKey, current);
  }
  return byReader;
}

export function qualifies(totals: DayTotals | undefined): boolean {
  if (!totals) return false;
  return totals.pages >= STREAK_PAGES || totals.minutes >= STREAK_MINUTES;
}

export function streakInfo(days: Map<string, DayTotals> | undefined) {
  const qualified = new Set<string>();
  if (days) {
    for (const [key, totals] of days) if (qualifies(totals)) qualified.add(key);
  }
  const sorted = [...qualified].sort();
  let best = 0;
  let run = 0;
  let previous: number | null = null;
  for (const key of sorted) {
    const time = Date.parse(`${key}T00:00:00Z`);
    run = previous !== null && Math.round((time - previous) / DAY_MS) === 1 ? run + 1 : 1;
    best = Math.max(best, run);
    previous = time;
  }

  const today = Date.parse(`${dayKeyFrom(Date.now())}T00:00:00Z`);
  let cursor = qualified.has(dayKeyFrom(today)) ? today : today - DAY_MS;
  let current = 0;
  while (qualified.has(dayKeyFrom(cursor))) {
    current += 1;
    cursor -= DAY_MS;
  }
  return {
    current,
    best: Math.max(best, current),
    totalDays: qualified.size,
    qualifiedDays: qualified,
  };
}

export async function logActivity(
  ctx: MutationCtx,
  input: {
    householdId: Id<"households">;
    readerId: Id<"users">;
    type: string;
    title: string;
    detail?: string;
    bookId?: Id<"books">;
    documentId?: Id<"libraryDocuments">;
    isSample?: boolean;
  },
) {
  await ctx.db.insert("activity", {
    householdId: input.householdId,
    readerId: input.readerId,
    type: input.type,
    title: input.title,
    detail: input.detail,
    bookId: input.bookId,
    documentId: input.documentId,
    isSample: input.isSample ?? false,
    createdAt: Date.now(),
  });
}

export type BookInput = {
  title: string;
  author: string;
  isbn?: string;
  description?: string;
  coverUrl?: string;
  genre?: string;
  language?: string;
  pageCount?: number;
  publisher?: string;
  publishedYear?: number;
  series?: string;
  externalRef?: string;
  format?: string;
};

/** Find the household's single record for a book, creating it if needed. */
export async function findOrCreateBook(
  ctx: MutationCtx,
  householdId: Id<"households">,
  userId: Id<"users">,
  input: BookInput,
  options: { isSample?: boolean; fromDiscover?: boolean } = {},
): Promise<Doc<"books">> {
  const title = input.title.trim().slice(0, 240);
  const author = (input.author || "Unknown author").trim().slice(0, 160);
  if (!title) throw new ConvexError("A book needs a title.");
  const isbn = normalizeIsbn(input.isbn);
  const books = await ctx.db
    .query("books")
    .withIndex("by_household", (q) => q.eq("householdId", householdId))
    .collect();
  const existing = books.find((book) => {
    if (isbn && normalizeIsbn(book.isbn) === isbn) return true;
    return (
      normalize(book.title) === normalize(title) &&
      normalize(book.author) === normalize(author)
    );
  });
  if (existing) {
    const patch: Partial<Doc<"books">> = {};
    if (!existing.coverUrl && input.coverUrl) patch.coverUrl = input.coverUrl;
    if (!existing.description && input.description) patch.description = input.description;
    if (!existing.genre && input.genre) patch.genre = input.genre;
    if (!existing.language && input.language) patch.language = input.language;
    if (!existing.pageCount && input.pageCount) patch.pageCount = input.pageCount;
    if (!existing.isbn && isbn) patch.isbn = isbn;
    if (!existing.publisher && input.publisher) patch.publisher = input.publisher;
    if (!existing.publishedYear && input.publishedYear) patch.publishedYear = input.publishedYear;
    if (!existing.series && input.series) patch.series = input.series;
    if (!existing.externalRef && input.externalRef) patch.externalRef = input.externalRef;
    if (Object.keys(patch).length) await ctx.db.patch(existing._id, patch);
    return existing;
  }
  const id = await ctx.db.insert("books", {
    householdId,
    title,
    author,
    isbn: isbn || undefined,
    description: input.description?.slice(0, 4000),
    coverUrl: input.coverUrl,
    genre: input.genre?.slice(0, 60),
    language: input.language?.slice(0, 60),
    pageCount: input.pageCount && input.pageCount > 0 ? Math.min(input.pageCount, 20000) : undefined,
    publisher: input.publisher?.slice(0, 120),
    publishedYear: input.publishedYear,
    series: input.series?.slice(0, 120),
    externalRef: input.externalRef,
    format: input.format,
    isSample: options.isSample ?? false,
    createdBy: userId,
    createdAt: Date.now(),
    discoveredAt: options.fromDiscover ? Date.now() : undefined,
  });
  const created = await ctx.db.get(id);
  return created!;
}

export function daysAgoKey(days: number): string {
  return dayKeyFrom(Date.now() - days * DAY_MS);
}
