import { v } from "convex/values";
import { internalQuery } from "./_generated/server";

/** Resolve a short-lived grant for the PDF streaming HTTP route. */
export const resolveGrant = internalQuery({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const grant = await ctx.db
      .query("pdfGrants")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();
    if (!grant) return null;
    if (grant.expiresAt < Date.now()) return null;
    const doc = await ctx.db.get(grant.documentId);
    if (!doc) return null;
    if (doc.ownerId !== grant.readerId && doc.visibility !== "shared") return null;
    return {
      storageId: doc.storageId,
      fileName: doc.fileName,
      mimeType: doc.mimeType,
    };
  },
});

/** Cleanup helper for expired grants (called from the HTTP route). */
export const pruneGrants = internalQuery({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const grant = await ctx.db
      .query("pdfGrants")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();
    return grant?._id ?? null;
  },
});
