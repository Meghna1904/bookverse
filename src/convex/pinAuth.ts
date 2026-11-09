import { getAuthUserId, retrieveAccount } from "@convex-dev/auth/server";
import { ConvexError, v } from "convex/values";
import { makeFunctionReference } from "convex/server";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import {
  action,
  internalAction,
  internalMutation,
  internalQuery,
  query,
} from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { hashPin } from "./auth/pinCrypto";

const ROOM_SLUG = "our-bookverse";
const ROOM_NAME = "Our BookVerse";
const PIN_PATTERN = /^\d{6}$/;
const MAX_FAILURES = 5;
const LOCK_MS = 15 * 60 * 1000;
const WINDOW_MS = 15 * 60 * 1000;

const setupSnapshotRef = makeFunctionReference<
  "query",
  Record<string, never>,
  {
    householdId: Id<"households">;
    ownerUserId: Id<"users">;
    readers: Array<{
      slot: "whiskeyy" | "matildaa";
      userId: Id<"users">;
      displayName: string;
    }>;
  } | null
>("pinAuth:setupSnapshot");

const saveRoomSetupRef = makeFunctionReference<
  "mutation",
  {
    householdId: Id<"households">;
    ownerUserId: Id<"users">;
    readers: Array<{
      slot: "whiskeyy" | "matildaa";
      userId: Id<"users">;
      displayName: string;
      providerAccountId: string;
      pinHash: string;
    }>;
  },
  {
    roomId: Id<"rooms">;
    readers: Array<{ slot: string; displayName: string }>;
  }
>("pinAuth:saveRoomSetup");

const READER_SLOTS = ["whiskeyy", "matildaa"] as const;
type ReaderSlot = (typeof READER_SLOTS)[number];

function normalizeSlot(value: string): ReaderSlot | null {
  const slot = value.trim().toLowerCase();
  return READER_SLOTS.includes(slot as ReaderSlot) ? (slot as ReaderSlot) : null;
}

function hiddenAccountId(slot: ReaderSlot) {
  return `reader-${slot}@room.ourbookverse.internal`;
}

function validateNewPin(pin: string) {
  if (!PIN_PATTERN.test(pin)) {
    throw new ConvexError("Choose a six-digit PIN.");
  }
  if (/^(\d)\1{5}$/.test(pin)) {
    throw new ConvexError("Choose a PIN that is not six repeated digits.");
  }
}

function pinAttemptKey(scope: string, slot: string) {
  return `${scope}:${slot}`;
}

async function attemptDoc(ctx: QueryCtx | MutationCtx, key: string) {
  return await ctx.db
    .query("pinAttempts")
    .withIndex("by_key", (q) => q.eq("key", key))
    .unique();
}

function recoveryKeyMatches(provided: string, expected: string) {
  if (!provided || provided.length !== expected.length) return false;
  let difference = 0;
  for (let index = 0; index < provided.length; index += 1) {
    difference |= provided.charCodeAt(index) ^ expected.charCodeAt(index);
  }
  return difference === 0;
}

/** Public reader cards. No account identifiers or PIN material is exposed. */
export const room = query({
  args: {},
  handler: async (ctx) => {
    const roomDoc = await ctx.db
      .query("rooms")
      .withIndex("by_slug", (q) => q.eq("slug", ROOM_SLUG))
      .unique();
    if (!roomDoc) {
      return {
        name: ROOM_NAME,
        slug: ROOM_SLUG,
        readers: [
          { slot: "whiskeyy", displayName: "Whiskeyy", avatarUrl: null },
          { slot: "matildaa", displayName: "Matildaa", avatarUrl: null },
        ],
      };
    }

    const readers = await Promise.all(
      roomDoc.readers.map(async (reader) => {
        const profile = await ctx.db
          .query("profiles")
          .withIndex("by_user", (q) => q.eq("userId", reader.userId))
          .unique();
        const user = await ctx.db.get(reader.userId);
        const avatarUrl = profile?.avatarStorageId
          ? await ctx.storage.getUrl(profile.avatarStorageId)
          : (user?.image ?? null);
        return {
          slot: reader.slot,
          displayName: reader.displayName,
          avatarUrl,
        };
      }),
    );

    return { name: roomDoc.name, slug: roomDoc.slug, readers };
  },
});

