import { useSyncExternalStore } from "react";

const ROOM_PIN = "0101";
const ACCESS_KEY = "bookverse-room-unlocked";
const ACCESS_EVENT = "bookverse-room-access-change";

export function isRoomUnlocked() {
  return typeof window !== "undefined" && window.sessionStorage.getItem(ACCESS_KEY) === "yes";
}

export function unlockRoom(pin: string) {
  if (pin !== ROOM_PIN) return false;
  window.sessionStorage.setItem(ACCESS_KEY, "yes");
  window.dispatchEvent(new Event(ACCESS_EVENT));
  return true;
}

export function lockRoom() {
  window.sessionStorage.removeItem(ACCESS_KEY);
  window.dispatchEvent(new Event(ACCESS_EVENT));
}

export function useRoomUnlocked() {
  return useSyncExternalStore(
    (listener) => {
      window.addEventListener(ACCESS_EVENT, listener);
      return () => window.removeEventListener(ACCESS_EVENT, listener);
    },
    isRoomUnlocked,
    () => false,
  );
}
