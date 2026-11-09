import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { Infer, v } from "convex/values";

// default user roles. can add / remove based on the project as needed
export const ROLES = {
  ADMIN: "admin",
  USER: "user",
  MEMBER: "member",
} as const;

export const roleValidator = v.union(
  v.literal(ROLES.ADMIN),
  v.literal(ROLES.USER),
  v.literal(ROLES.MEMBER),
);
export type Role = Infer<typeof roleValidator>;

export const readingModeValidator = v.union(
  v.literal("individual"),
  v.literal("together"),
);

export const recordStatusValidator = v.union(
  v.literal("reading"),
  v.literal("completed"),
);

export const bookSourceValidator = v.union(
  v.literal("physical"),
  v.literal("digital"),
);

export const priorityValidator = v.union(
  v.literal("someday"),
  v.literal("soon"),
  v.literal("next"),
);

export const visibilityValidator = v.union(
  v.literal("private"),
  v.literal("shared"),
);

const schema = defineSchema(
  {
    // default auth tables using convex auth.
    ...authTables, // do not remove or modify

    // the users table is the default users table that is brought in by the authTables
    users: defineTable({
      name: v.optional(v.string()), // name of the user. do not remove
      image: v.optional(v.string()), // image of the user. do not remove
      email: v.optional(v.string()), // email of the user. do not remove
      emailVerificationTime: v.optional(v.number()), // email verification time. do not remove
      isAnonymous: v.optional(v.boolean()), // is user anonymous. do not remove

      role: v.optional(roleValidator), // role of the user. do not remove
    }).index("email", ["email"]), // index for the email. do not remove or modify

    /** The single private room that owns the two PIN-protected reader identities. */
    rooms: defineTable({
      slug: v.string(),
      name: v.string(),
      householdId: v.id("households"),
      ownerUserId: v.id("users"),
      readers: v.array(
        v.object({
          slot: v.string(),
          userId: v.id("users"),
          displayName: v.string(),
          providerAccountId: v.string(),
        }),
      ),
      createdAt: v.number(),
      updatedAt: v.number(),
    }).index("by_slug", ["slug"]),

    /** PIN access metadata. The hash itself lives in authAccounts.secret. */
    pinCredentials: defineTable({
      userId: v.id("users"),
      roomId: v.id("rooms"),
      slot: v.string(),
      pinUpdatedAt: v.number(),
    })
      .index("by_user", ["userId"])
      .index("by_room_slot", ["roomId", "slot"]),

    /** Per-reader throttling for PIN and recovery attempts. */
    pinAttempts: defineTable({
      key: v.string(),
      failures: v.number(),
      windowStartedAt: v.number(),
      lockedUntil: v.number(),
      lastAttemptAt: v.number(),
    }).index("by_key", ["key"]),

    /** A shared library space for exactly two readers. */
    households: defineTable({
      name: v.string(),
      inviteCode: v.string(),
      createdBy: v.id("users"),
      createdAt: v.number(),
      sampleSeededAt: v.optional(v.number()),
    }).index("by_invite", ["inviteCode"]),

    /** Reader identity inside a household. */
    profiles: defineTable({
      userId: v.id("users"),
      householdId: v.id("households"),
      displayName: v.string(),
      bio: v.optional(v.string()),
      avatarStorageId: v.optional(v.id("_storage")),
      favoriteGenres: v.array(v.string()),
      languages: v.array(v.string()),
      shareActivity: v.boolean(),
      isSample: v.optional(v.boolean()),
      joinedAt: v.number(),
    })
      .index("by_user", ["userId"])
      .index("by_household", ["householdId"]),

    /** One central record per book per household. Never duplicate a book. */
    books: defineTable({
      householdId: v.id("households"),
      title: v.string(),
      author: v.string(),
      isbn: v.optional(v.string()),
      description: v.optional(v.string()),
      coverUrl: v.optional(v.string()),
      coverStorageId: v.optional(v.id("_storage")),
      genre: v.optional(v.string()),
      language: v.optional(v.string()),
      pageCount: v.optional(v.number()),
      publisher: v.optional(v.string()),
      publishedYear: v.optional(v.number()),
      series: v.optional(v.string()),
      externalRef: v.optional(v.string()),
      format: v.optional(v.string()),
      /** Optional reader-chosen spine colour for the physical shelf. */
      spineColor: v.optional(v.string()),
      isSample: v.boolean(),
      createdBy: v.id("users"),
      createdAt: v.number(),
      discoveredAt: v.optional(v.number()),
    }).index("by_household", ["householdId"]),

    /** Reader-specific progress, rating and review for a central book. */
    readingRecords: defineTable({
      householdId: v.id("households"),
      bookId: v.id("books"),
      readerId: v.id("users"),
      mode: readingModeValidator,
      status: recordStatusValidator,
      source: bookSourceValidator,
      documentId: v.optional(v.id("libraryDocuments")),
      startDate: v.number(),
      completionDate: v.optional(v.number()),
      currentPage: v.number(),
      rating: v.optional(v.number()),
      review: v.optional(v.string()),
      notes: v.optional(v.string()),
      isSample: v.boolean(),
      createdAt: v.number(),
      updatedAt: v.number(),
    })
      .index("by_household", ["householdId"])
      .index("by_book", ["bookId"])
      .index("by_reader", ["readerId"])
      .index("by_household_status", ["householdId", "status"]),

    /** Books waiting to be read. Separate from reading records. */
    wishlistItems: defineTable({
      householdId: v.id("households"),
      bookId: v.id("books"),
      readerId: v.id("users"),
      priority: priorityValidator,
      note: v.optional(v.string()),
      isSample: v.boolean(),
      addedAt: v.number(),
    })
      .index("by_household", ["householdId"])
      .index("by_book", ["bookId"])
      .index("by_reader", ["readerId"]),

    /** Uploaded PDFs. Visibility is enforced in every query and HTTP route. */
    libraryDocuments: defineTable({
      householdId: v.id("households"),
      bookId: v.optional(v.id("books")),
      ownerId: v.id("users"),
      title: v.string(),
      author: v.optional(v.string()),
      description: v.optional(v.string()),
      fileName: v.string(),
      storageId: v.id("_storage"),
      coverStorageId: v.optional(v.id("_storage")),
      mimeType: v.string(),
      size: v.number(),
      totalPages: v.number(),
      visibility: visibilityValidator,
      isSample: v.boolean(),
      createdAt: v.number(),
      updatedAt: v.number(),
    })
      .index("by_household", ["householdId"])
      .index("by_owner", ["ownerId"]),

    documentProgress: defineTable({
      documentId: v.id("libraryDocuments"),
      householdId: v.id("households"),
      readerId: v.id("users"),
      lastPage: v.number(),
      totalPages: v.number(),
      minutes: v.number(),
      completedAt: v.optional(v.number()),
      updatedAt: v.number(),
    })
      .index("by_document", ["documentId"])
      .index("by_document_reader", ["documentId", "readerId"])
      .index("by_reader", ["readerId"]),

    /** Real reading activity. A day counts at 10 minutes or 5 pages. */
    readingSessions: defineTable({
      householdId: v.id("households"),
      readerId: v.id("users"),
      bookId: v.optional(v.id("books")),
      documentId: v.optional(v.id("libraryDocuments")),
      dayKey: v.string(),
      pages: v.number(),
      minutes: v.number(),
      source: bookSourceValidator,
      isSample: v.boolean(),
      createdAt: v.number(),
      updatedAt: v.number(),
    })
      .index("by_household", ["householdId"])
      .index("by_reader", ["readerId"])
      .index("by_household_day", ["householdId", "dayKey"]),

    activity: defineTable({
      householdId: v.id("households"),
      readerId: v.id("users"),
      type: v.string(),
      bookId: v.optional(v.id("books")),
      documentId: v.optional(v.id("libraryDocuments")),
      title: v.string(),
      detail: v.optional(v.string()),
      isSample: v.boolean(),
      createdAt: v.number(),
    }).index("by_household", ["householdId"]),

    /** Short-lived, reader-bound tokens for streaming a private PDF. */
    pdfGrants: defineTable({
      token: v.string(),
      documentId: v.id("libraryDocuments"),
      readerId: v.id("users"),
      expiresAt: v.number(),
    }).index("by_token", ["token"]),
  },
  {
    schemaValidation: false,
  },
);

export default schema;
