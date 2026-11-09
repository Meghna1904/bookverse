import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { householdMembers, inviteCode } from "./lib";

export const bootstrap = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return { signedIn: false as const };
    const credential = await ctx.db
      .query("pinCredentials")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    if (!credential) return { signedIn: false as const };
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    const user = await ctx.db.get(userId);
    if (!profile) {
      return {
        signedIn: true as const,
        hasHousehold: false as const,
        me: null,
        user: { name: user?.name, email: user?.email },
      };
    }
    const household = await ctx.db.get(profile.householdId);
    if (!household) {
      return { signedIn: true as const, hasHousehold: false as const, me: null };
    }
    const profiles = await householdMembers(ctx, household._id);
    const members = await Promise.all(
      profiles.map(async (member) => ({
        userId: member.userId,
        profileId: member._id,
        displayName: member.displayName,
        bio: member.bio ?? "",
        avatarUrl: member.avatarStorageId
          ? await ctx.storage.getUrl(member.avatarStorageId)
          : (await ctx.db.get(member.userId))?.image ?? null,
        favoriteGenres: member.favoriteGenres,
        languages: member.languages,
        shareActivity: member.shareActivity,
        isSample: member.isSample ?? false,
        joinedAt: member.joinedAt,
      })),
    );
    return {
      signedIn: true as const,
      hasHousehold: true as const,
      me: {
        userId,
        profileId: profile._id,
        displayName: profile.displayName,
        avatarUrl:
          members.find((m) => m.userId === userId)?.avatarUrl ??
          (profile.avatarStorageId
            ? await ctx.storage.getUrl(profile.avatarStorageId)
            : null),
      },
      household: {
        id: household._id,
        name: household.name,
        inviteCode: household.inviteCode,
        sampleSeededAt: household.sampleSeededAt ?? null,
      },
      members,
      hasPhoto: Boolean(profile.avatarStorageId),
    };
  },
});

export const createHousehold = mutation({
  args: { name: v.string(), displayName: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Please sign in to continue.");
    const existing = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    if (existing) throw new ConvexError("You already belong to a shared library.");
    const displayName = args.displayName.trim().slice(0, 60) || "Reader";
    const now = Date.now();
    const householdId = await ctx.db.insert("households", {
      name: args.name.trim().slice(0, 80) || "Our BookVerse",
      inviteCode: inviteCode(),
      createdBy: userId,
      createdAt: now,
    });
    await ctx.db.insert("profiles", {
      userId,
      householdId,
      displayName,
      bio: undefined,
      favoriteGenres: [],
      languages: ["English"],
      shareActivity: true,
      joinedAt: now,
    });
    return householdId;
  },
});

export const joinHousehold = mutation({
  args: { code: v.string(), displayName: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Please sign in to continue.");
    const existing = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    if (existing) throw new ConvexError("You already belong to a shared library.");
    const household = await ctx.db
      .query("households")
      .withIndex("by_invite", (q) => q.eq("inviteCode", args.code.trim().toUpperCase()))
      .unique();
    if (!household) throw new ConvexError("That invitation code was not found.");
    const members = await householdMembers(ctx, household._id);
    if (members.length >= 2) {
      throw new ConvexError("This shared library already has two readers.");
    }
    await ctx.db.insert("profiles", {
      userId,
      householdId: household._id,
      displayName: args.displayName.trim().slice(0, 60) || "Reader Two",
      bio: undefined,
      favoriteGenres: [],
      languages: ["English"],
      shareActivity: true,
      joinedAt: Date.now(),
    });
    return household._id;
  },
});

export const renameLibrary = mutation({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Please sign in to continue.");
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    if (!profile) throw new ConvexError("No shared library yet.");
    await ctx.db.patch(profile.householdId, {
      name: args.name.trim().slice(0, 80) || "Our BookVerse",
    });
    return true;
  },
});

export const refreshInviteCode = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Please sign in to continue.");
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    if (!profile) throw new ConvexError("No shared library yet.");
    const code = inviteCode();
    await ctx.db.patch(profile.householdId, { inviteCode: code });
    return code;
  },
});

export const saveAvatar = mutation({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Please sign in to continue.");
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    if (!profile) throw new ConvexError("No shared library yet.");
    const meta = await ctx.storage.getMetadata(args.storageId);
    if (!meta) throw new ConvexError("That image could not be found.");
    if (meta.size > 4 * 1024 * 1024) throw new ConvexError("Please use an image under 4 MB.");
    if (!(meta.contentType ?? "").startsWith("image/")) {
      throw new ConvexError("Please upload an image file.");
    }
    await ctx.db.patch(profile._id, { avatarStorageId: args.storageId });
    return true;
  },
});
