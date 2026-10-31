"use client";

import React from "react";
import { Listing, User, PublicUser, Review } from "@/types";
import Container from "@/components/Container";
import ListingHead from "./ListingHead";
import ListingInfo from "./ListingInfo";
import ListingReservation from "./ListingReservation";
import ListingSectionNav from "./ListingSectionNav";
import HotelHostelDetailClient from "./HotelHostelDetailClient";
import type { ListingAvailability } from "@/lib/booking/availability";
import type { PriceOverrides } from "@/lib/booking/pricing";
import type { HostProfileLink } from "@/lib/host-profile";

interface ListingClientProps {
  listing: Listing;
  host?: PublicUser | null;
  /** Host (person or organization) with the link to its category profile page. */
  hostProfile?: HostProfileLink | null;
  reviews?: Review[];
  similarListings?: Listing[];
  currentUser?: User | null;
  /** Booked / blocked nights, built server-side. */
  availability: ListingAvailability;
  /** Host per-date prices (whole-listing pricing only). */
  priceOverrides?: PriceOverrides;
}

export default function ListingClient({
  listing,
  host,
  hostProfile,
  reviews = [],
  similarListings = [],
  currentUser,
  availability,
  priceOverrides = {},
}: ListingClientProps) {
  // Room-based booking needs real room types (the server books only those).
  const isHotelOrHostel = Boolean(listing.roomTypes && listing.roomTypes.length > 0);

  if (isHotelOrHostel) {
    return (
      <HotelHostelDetailClient
        listing={listing}
        host={host}
        hostProfile={hostProfile}
        reviews={reviews}
        similarListings={similarListings}
        currentUser={currentUser}
        availability={availability}
      />
    );
  }

  return (
    <div className="pt-6 sm:pt-8 pb-28 lg:pb-16">
      <ListingSectionNav
        sections={
          listing.category === "experience"
            ? ["photos", "included", "reviews", "location"]
            : listing.category === "vehicle"
            ? ["photos", "specs", "reviews", "location"]
            : undefined
        }
      />
      <Container className="space-y-10 lg:space-y-12">
        {/* Top Header & Bento Gallery */}
        <ListingHead listing={listing} currentUser={currentUser} />

        {/* Content Split: Details Left vs Sticky Booking Sidebar Right */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16 relative">
          {/* Main Info Column */}
          <div className="lg:col-span-7 xl:col-span-8">
            <ListingInfo
              listing={listing}
              host={host}
              hostProfile={hostProfile}
              reviews={reviews}
              similarListings={similarListings}
              currentUser={currentUser}
            />
          </div>

          {/* Sticky Booking Column */}
          <div className="lg:col-span-5 xl:col-span-4 relative">
            <ListingReservation
              listing={listing}
              currentUser={currentUser}
              availability={availability}
              priceOverrides={priceOverrides}
            />
          </div>
        </div>
      </Container>
    </div>
  );
}