/** Used by RequireAuth to reject old email or guest sessions. */
export const access = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return { allowed: false as const, slot: null };
    const credential = await ctx.db
      .query("pinCredentials")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    return credential
      ? { allowed: true as const, slot: credential.slot }
      : { allowed: false as const, slot: null };
  },
});

export const readerForAuth = internalQuery({
  args: { slot: v.string() },
  handler: async (ctx, args) => {
    const slot = normalizeSlot(args.slot);
    if (!slot) return null;
    const roomDoc = await ctx.db
      .query("rooms")
      .withIndex("by_slug", (q) => q.eq("slug", ROOM_SLUG))
      .unique();
    const reader = roomDoc?.readers.find((entry) => entry.slot === slot);
    return reader
      ? {
          userId: reader.userId,
          displayName: reader.displayName,
          providerAccountId: reader.providerAccountId,
        }
      : null;
  },
});

export const credentialForUser = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const credential = await ctx.db
      .query("pinCredentials")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .unique();
    if (!credential) return null;
    const roomDoc = await ctx.db.get(credential.roomId);
    const reader = roomDoc?.readers.find((entry) => entry.userId === args.userId);
    return reader
      ? {
          userId: args.userId,
          slot: credential.slot,
          displayName: reader.displayName,
          providerAccountId: reader.providerAccountId,
          ownerUserId: roomDoc?.ownerUserId ?? null,
        }
      : null;
  },
});

export const targetForSlot = internalQuery({
  args: { slot: v.string() },
  handler: async (ctx, args) => {
    const slot = normalizeSlot(args.slot);
    if (!slot) return null;
    const roomDoc = await ctx.db
      .query("rooms")
      .withIndex("by_slug", (q) => q.eq("slug", ROOM_SLUG))
      .unique();
    const reader = roomDoc?.readers.find((entry) => entry.slot === slot);
    return reader
      ? {
          userId: reader.userId,
          slot,
          displayName: reader.displayName,
          providerAccountId: reader.providerAccountId,
        }
      : null;
  },
});

export const beginAttempt = internalMutation({
  args: {
    slot: v.string(),
    scope: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const key = pinAttemptKey(args.scope ?? "pin", args.slot);
    const doc = await attemptDoc(ctx, key);
    const now = Date.now();
    return {
      lockedForMs: doc && doc.lockedUntil > now ? doc.lockedUntil - now : 0,
    };
  },
});

export const recordFailure = internalMutation({
  args: {
    slot: v.string(),
    scope: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const key = pinAttemptKey(args.scope ?? "pin", args.slot);
    const now = Date.now();
    const doc = await attemptDoc(ctx, key);
    const windowExpired = !doc || now - doc.windowStartedAt > WINDOW_MS;
    const failures = (windowExpired ? 0 : doc.failures) + 1;
    const lockedUntil = failures >= MAX_FAILURES ? now + LOCK_MS : 0;
    if (doc) {
      await ctx.db.patch(doc._id, {
        failures,
        windowStartedAt: windowExpired ? now : doc.windowStartedAt,
        lockedUntil,
        lastAttemptAt: now,
      });
    } else {
      await ctx.db.insert("pinAttempts", {
        key,
        failures,
        windowStartedAt: now,
        lockedUntil,
        lastAttemptAt: now,
      });
    }
    return {
      lockedForMs: lockedUntil ? lockedUntil - now : 0,
      attemptsRemaining: Math.max(0, MAX_FAILURES - failures),
    };
  },
});

export const recordSuccess = internalMutation({
  args: {
    slot: v.string(),
    scope: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const doc = await attemptDoc(ctx, pinAttemptKey(args.scope ?? "pin", args.slot));
    if (doc) await ctx.db.delete(doc._id);
  },
});

