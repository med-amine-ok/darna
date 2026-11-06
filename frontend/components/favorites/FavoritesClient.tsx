"use client";

import React, { useState } from "react";
import { AnimatePresence, m } from "framer-motion";
import { useFavoriteIds } from "@/hook/useFavorite";
import { useTranslations } from "next-intl";
import { Listing, User, ListingVertical } from "@/types";
import ListingCard from "@/components/listing/ListingCard";
import { BrandSearchIcon } from "@/components/icons";
import { Button, Card, KitEmptyState, Tabs, TabPanel } from "@/components/ui";
import { dur, ease, spring } from "@/lib/motion";

interface FavoritesClientProps {
  initialListings: Listing[];
  currentUser?: User | null;
}

type VerticalFilter = "all" | ListingVertical;

export default function FavoritesClient({ initialListings, currentUser }: FavoritesClientProps) {
  const t = useTranslations("favorites");
  const tNav = useTranslations("nav");
  // Server-backed favorites (initial list comes from the page props). Un-hearting a card
  // updates this list, and the card leaves the grid with a layout animation.
  const favoriteIds = useFavoriteIds(currentUser);

  const [activeVertical, setActiveVertical] = useState<VerticalFilter>("all");

  const savedListings = initialListings.filter((l) => favoriteIds.includes(l.id));
  const filteredListings = savedListings.filter((l) => activeVertical === "all" || l.category === activeVertical);

  const tabs: { id: VerticalFilter; label: string }[] = [
    { id: "all", label: tNav("tabAll") },
    { id: "home", label: tNav("tabHomes") },
    { id: "hotel", label: tNav("tabHotels") },
    { id: "vehicle", label: tNav("tabVehicles") },
    { id: "experience", label: tNav("tabExperiences") },
    { id: "trip", label: tNav("tabTrips") },
  ];
  const countFor = (id: VerticalFilter) =>
    id === "all" ? savedListings.length : savedListings.filter((l) => l.category === id).length;
  // Only show filters that have something in them (plus "All").
  const visibleTabs = tabs.filter((tab) => tab.id === "all" || countFor(tab.id) > 0 || tab.id === activeVertical);

  if (savedListings.length === 0) {
    return (
      <Card padding="none" className="enter-up relative overflow-hidden">
        <div aria-hidden="true" className="texture-zellige zellige-fade-corner pointer-events-none absolute inset-0" />
        <KitEmptyState
          variant="favorites"
          title={t("emptyTitle")}
          description={t("noFavoritesDesc")}
          className="min-h-0 py-16"
          action={
            <Button href="/search" leadingIcon={<BrandSearchIcon size={18} aria-hidden="true" />}>
              {tNav("explore")}
            </Button>
          }
        />
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <Tabs
          id="favorites"
          ariaLabel={t("filterLabel")}
          value={activeVertical}
          onChange={setActiveVertical}
          items={visibleTabs.map((tab) => ({ value: tab.id, label: tab.label, count: countFor(tab.id) }))}
          className="sm:flex-1"
        />
        <p aria-live="polite" className="shrink-0 text-meta text-primary-600 sm:pb-3">
          {t("savedPlaces", { count: savedListings.length })}
        </p>
      </div>

      <TabPanel tabsId="favorites" value={activeVertical} active={activeVertical}>
        {filteredListings.length === 0 ? (
          <Card padding="none">
            <KitEmptyState
              compact
              variant="favorites"
              title={t("noSavedInTab", { tab: tabs.find((tab) => tab.id === activeVertical)?.label ?? "" })}
              description={t("noFavoritesDesc")}
              action={
                <Button variant="tertiary" onClick={() => setActiveVertical("all")}>
                  {t("showAll")}
                </Button>
              }
            />
          </Card>
        ) : (
          <ul className="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {/* initial={false}: cards in the server HTML are never hidden behind JS. */}
            <AnimatePresence initial={false} mode="popLayout">
              {filteredListings.map((listing) => (
                <m.li
                  key={listing.id}
                  layout
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1, transition: { duration: dur.base, ease: ease.out } }}
                  exit={{ opacity: 0, scale: 0.92, transition: { duration: dur.base, ease: ease.standard } }}
                  transition={{ layout: spring.layout }}
                >
                  <ListingCard data={listing} currentUser={currentUser} />
                </m.li>
              ))}
            </AnimatePresence>
          </ul>
        )}
      </TabPanel>
    </div>
  );
}
