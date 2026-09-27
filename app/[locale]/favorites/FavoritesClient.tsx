"use client";

import React, { useState } from "react";
import { useRouter } from "@/navigation";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import { MdFavoriteBorder } from "react-icons/md";
import Container from "@/components/Container";
import Heading from "@/components/Heading";
import ListingCard from "@/components/listing/ListingCard";
import { SafeUser, safeListing } from "@/types";

type Props = {
  listings: safeListing[];
  currentUser?: SafeUser | null;
};

export default function FavoritesClient({ listings, currentUser }: Props) {
  const router = useRouter();
  const t = useTranslations("favorites");

  // Keep local list
  const [favoriteListings, setFavoriteListings] = useState<safeListing[]>(listings);

  return (
    <Container>
      <div className="max-w-7xl mx-auto pb-20">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <Heading title={t("title")} subtitle={t("subtitle")} />
          {favoriteListings.length > 0 && (
            <span className="text-xs sm:text-sm font-semibold text-neutral-600 bg-neutral-100 py-1.5 px-3 rounded-full self-start sm:self-auto border border-neutral-200">
              {t("savedPlaces", { count: favoriteListings.length })}
            </span>
          )}
        </div>

        {favoriteListings.length === 0 ? (
          <div className="py-24 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center text-accent mb-4">
              <MdFavoriteBorder size={32} />
            </div>
            <h3 className="text-xl font-bold text-neutral-900">{t("emptyTitle")}</h3>
            <p className="text-sm text-neutral-500 mt-1 max-w-md">{t("noFavoritesDesc")}</p>
            <button
              type="button"
              onClick={() => router.push("/")}
              className="mt-6 px-6 py-3 rounded-xl bg-primary hover:bg-primary-800 text-white text-sm font-semibold transition cursor-pointer shadow-sm"
            >
              {t("startExploring")}
            </button>
          </div>
        ) : (
          <motion.div
            layout
            className="mt-8 sm:mt-10 grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 sm:gap-5 md:gap-6"
          >
            <AnimatePresence>
              {favoriteListings.map((listing) => (
                <motion.div
                  key={listing.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.85 }}
                  transition={{ duration: 0.2 }}
                >
                  <ListingCard
                    currentUser={currentUser}
                    data={listing}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>
    </Container>
  );
}
