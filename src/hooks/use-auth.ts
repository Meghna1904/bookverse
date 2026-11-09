import { api } from "@/convex/_generated/api";
import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth, useQuery } from "convex/react";

export function useAuth() {
  const { isLoading: isAuthLoading, isAuthenticated } = useConvexAuth();
  const user = useQuery(api.users.currentUser);
  const access = useQuery(api.pinAuth.access, isAuthenticated ? {} : "skip");
  const { signIn, signOut } = useAuthActions();

  // A Convex Auth session is only usable when it holds a room PIN credential.
  const hasRoomAccess = Boolean(isAuthenticated && access?.allowed);
  const isLoading =
    isAuthLoading || user === undefined || (isAuthenticated && access === undefined);

  return {
    isLoading,
    isAuthenticated: hasRoomAccess,
    hasConvexSession: isAuthenticated,
    hasRoomAccess,
    readerSlot: access?.slot ?? null,
    user,
    signIn,
    signOut,
  };
}
