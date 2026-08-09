"use client";
import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "recently-viewed-products";
const MAX_ITEMS = 10;

function getStored(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function addRecentlyViewed(productId: string) {
  const ids = getStored().filter((id) => id !== productId);
  ids.unshift(productId);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ids.slice(0, MAX_ITEMS)));
}

export function useRecentlyViewed() {
  const [ids, setIds] = useState<string[]>([]);

  useEffect(() => {
    setIds(getStored());
  }, []);

  const refresh = useCallback(() => setIds(getStored()), []);

  return { recentIds: ids, refresh };
}
// code:4ce0
