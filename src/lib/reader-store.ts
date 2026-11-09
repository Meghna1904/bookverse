import { useSyncExternalStore } from "react";
import { READER_IDS } from "./db-types";

const STORAGE_KEY = "bookverse-reader-id";
const DEFAULT_READER = READER_IDS.whiskeyy;
let currentReader =
  typeof window === "undefined"
    ? DEFAULT_READER
    : window.localStorage.getItem(STORAGE_KEY) || DEFAULT_READER;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("bookverse-reader-change"));
  }
}

export function getReaderId() {
  return currentReader;
}

export function setReaderId(readerId: string) {
  currentReader = Object.values(READER_IDS).includes(readerId as never)
    ? readerId
    : DEFAULT_READER;
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, currentReader);
  }
  emit();
}

export function subscribeReader(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useReaderId() {
  return useSyncExternalStore(subscribeReader, getReaderId, () => DEFAULT_READER);
}
