"use client";

import React from "react";
import { Listing, User, Review } from "@/types";
import Container from "@/components/Container";
import ListingHead from "./ListingHead";
import ListingInfo from "./ListingInfo";
import ListingReservation from "./ListingReservation";

interface ListingClientProps {
  listing: Listing;
  host?: User | null;
  reviews?: Review[];
  similarListings?: Listing[];
  currentUser?: User | null;
}

export default function ListingClient({
  listing,
  host,
  reviews = [],
  similarListings = [],
  currentUser,
}: ListingClientProps) {
  return (
    <div className="py-6 sm:py-8">
      <Container className="space-y-8">
        {/* Top Header & Bento Gallery */}
        <ListingHead listing={listing} currentUser={currentUser} />

        {/* Content Split: Details Left vs Sticky Booking Sidebar Right */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 relative">
          {/* Main Info Column */}
          <div className="lg:col-span-7 xl:col-span-8">
            <ListingInfo
              listing={listing}
              host={host}
              reviews={reviews}
              similarListings={similarListings}
              currentUser={currentUser}
            />
          </div>

          {/* Sticky Booking Column */}
          <div className="lg:col-span-5 xl:col-span-4 relative">
            <ListingReservation listing={listing} currentUser={currentUser} />
          </div>
        </div>
      </Container>
    </div>
  );
}
