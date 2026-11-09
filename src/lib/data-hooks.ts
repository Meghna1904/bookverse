import { useCallback, useEffect, useMemo, useState } from "react";
import type { MutationRef, QueryRef } from "./data-api";
import { runMutation, runQuery } from "./data-service";

const CHANGE_EVENT = "bookverse-data-change";

export function announceDataChange() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }
}

export function useQueryState<T>(ref: QueryRef<T>, args?: any | "skip") {
  const argsKey = useMemo(() => JSON.stringify(args ?? {}), [args]);
  const [value, setValue] = useState<T>();
  const [error, setError] = useState<Error>();
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const onChange = () => setRevision((revision) => revision + 1);
    window.addEventListener(CHANGE_EVENT, onChange);
    window.addEventListener("bookverse-reader-change", onChange);
    return () => {
      window.removeEventListener(CHANGE_EVENT, onChange);
      window.removeEventListener("bookverse-reader-change", onChange);
    };
  }, []);

  useEffect(() => {
    let active = true;
    if (args === "skip") {
      setValue(undefined);
      setError(undefined);
      return () => {
        active = false;
      };
    }
    void runQuery(ref.name, args ?? {}).then((result) => {
      if (active) {
        setValue(result as T);
        setError(undefined);
      }
    }).catch((error) => {
      console.error(`[${ref.name}]`, error);
      if (active) {
        setValue(undefined);
        setError(error instanceof Error ? error : new Error(String(error)));
      }
    });
    return () => {
      active = false;
    };
  }, [ref.name, argsKey, revision]);

  return { data: value, error, isLoading: value === undefined && error === undefined };
}

export function useQuery<T>(ref: QueryRef<T>, args?: any | "skip"): T | undefined {
  return useQueryState(ref, args).data;
}

export function useMutation(ref: MutationRef) {
  return useCallback(
    (args?: any) => runMutation(ref.name, args ?? {}),
    [ref.name],
  );
}

export const useAction = useMutation;