export const setupSnapshot = internalQuery({
  args: {},
  handler: async (ctx) => {
    const existingRoom = await ctx.db
      .query("rooms")
      .withIndex("by_slug", (q) => q.eq("slug", ROOM_SLUG))
      .unique();

    let household: Doc<"households"> | null = existingRoom
      ? await ctx.db.get(existingRoom.householdId)
      : null;

    if (!household) {
      const households = await ctx.db.query("households").collect();
      const candidates: Array<{
        household: Doc<"households">;
        profiles: Doc<"profiles">[];
      }> = [];
      for (const candidate of households) {
        const profiles = await ctx.db
          .query("profiles")
          .withIndex("by_household", (q) => q.eq("householdId", candidate._id))
          .collect();
        if (profiles.length >= 2) candidates.push({ household: candidate, profiles });
      }
      candidates.sort((a, b) => b.household.createdAt - a.household.createdAt);
      household = candidates[0]?.household ?? null;
    }

    if (!household) return null;

    let profiles = await ctx.db
      .query("profiles")
      .withIndex("by_household", (q) => q.eq("householdId", household!._id))
      .collect();
    profiles.sort((a, b) => a.joinedAt - b.joinedAt);
    const first =
      profiles.find((profile) => /whisk/i.test(profile.displayName)) ??
      profiles.find((profile) => !profile.isSample) ??
      profiles[0];
    const second =
      profiles.find(
        (profile) => profile.userId !== first?.userId && profile.isSample,
      ) ?? profiles.find((profile) => profile.userId !== first?.userId);

    if (!first || !second) return null;

    return {
      householdId: household._id,
      ownerUserId: first.userId,
      readers: [
        { slot: "whiskeyy" as const, userId: first.userId, displayName: "Whiskeyy" },
        { slot: "matildaa" as const, userId: second.userId, displayName: "Matildaa" },
      ],
    };
  },
});

