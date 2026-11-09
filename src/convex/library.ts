import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import {
  canAccessDocument,
  findOrCreateBook,
  logActivity,
  MAX_FILE_BYTES,
  randomToken,
  requireViewer,
  safeDayKey,
} from "./lib";

const visibility = v.union(v.literal("private"), v.literal("shared"));

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireViewer(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

export const createDocument = mutation({
  args: {
    storageId: v.id("_storage"),
    coverStorageId: v.optional(v.id("_storage")),
    fileName: v.string(),
    title: v.string(),
    author: v.optional(v.string()),
    description: v.optional(v.string()),
    totalPages: v.number(),
    visibility,
    coverUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const viewer = await requireViewer(ctx);
    const file = await ctx.storage.getMetadata(args.storageId);
    if (!file) throw new ConvexError("The uploaded file could not be read.");
    if (file.size > MAX_FILE_BYTES) {
      throw new ConvexError("PDFs must be 40 MB or smaller.");
    }
    const looksLikePdf =
      file.contentType === "application/pdf" ||
      args.fileName.toLowerCase().endsWith(".pdf");
    if (!looksLikePdf) throw new ConvexError("Only PDF files can be added to the library.");
    if (!Number.isFinite(args.totalPages) || args.totalPages < 1) {
      throw new ConvexError("That PDF does not appear to have readable pages.");
    }
    const title = args.title.trim().slice(0, 240);
    if (!title) throw new ConvexError("Give the document a title.");

    const book = await findOrCreateBook(
      ctx,
      viewer.household._id,
      viewer.userId,
      {
        title,
        author: args.author?.trim() || "Unknown author",
        description: args.description,
        coverUrl: args.coverUrl,
        pageCount: Math.min(args.totalPages, 20000),
        format: "digital",
      },
    );
    if (args.coverStorageId && !book.coverStorageId) {
      await ctx.db.patch(book._id, { coverStorageId: args.coverStorageId });
    }
    const now = Date.now();
    const documentId = await ctx.db.insert("libraryDocuments", {
      householdId: viewer.household._id,
      bookId: book._id,
      ownerId: viewer.userId,
      title,
      author: args.author?.trim().slice(0, 160),
      description: args.description?.slice(0, 2000),
      fileName: args.fileName.slice(0, 200),
      storageId: args.storageId,
      coverStorageId: args.coverStorageId,
      mimeType: "application/pdf",
      size: file.size,
      totalPages: Math.min(Math.round(args.totalPages), 20000),
      visibility: args.visibility,
      isSample: false,
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.insert("documentProgress", {
      documentId,
      householdId: viewer.household._id,
      readerId: viewer.userId,
      lastPage: 1,
      totalPages: Math.min(Math.round(args.totalPages), 20000),
      minutes: 0,
      updatedAt: now,
    });
    // A private upload must not surface its title in the shared activity feed.
    if (args.visibility === "shared") {
      await logActivity(ctx, {
        householdId: viewer.household._id,
        readerId: viewer.userId,
        type: "upload",
        title,
        detail: "Uploaded to the Shared Library",
        bookId: book._id,
        documentId,
      });
    }
    return documentId;
  },
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    const viewer = await requireViewer(ctx);
    const [documents, progress, profiles] = await Promise.all([
      ctx.db
        .query("libraryDocuments")
        .withIndex("by_household", (q) => q.eq("householdId", viewer.household._id))
        .collect(),
      ctx.db
        .query("documentProgress")
        .withIndex("by_reader", (q) => q.eq("readerId", viewer.userId))
        .collect(),
      ctx.db
        .query("profiles")
        .withIndex("by_household", (q) => q.eq("householdId", viewer.household._id))
        .collect(),
    ]);
    const visible = documents.filter((doc) => canAccessDocument(doc, viewer));
    const items = await Promise.all(
      visible.map(async (doc) => {
        const myProgress = progress.find((row) => row.documentId === doc._id);
        const owner = profiles.find((profile) => profile.userId === doc.ownerId);
        const coverUrl = doc.coverStorageId
          ? await ctx.storage.getUrl(doc.coverStorageId)
          : null;
        return {
          document: doc,
          progress: myProgress ?? null,
          ownerName:
            doc.ownerId === viewer.userId ? "You" : (owner?.displayName ?? "Reader"),
          isMine: doc.ownerId === viewer.userId,
          coverUrl,
        };
      }),
    );
    items.sort((a, b) => b.document.updatedAt - a.document.updatedAt);
    return {
      items,
      readers: profiles.map((profile) => ({
        userId: profile.userId,
        displayName: profile.displayName,
        isSample: profile.isSample ?? false,
      })),
      myUserId: viewer.userId,
    };
  },
});

export const get = query({
  args: { documentId: v.id("libraryDocuments") },
  handler: async (ctx, args) => {
    const viewer = await requireViewer(ctx);
    const doc = await ctx.db.get(args.documentId);
    if (!doc || !canAccessDocument(doc, viewer)) return null;
    const progress = await ctx.db
      .query("documentProgress")
      .withIndex("by_document_reader", (q) =>
        q.eq("documentId", doc._id).eq("readerId", viewer.userId),
      )
      .unique();
    const coverUrl = doc.coverStorageId
      ? await ctx.storage.getUrl(doc.coverStorageId)
      : null;
    return {
      document: doc,
      progress,
      coverUrl,
      canEdit: doc.ownerId === viewer.userId,
    };
  },
});

/** Short-lived, reader-bound token so the PDF never gets a public URL. */
export const issueToken = mutation({
  args: { documentId: v.id("libraryDocuments") },
  handler: async (ctx, args) => {
    const viewer = await requireViewer(ctx);
    const doc = await ctx.db.get(args.documentId);
    if (!doc || !canAccessDocument(doc, viewer)) {
      throw new ConvexError("This document is not available to you.");
    }
    const token = randomToken();
    const grants = await ctx.db.query("pdfGrants").collect();
    for (const grant of grants) {
      if (grant.expiresAt < Date.now()) await ctx.db.delete(grant._id);
    }
    await ctx.db.insert("pdfGrants", {
      token,
      documentId: doc._id,
      readerId: viewer.userId,
      expiresAt: Date.now() + 15 * 60 * 1000,
    });
    return token;
  },
});

export const updateDocument = mutation({
  args: {
    documentId: v.id("libraryDocuments"),
    title: v.optional(v.string()),
    author: v.optional(v.string()),
    description: v.optional(v.string()),
    visibility: v.optional(visibility),
    coverStorageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    const viewer = await requireViewer(ctx);
    const doc = await ctx.db.get(args.documentId);
    if (!doc || doc.householdId !== viewer.household._id) {
      throw new ConvexError("Document not found.");
    }
    if (doc.ownerId !== viewer.userId) {
      throw new ConvexError("Only the reader who uploaded a document can edit it.");
    }
    const patch: Partial<typeof doc> = { updatedAt: Date.now() };
    if (args.title !== undefined) patch.title = args.title.trim().slice(0, 240) || doc.title;
    if (args.author !== undefined) patch.author = args.author.trim().slice(0, 160) || undefined;
    if (args.description !== undefined) patch.description = args.description.slice(0, 2000);
    if (args.visibility !== undefined) patch.visibility = args.visibility;
    if (args.coverStorageId !== undefined) patch.coverStorageId = args.coverStorageId;
    await ctx.db.patch(doc._id, patch);
    if (patch.title || patch.author) {
      const book = doc.bookId ? await ctx.db.get(doc.bookId) : null;
      if (book) {
        await ctx.db.patch(book._id, {
          title: patch.title ?? book.title,
          author: patch.author ?? book.author,
        });
      }
    }
    return true;
  },
});

export const removeDocument = mutation({
  args: { documentId: v.id("libraryDocuments") },
  handler: async (ctx, args) => {
    const viewer = await requireViewer(ctx);
    const doc = await ctx.db.get(args.documentId);
    if (!doc || doc.householdId !== viewer.household._id) {
      throw new ConvexError("Document not found.");
    }
    if (doc.ownerId !== viewer.userId) {
      throw new ConvexError("Only the reader who uploaded a document can remove it.");
    }
    const progress = await ctx.db
      .query("documentProgress")
      .withIndex("by_document", (q) => q.eq("documentId", doc._id))
      .collect();
    for (const row of progress) await ctx.db.delete(row._id);
    const grants = await ctx.db.query("pdfGrants").collect();
    for (const grant of grants) {
      if (grant.documentId === doc._id) await ctx.db.delete(grant._id);
    }
    await ctx.db.delete(doc._id);
    await ctx.storage.delete(doc.storageId);
    if (doc.coverStorageId) await ctx.storage.delete(doc.coverStorageId);
    return true;
  },
});

/**
 * Save position + real reading activity. Only deltas sent by the reader count;
 * opening a PDF without turning pages or spending time records nothing.
 */
export const saveProgress = mutation({
  args: {
    documentId: v.id("libraryDocuments"),
    lastPage: v.number(),
    pagesRead: v.optional(v.number()),
    minutes: v.optional(v.number()),
    dayKey: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const viewer = await requireViewer(ctx);
    const doc = await ctx.db.get(args.documentId);
    if (!doc || !canAccessDocument(doc, viewer)) {
      throw new ConvexError("This document is not available to you.");
    }
    const now = Date.now();
    const lastPage = Math.max(1, Math.min(Math.round(args.lastPage), doc.totalPages));
    const progress = await ctx.db
      .query("documentProgress")
      .withIndex("by_document_reader", (q) =>
        q.eq("documentId", doc._id).eq("readerId", viewer.userId),
      )
      .unique();
    if (progress) {
      await ctx.db.patch(progress._id, {
        lastPage,
        totalPages: doc.totalPages,
        minutes: progress.minutes + Math.max(0, Math.min(args.minutes ?? 0, 120)),
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("documentProgress", {
        documentId: doc._id,
        householdId: viewer.household._id,
        readerId: viewer.userId,
        lastPage,
        totalPages: doc.totalPages,
        minutes: Math.max(0, Math.min(args.minutes ?? 0, 120)),
        updatedAt: now,
      });
    }
    await ctx.db.patch(doc._id, { updatedAt: now });

    const pages = Math.max(0, Math.min(Math.round(args.pagesRead ?? 0), 200));
    const minutes = Math.max(0, Math.min(args.minutes ?? 0, 120));
    if (pages > 0 || minutes > 0) {
      const key = safeDayKey(args.dayKey);
      const sessions = await ctx.db
        .query("readingSessions")
        .withIndex("by_household_day", (q) =>
          q.eq("householdId", viewer.household._id).eq("dayKey", key),
        )
        .collect();
      const existing = sessions.find(
        (session) =>
          session.readerId === viewer.userId && session.documentId === doc._id,
      );
      if (existing) {
        await ctx.db.patch(existing._id, {
          pages: existing.pages + pages,
          minutes: existing.minutes + minutes,
          updatedAt: now,
        });
      } else {
        await ctx.db.insert("readingSessions", {
          householdId: viewer.household._id,
          readerId: viewer.userId,
          documentId: doc._id,
          bookId: doc.bookId,
          dayKey: key,
          pages,
          minutes,
          source: "digital",
          isSample: false,
          createdAt: now,
          updatedAt: now,
        });
      }
      const pagesToday = (existing?.pages ?? 0) + pages;
      const minutesToday = (existing?.minutes ?? 0) + minutes;
      if (pagesToday >= 5 || minutesToday >= 10) {
        const dayStart = new Date();
        dayStart.setHours(0, 0, 0, 0);
        const feed = await ctx.db
          .query("activity")
          .withIndex("by_household", (q) => q.eq("householdId", viewer.household._id))
          .collect();
        const alreadyLogged = feed.some(
          (item) =>
            item.type === "pdf-session" &&
            item.documentId === doc._id &&
            item.readerId === viewer.userId &&
            item.createdAt >= dayStart.getTime(),
        );
        if (!alreadyLogged) {
          await logActivity(ctx, {
            householdId: viewer.household._id,
            readerId: viewer.userId,
            type: "pdf-session",
            title: doc.title,
            detail: `PDF reading session completed · ${pagesToday} pages · ${minutesToday} minutes`,
            bookId: doc.bookId,
            documentId: doc._id,
          });
        }
      }
    }
    return { lastPage };
  },
});

export const completeDocument = mutation({
  args: {
    documentId: v.id("libraryDocuments"),
    rating: v.number(),
    review: v.optional(v.string()),
    notes: v.optional(v.string()),
    completionDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const viewer = await requireViewer(ctx);
    const doc = await ctx.db.get(args.documentId);
    if (!doc || !canAccessDocument(doc, viewer)) {
      throw new ConvexError("This document is not available to you.");
    }
    if (args.rating < 1 || args.rating > 5) {
      throw new ConvexError("Choose a rating between one and five stars.");
    }
    const now = Date.now();
    const completionDate = args.completionDate ?? now;
    if (completionDate > now + 24 * 60 * 60 * 1000) {
      throw new ConvexError("The completion date cannot be in the future.");
    }
    const book = doc.bookId
      ? await ctx.db.get(doc.bookId)
      : await findOrCreateBook(
          ctx,
          viewer.household._id,
          viewer.userId,
          {
            title: doc.title,
            author: doc.author || "Unknown author",
            description: doc.description,
            pageCount: doc.totalPages,
            format: "digital",
          },
        );
    if (!book) throw new ConvexError("The shelf record could not be created.");
    if (!doc.bookId) await ctx.db.patch(doc._id, { bookId: book._id });

    const existing = (
      await ctx.db
        .query("readingRecords")
        .withIndex("by_book", (q) => q.eq("bookId", book._id))
        .collect()
    ).find((record) => record.readerId === viewer.userId);
    if (existing) {
      await ctx.db.patch(existing._id, {
        status: "completed",
        completionDate,
        currentPage: doc.totalPages,
        rating: args.rating,
        review: args.review?.slice(0, 4000),
        notes: args.notes?.slice(0, 2000),
        source: "digital",
        documentId: doc._id,
        mode: "individual",
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("readingRecords", {
        householdId: viewer.household._id,
        bookId: book._id,
        readerId: viewer.userId,
        mode: "individual",
        status: "completed",
        source: "digital",
        documentId: doc._id,
        startDate: now,
        completionDate,
        currentPage: doc.totalPages,
        rating: args.rating,
        review: args.review?.slice(0, 4000),
        notes: args.notes?.slice(0, 2000),
        isSample: false,
        createdAt: now,
        updatedAt: now,
      });
    }
    const progress = await ctx.db
      .query("documentProgress")
      .withIndex("by_document_reader", (q) =>
        q.eq("documentId", doc._id).eq("readerId", viewer.userId),
      )
      .unique();
    if (progress) {
      await ctx.db.patch(progress._id, {
        completedAt: completionDate,
        lastPage: doc.totalPages,
        updatedAt: now,
      });
    }
    await logActivity(ctx, {
      householdId: viewer.household._id,
      readerId: viewer.userId,
      type: "finished",
      title: doc.title,
      detail: "Finished a digital book",
      bookId: book._id,
      documentId: doc._id,
    });
    return book._id;
  },
});

export const myProgressForBook = query({
  args: { bookId: v.id("books") },
  handler: async (ctx, args) => {
    const viewer = await requireViewer(ctx);
    const docs = await ctx.db
      .query("libraryDocuments")
      .withIndex("by_household", (q) => q.eq("householdId", viewer.household._id))
      .collect();
    const visible = docs.filter(
      (doc) => doc.bookId === args.bookId && canAccessDocument(doc, viewer),
    );
    return visible;
  },
});
