import { api } from "@/lib/data-api";
import { useQuery } from "@/lib/data-hooks";
import { READER_IDS } from "@/lib/db-types";
import { setReaderId, useReaderId } from "@/lib/reader-store";

export function useAuth() {
  const readerId = useReaderId();
  const user = useQuery(api.users.currentUser);
  const readerSlot = readerId === READER_IDS.matildaa ? "matildaa" : "whiskeyy";
  return {
    isLoading: user === undefined,
    isAuthenticated: true,
    hasRoomAccess: true,
    readerSlot,
    user,
    signIn: async (_provider?: string, args?: { reader?: string }) => {
      setReaderId(args?.reader === "matildaa" ? READER_IDS.matildaa : READER_IDS.whiskeyy);
    },
    signOut: async () => setReaderId(READER_IDS.whiskeyy),
  };
}
