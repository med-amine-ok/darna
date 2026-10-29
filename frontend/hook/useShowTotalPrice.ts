"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * "Show total price" display preference for listing cards and map pins,
 * persisted in localStorage and shared across components and tabs.
 */
const STORAGE_KEY = "darna_show_total_price";
const EVENT = "darna:show-total-price";

function read(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function subscribe(onChange: () => void) {
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) onChange();
  };
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", onStorage);
  };
}

export function useShowTotalPrice(): [boolean, (value: boolean) => void] {
  // Server render and first client render use `false` (no hydration mismatch).
  const value = useSyncExternalStore(subscribe, read, () => false);
  const setValue = useCallback((next: boolean) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
    } catch {
      /* storage unavailable: preference lasts for this page only */
    }
    window.dispatchEvent(new Event(EVENT));
  }, []);
  return [value, setValue];
}
