"use client";

import { User } from "@/types";
import { useCallback, useMemo, useState, useEffect } from "react";
import { useLoginModal } from "./useLoginModal";
import { toast } from "react-toastify";

type Props = {
  listingId: string;
  currentUser?: User | null;
};

// Global in-memory and local-storage favorites cache
let clientFavorites: string[] = ["lst_tipaza_villa", "lst_djanet_tassili"];
const favListeners = new Set<(ids: string[]) => void>();

export default function useFavorite({ listingId, currentUser }: Props) {
  const loginModal = useLoginModal();
  const [favorites, setFavorites] = useState<string[]>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("darna_favorites");
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch {}
      }
    }
    return currentUser?.favoriteIds || clientFavorites;
  });

  useEffect(() => {
    const handleFavChange = (ids: string[]) => {
      setFavorites(ids);
    };
    favListeners.add(handleFavChange);
    return () => {
      favListeners.delete(handleFavChange);
    };
  }, []);

  const hasFavorite = useMemo(() => {
    return favorites.includes(listingId);
  }, [favorites, listingId]);

  const toggleFavorite = useCallback(
    (e: React.MouseEvent<HTMLElement>) => {
      e.stopPropagation();
      e.preventDefault();

      if (!currentUser) {
        loginModal.onOpen();
        return;
      }

      const nextFavs = hasFavorite
        ? favorites.filter((id) => id !== listingId)
        : [...favorites, listingId];

      clientFavorites = nextFavs;
      if (typeof window !== "undefined") {
        localStorage.setItem("darna_favorites", JSON.stringify(nextFavs));
      }
      favListeners.forEach((fn) => fn(nextFavs));

      if (hasFavorite) {
        toast.info("Removed from favorites");
      } else {
        toast.success("Saved to favorites");
      }
    },
    [currentUser, hasFavorite, favorites, listingId, loginModal]
  );

  return {
    hasFavorite,
    toggleFavorite,
  };
}
