"use client";

import React, { useState, useEffect } from "react";
import { Link } from "@/navigation";
import { useTranslations } from "next-intl";
import { Listing, User, ListingVertical } from "@/types";
import ListingCard from "@/components/listing/ListingCard";
import { BrandHeartIcon } from "@/components/icons";

interface FavoritesClientProps {
  initialListings: Listing[];
  currentUser?: User | null;
}

export default function FavoritesClient({
  initialListings,
  currentUser,
}: FavoritesClientProps) {
  const tNav = useTranslations("nav");
  const [favoriteIds, setFavoriteIds] = useState<string[]>(
    () => currentUser?.favoriteIds || ["lst_tipaza_villa", "lst_djanet_tassili"]
  );

  const [activeVertical, setActiveVertical] = useState<"all" | ListingVertical>("all");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("darna_favorites");
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            setFavoriteIds(parsed);
          }
        } catch {}
      }
    }

    const handleStorage = () => {
      const stored = localStorage.getItem("darna_favorites");
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            setFavoriteIds(parsed);
          }
        } catch {}
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  // Filter listings by saved IDs and vertical
  const savedListings = initialListings.filter((l) => favoriteIds.includes(l.id));
  const filteredListings = savedListings.filter((l) => {
    if (activeVertical === "all") return true;
    return l.category === activeVertical;
  });

  const tabs: { id: "all" | ListingVertical; label: string }[] = [
    { id: "all", label: tNav("tabAll") },
    { id: "home", label: tNav("tabHomes") },
    { id: "hotel", label: tNav("tabHotels") },
    { id: "vehicle", label: tNav("tabVehicles") },
    { id: "experience", label: tNav("tabExperiences") },
    { id: "trip", label: tNav("tabTrips") },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-tertiary/50 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-primary font-serif">
            {tNav("myFavorites")}
          </h1>
          <p className="text-sm text-neutral-500 mt-1">
            {savedListings.length}{" "}
            {savedListings.length === 1 ? "saved place" : "saved places"} across Algeria
          </p>
        </div>

        {/* Vertical Tabs */}
        {savedListings.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 bg-tertiary/20 p-1.5 rounded-2xl border border-tertiary/40">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveVertical(tab.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition ${
                  activeVertical === tab.id
                    ? "bg-white text-primary shadow-xs"
                    : "text-neutral-600 hover:text-primary"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Grid or Empty State */}
      {filteredListings.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 border border-tertiary text-center max-w-lg mx-auto my-8 shadow-xs">
          <div className="w-16 h-16 bg-accent/10 text-accent rounded-full flex items-center justify-center mx-auto mb-4 border border-accent/20">
            <BrandHeartIcon size={32} />
          </div>
          <h3 className="text-lg font-bold text-primary mb-1">
            {savedListings.length === 0
              ? "No saved stays or experiences yet"
              : `No saved ${activeVertical}s found`}
          </h3>
          <p className="text-sm text-neutral-500 mb-6 max-w-sm mx-auto">
            As you explore DARNA, click the heart icon on any villa, 4x4, or Sahara trek to bookmark your favorites here.
          </p>
          <Link
            href="/search"
            className="inline-flex items-center justify-center py-2.5 px-6 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/95 transition shadow-sm"
          >
            {tNav("explore")}
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredListings.map((listing) => (
            <ListingCard
              key={listing.id}
              data={listing}
              currentUser={currentUser}
            />
          ))}
        </div>
      )}
    </div>
  );
}