export const saveRoomSetup = internalMutation({
  args: {
    householdId: v.id("households"),
    ownerUserId: v.id("users"),
    readers: v.array(
      v.object({
        slot: v.string(),
        userId: v.id("users"),
        displayName: v.string(),
        providerAccountId: v.string(),
        pinHash: v.string(),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const existingRoom = await ctx.db
      .query("rooms")
      .withIndex("by_slug", (q) => q.eq("slug", ROOM_SLUG))
      .unique();

    const readerPayload = args.readers.map((reader) => ({
      slot: reader.slot,
      userId: reader.userId,
      displayName: reader.displayName,
      providerAccountId: reader.providerAccountId,
    }));

    let roomId: Id<"rooms">;
    if (existingRoom) {
      roomId = existingRoom._id;
      await ctx.db.patch(roomId, {
        name: ROOM_NAME,
        householdId: args.householdId,
        ownerUserId: args.ownerUserId,
        readers: readerPayload,
        updatedAt: now,
      });
    } else {
      roomId = await ctx.db.insert("rooms", {
        slug: ROOM_SLUG,
        name: ROOM_NAME,
        householdId: args.householdId,
        ownerUserId: args.ownerUserId,
        readers: readerPayload,
        createdAt: now,
        updatedAt: now,
      });
    }

    for (const reader of args.readers) {
      const profile = await ctx.db
        .query("profiles")
        .withIndex("by_user", (q) => q.eq("userId", reader.userId))
        .unique();
      if (profile) {
        await ctx.db.patch(profile._id, {
          displayName: reader.displayName,
          isSample: false,
        });
      }
      const user = await ctx.db.get(reader.userId);
      if (user) {
        await ctx.db.patch(reader.userId, {
          name: reader.displayName,
          isAnonymous: false,
        });
      }

      const account = await ctx.db
        .query("authAccounts")
        .withIndex("providerAndAccountId", (q) =>
          q.eq("provider", "pin").eq("providerAccountId", reader.providerAccountId),
        )
        .unique();
      if (account) {
        if (account.userId !== reader.userId) {
          throw new ConvexError("That reader account is already linked to someone else.");
        }
        await ctx.db.patch(account._id, { secret: reader.pinHash });
      } else {
        await ctx.db.insert("authAccounts", {
          userId: reader.userId,
          provider: "pin",
          providerAccountId: reader.providerAccountId,
          secret: reader.pinHash,
        });
      }

      const credential = await ctx.db
        .query("pinCredentials")
        .withIndex("by_user", (q) => q.eq("userId", reader.userId))
        .unique();
      if (credential) {
        await ctx.db.patch(credential._id, {
          roomId,
          slot: reader.slot,
          pinUpdatedAt: now,
        });
      } else {
        await ctx.db.insert("pinCredentials", {
          userId: reader.userId,
          roomId,
          slot: reader.slot,
          pinUpdatedAt: now,
        });
      }

      const sessions = await ctx.db
        .query("authSessions")
        .withIndex("userId", (q) => q.eq("userId", reader.userId))
        .collect();
      for (const session of sessions) await ctx.db.delete(session._id);

      for (const scope of ["pin", "recovery"]) {
        const attempt = await attemptDoc(ctx, pinAttemptKey(scope, reader.slot));
        if (attempt) await ctx.db.delete(attempt._id);
      }
    }

    await ctx.db.patch(args.householdId, { name: ROOM_NAME });
    return {
      roomId,
      readers: args.readers.map((reader) => ({
        slot: reader.slot,
        displayName: reader.displayName,
      })),
    };
  },
});

/** One-time internal provisioning; run from the Convex CLI. */
export const bootstrapRoom = internalAction({
  args: {
    whiskeyPin: v.string(),
    matildaaPin: v.string(),
  },
  handler: async (ctx, args) => {
    validateNewPin(args.whiskeyPin);
    validateNewPin(args.matildaaPin);

    const snapshot = await ctx.runQuery(setupSnapshotRef, {});
    if (!snapshot) {
      throw new ConvexError("Could not find the existing two-reader household.");
    }

    const whiskeyHash = await hashPin(args.whiskeyPin);
    const matildaaHash = await hashPin(args.matildaaPin);

    return await ctx.runMutation(saveRoomSetupRef, {
      householdId: snapshot.householdId,
      ownerUserId: snapshot.ownerUserId,
      readers: snapshot.readers.map((reader) => ({
        ...reader,
        providerAccountId: hiddenAccountId(reader.slot),
        pinHash: reader.slot === "whiskeyy" ? whiskeyHash : matildaaHash,
      })),
    });
  },
});

export const replacePin = internalMutation({
  args: {
    userId: v.id("users"),
    slot: v.string(),
    pinHash: v.string(),
    invalidateSessions: v.boolean(),
  },
  handler: async (ctx, args) => {
    const credential = await ctx.db
      .query("pinCredentials")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .unique();
    if (!credential) throw new ConvexError("That reader has no PIN yet.");

    const account = await ctx.db
      .query("authAccounts")
      .withIndex("userIdAndProvider", (q) =>
        q.eq("userId", args.userId).eq("provider", "pin"),
      )
      .unique();
    if (!account) throw new ConvexError("That reader's PIN account is missing.");

    await ctx.db.patch(account._id, { secret: args.pinHash });
    await ctx.db.patch(credential._id, {
      slot: args.slot,
      pinUpdatedAt: Date.now(),
    });

    if (args.invalidateSessions) {
      const sessions = await ctx.db
        .query("authSessions")
        .withIndex("userId", (q) => q.eq("userId", args.userId))
        .collect();
      for (const session of sessions) await ctx.db.delete(session._id);
    }
  },
});

export const changeMyPin = action({
  args: {
    currentPin: v.string(),
    newPin: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Please enter the room first.");
    validateNewPin(args.newPin);

    const credential = await ctx.runQuery(internal.pinAuth.credentialForUser, {
      userId,
    });
    if (!credential) throw new ConvexError("Your PIN account could not be found.");

    const gate = await ctx.runMutation(internal.pinAuth.beginAttempt, {
      slot: credential.slot,
    });
    if (gate.lockedForMs > 0) {
      throw new ConvexError("Too many tries. Please wait before trying again.");
    }

    const account = await retrievePinAccount(
      ctx,
      credential.providerAccountId,
      args.currentPin,
    );
    if (!account) {
      const failed = await ctx.runMutation(internal.pinAuth.recordFailure, {
        slot: credential.slot,
      });
      throw new ConvexError(
        failed.lockedForMs > 0
          ? "Too many tries. This reader is locked for 15 minutes."
          : "Your current PIN is incorrect.",
      );
    }

    await ctx.runMutation(internal.pinAuth.recordSuccess, {
      slot: credential.slot,
    });
    const pinHash = await hashPin(args.newPin);
    await ctx.runMutation(internal.pinAuth.replacePin, {
      userId,
      slot: credential.slot,
      pinHash,
      invalidateSessions: false,
    });
    return { ok: true };
  },
});

export const ownerResetPin = action({
  args: {
    slot: v.string(),
    newPin: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Please enter the room first.");
    validateNewPin(args.newPin);

    const credential = await ctx.runQuery(internal.pinAuth.credentialForUser, {
      userId,
    });
    if (!credential) throw new ConvexError("Your PIN account could not be found.");
    if (credential.ownerUserId !== userId) {
      throw new ConvexError("Only the room owner can reset the other reader's PIN.");
    }

    const target = await ctx.runQuery(internal.pinAuth.targetForSlot, {
      slot: args.slot,
    });
    if (!target) throw new ConvexError("That reader is not in this room.");
    if (target.userId === userId) {
      throw new ConvexError("Use Change my PIN for your own PIN.");
    }

    const pinHash = await hashPin(args.newPin);
    await ctx.runMutation(internal.pinAuth.replacePin, {
      userId: target.userId,
      slot: target.slot,
      pinHash,
      invalidateSessions: true,
    });
    await ctx.runMutation(internal.pinAuth.recordSuccess, {
      slot: target.slot,
    });
    return { ok: true };
  },
});

/** Recovery for a forgotten owner PIN. Requires BOOKVERSE_RECOVERY_KEY. */
export const recoverPin = action({
  args: {
    slot: v.string(),
    recoveryKey: v.string(),
    newPin: v.string(),
  },
  handler: async (ctx, args) => {
    const expected = process.env.BOOKVERSE_RECOVERY_KEY?.trim();
    if (!expected) {
      throw new ConvexError("Room recovery is not configured on this deployment.");
    }
    validateNewPin(args.newPin);
    const target = await ctx.runQuery(internal.pinAuth.targetForSlot, {
      slot: args.slot,
    });
    if (!target) throw new ConvexError("That reader is not in this room.");

    const gate = await ctx.runMutation(internal.pinAuth.beginAttempt, {
      slot: "recovery",
      scope: "recovery",
    });
    if (gate.lockedForMs > 0) {
      throw new ConvexError("Too many recovery tries. Please wait 15 minutes.");
    }

    if (!recoveryKeyMatches(args.recoveryKey.trim(), expected)) {
      const failed = await ctx.runMutation(internal.pinAuth.recordFailure, {
        slot: "recovery",
        scope: "recovery",
      });
      throw new ConvexError(
        failed.lockedForMs > 0
          ? "Too many recovery tries. Please wait 15 minutes."
          : "That recovery key is not correct.",
      );
    }

    await ctx.runMutation(internal.pinAuth.recordSuccess, {
      slot: "recovery",
      scope: "recovery",
    });
    const pinHash = await hashPin(args.newPin);
    await ctx.runMutation(internal.pinAuth.replacePin, {
      userId: target.userId,
      slot: target.slot,
      pinHash,
      invalidateSessions: true,
    });
    await ctx.runMutation(internal.pinAuth.recordSuccess, {
      slot: target.slot,
    });
    return { ok: true };
  },
});

async function retrievePinAccount(
  ctx: unknown,
  providerAccountId: string,
  pin: string,
) {
  try {
    return await retrieveAccount(
      ctx as unknown as Parameters<typeof retrieveAccount>[0],
      {
        provider: "pin",
        account: { id: providerAccountId, secret: pin },
      },
    );
  } catch {
    return null;
  }
}
