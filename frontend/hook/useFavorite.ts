"use client";

import { User } from "@/types";
import { useCallback, useMemo, useState, useEffect } from "react";
import { useLoginModal } from "./useLoginModal";
import { toast } from "react-toastify";
import { useTranslations } from "next-intl";
import { setFavoriteAction } from "@/app/actions/favorites";
import { useActionError } from "./useActionError";

type Props = {
  listingId: string;
  currentUser?: User | null;
};

/**
 * Favorites live on the server (User.favoriteIds). This in-memory cache only
 * keeps every heart on the page in sync for the current user; it is keyed by
 * user id and never persisted in localStorage.
 */
let cache: { userId: string; ids: string[] } | null = null;
const listeners = new Set<(ids: string[]) => void>();

function publish(userId: string, ids: string[]) {
  cache = { userId, ids };
  listeners.forEach((fn) => fn(ids));
}

/** Current user's favorite ids, kept in sync across components. */
export function useFavoriteIds(currentUser?: User | null): string[] {
  const userId = currentUser?.id ?? null;
  const [ids, setIds] = useState<string[]>(() =>
    userId ? (cache?.userId === userId ? cache.ids : currentUser?.favoriteIds || []) : []
  );

  useEffect(() => {
    if (!userId) {
      setIds([]);
      return;
    }
    if (cache?.userId !== userId) {
      publish(userId, currentUser?.favoriteIds || []);
    } else {
      setIds(cache.ids);
    }
    const listener = (next: string[]) => setIds(next);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, [userId, currentUser?.favoriteIds]);

  return ids;
}

export default function useFavorite({ listingId, currentUser }: Props) {
  const openLogin = useLoginModal((s) => s.onOpen);
  const t = useTranslations("favorites");
  const errorText = useActionError();
  const favorites = useFavoriteIds(currentUser);

  const hasFavorite = useMemo(() => favorites.includes(listingId), [favorites, listingId]);

  const toggleFavorite = useCallback(
    async (e: React.MouseEvent<HTMLElement>) => {
      e.stopPropagation();
      e.preventDefault();

      if (!currentUser) {
        openLogin();
        return;
      }

      const previous = favorites;
      const next = hasFavorite ? favorites.filter((id) => id !== listingId) : [...favorites, listingId];
      publish(currentUser.id, next); // optimistic

      const result = await setFavoriteAction(listingId, !hasFavorite);
      if (!result.ok) {
        publish(currentUser.id, previous);
        toast.error(errorText(result));
        return;
      }
      publish(currentUser.id, result.data);
      if (hasFavorite) {
        toast.info(t("toastRemoved"));
      } else {
        toast.success(t("toastSaved"));
      }
    },
    [currentUser, hasFavorite, favorites, listingId, openLogin, t, errorText]
  );

  return {
    hasFavorite,
    toggleFavorite,
  };
}
