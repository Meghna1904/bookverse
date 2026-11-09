// THIS FILE IS READ ONLY. Do not touch this file unless you are correctly adding a new auth provider in accordance to the vly auth documentation

import { convexAuth } from "@convex-dev/auth/server";
import { pinProvider } from "./auth/pin";

// The room is entered only through a reader-specific, six-digit PIN. Email and
// guest providers are intentionally not registered, so they cannot be used from
// the client even if a stale session or old form is replayed.
export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [pinProvider],
});