import { ConvexCredentials } from "@convex-dev/auth/providers/ConvexCredentials";
import { retrieveAccount } from "@convex-dev/auth/server";
import { makeFunctionReference } from "convex/server";
import { hashPin, verifyPin } from "./pinCrypto";

const PIN_PATTERN = /^\d{6}$/;

// Function references avoid a type cycle between auth.ts and the generated API.
const readerForAuth = makeFunctionReference<
  "query",
  { slot: string },
  { userId: string; displayName: string; providerAccountId: string } | null
>("pinAuth:readerForAuth");
const beginAttempt = makeFunctionReference<
  "mutation",
  { slot: string; scope?: string },
  { lockedForMs: number }
>("pinAuth:beginAttempt");
const recordFailure = makeFunctionReference<
  "mutation",
  { slot: string; scope?: string },
  { lockedForMs: number; attemptsRemaining: number }
>("pinAuth:recordFailure");
const recordSuccess = makeFunctionReference<
  "mutation",
  { slot: string; scope?: string },
  null
>("pinAuth:recordSuccess");

function pinError(code: "PIN_INCORRECT" | "PIN_LOCKED" | "INVALID_PIN") {
  return new Error(code);
}

/**
 * Reader PIN credentials. The client only ever sends a room reader slot and a
 * six-digit PIN; the hidden provider account identifier never leaves the server.
 */
export const pinProvider = ConvexCredentials({
  id: "pin",
  authorize: async (params, ctx) => {
    const slot = typeof params.reader === "string" ? params.reader.trim().toLowerCase() : "";
    const pin = typeof params.pin === "string" ? params.pin : "";
    const reader = slot ? await ctx.runQuery(readerForAuth, { slot }) : null;
    if (!reader) throw pinError("PIN_INCORRECT");

    const gate = await ctx.runMutation(beginAttempt, { slot });
    if (gate.lockedForMs > 0) throw pinError("PIN_LOCKED");

    if (!PIN_PATTERN.test(pin)) {
      const failed = await ctx.runMutation(recordFailure, { slot });
      throw pinError(failed.lockedForMs > 0 ? "PIN_LOCKED" : "PIN_INCORRECT");
    }

    let account;
    try {
      account = await retrieveAccount(ctx, {
        provider: "pin",
        account: { id: reader.providerAccountId, secret: pin },
      });
    } catch {
      account = null;
    }

    if (!account) {
      const failed = await ctx.runMutation(recordFailure, { slot });
      throw pinError(failed.lockedForMs > 0 ? "PIN_LOCKED" : "PIN_INCORRECT");
    }

    await ctx.runMutation(recordSuccess, { slot });
    return { userId: account.user._id };
  },
  crypto: {
    hashSecret: hashPin,
    verifySecret: verifyPin,
  },
});
