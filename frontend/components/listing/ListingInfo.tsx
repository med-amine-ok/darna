"use client";

import React, { useState } from "react";
import Image from "next/image";
import dynamic from "next/dynamic";
import { Listing, User, Review } from "@/types";
import Avatar from "@/components/Avatar";
import {
  BrandStarIcon,
  GuestFavoriteIcon,
  BrandDoorIcon,
  BrandShieldIcon,
  BrandBedIcon,
  BrandCloseIcon,
  BrandPinIcon,
  CategoryPoolIcon,
  CategoryVehicleIcon,
  BrandWifiIcon,
  BrandSnowIcon,
  BrandKitchenIcon,
  BrandFlameIcon,
  BrandWaterIcon,
} from "@/components/icons";
import { useRouter } from "@/navigation";
import ListingCarouselCard from "@/components/home/ListingCarouselCard";

const Map = dynamic(() => import("@/components/Map"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[35vh] min-h-[300px] bg-tertiary/20 animate-pulse rounded-2xl flex items-center justify-center text-primary/60 text-sm">
      Loading map...
    </div>
  ),
});

interface ListingInfoProps {
  listing: Listing;
  host?: User | null;
  reviews?: Review[];
  similarListings?: Listing[];
  currentUser?: User | null;
}

export default function ListingInfo({
  listing,
  host,
  reviews = [],
  similarListings = [],
  currentUser,
}: ListingInfoProps) {
  const router = useRouter();
  const [isDescExpanded, setIsDescExpanded] = useState(false);
  const [isAmenitiesModalOpen, setIsAmenitiesModalOpen] = useState(false);

  const isVehicle = listing.category === "vehicle";
  const isExperience = listing.category === "experience";

  const allAmenities = listing.amenities || [
    "wifi",
    "pool",
    "kitchen",
    "parking",
    "air_conditioning",
    "sea_view",
    "fireplace",
    "courtyard",
  ];

  const amenityIcons: Record<string, { label: string; icon: any }> = {
    wifi: { label: "High-speed Wi-Fi", icon: BrandWifiIcon },
    pool: { label: "Private Swimming Pool", icon: CategoryPoolIcon },
    kitchen: { label: "Fully Equipped Kitchen", icon: BrandKitchenIcon },
    parking: { label: "Free Private Parking", icon: CategoryVehicleIcon },
    air_conditioning: { label: "Climate Control AC", icon: BrandSnowIcon },
    sea_view: { label: "Mediterranean Sea View", icon: BrandWaterIcon },
    fireplace: { label: "Traditional Fireplace", icon: BrandFlameIcon },
    courtyard: { label: "Private Andalusian Courtyard", icon: BrandDoorIcon },
    heating: { label: "Central Heating", icon: BrandFlameIcon },
    mountain_view: { label: "Panoramic Mountain View", icon: BrandWaterIcon },
  };

  return (
    <div className="space-y-8 text-primary">
      {/* 1. Host Summary Row */}
      <div className="flex items-center justify-between border-b border-tertiary/50 pb-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
            {isVehicle
              ? `${listing.make || "Vehicle"} hosted by ${host?.name || "Atlas Escapes"}`
              : isExperience
              ? `Experience led by ${host?.name || "Amina Benali"}`
              : `Entire stay hosted by ${host?.name || "Amina Benali"}`}
          </h2>
          <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm text-neutral-600 mt-1">
            {isVehicle ? (
              <>
                <span>{listing.seats || 5} seats</span>
                <span>·</span>
                <span>{listing.transmission || "Automatic"}</span>
                <span>·</span>
                <span>{listing.fuelType || "Diesel"}</span>
                <span>·</span>
                <span>Year {listing.year || 2023}</span>
              </>
            ) : isExperience ? (
              <>
                <span>{listing.durationHours || 4} hours</span>
                <span>·</span>
                <span>Up to {listing.groupSize || 8} guests</span>
                <span>·</span>
                <span>Includes local guide & refreshments</span>
              </>
            ) : (
              <>
                <span>{listing.guestCount || 4} guests</span>
                <span>·</span>
                <span>{listing.bedroomCount || 2} bedrooms</span>
                <span>·</span>
                <span>{listing.roomCount || 3} beds</span>
                <span>·</span>
                <span>{listing.bathroomCount || 2} baths</span>
              </>
            )}
          </div>
        </div>

        <div className="flex-shrink-0 cursor-pointer" onClick={() => host?.id && router.push(`/users/${host.id}`)}>
          <Avatar src={host?.image || "/assets/avatar.png"} size={56} />
        </div>
      </div>

      {/* 2. Key Highlights */}
      <div className="space-y-4 border-b border-tertiary/50 pb-6">
        {listing.isGuestFavorite && (
          <div className="flex items-start gap-4">
            <div className="p-2.5 rounded-xl bg-tertiary/30 text-accent flex-shrink-0">
              <GuestFavoriteIcon size={24} />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base">Guest favorite</h3>
              <p className="text-xs sm:text-sm text-neutral-500">
                One of the most loved listings on DARNA based on authentic guest ratings and reviews.
              </p>
            </div>
          </div>
        )}

        <div className="flex items-start gap-4">
          <div className="p-2.5 rounded-xl bg-tertiary/30 text-primary flex-shrink-0">
            <BrandDoorIcon size={24} strokeWidth={1.8} />
          </div>
          <div>
            <h3 className="font-bold text-sm sm:text-base">Seamless check-in</h3>
            <p className="text-xs sm:text-sm text-neutral-500">
              100% of recent travelers gave the check-in process a 5-star rating.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-4">
          <div className="p-2.5 rounded-xl bg-tertiary/30 text-primary flex-shrink-0">
            <BrandShieldIcon size={24} strokeWidth={1.8} />
          </div>
          <div>
            <h3 className="font-bold text-sm sm:text-base">Free cancellation</h3>
            <p className="text-xs sm:text-sm text-neutral-500">
              Cancel up to 48 hours before check-in for a full refund under DARNA Protection.
            </p>
          </div>
        </div>
      </div>

      {/* 3. Description Section */}
      <div className="border-b border-tertiary/50 pb-6 space-y-3">
        <h3 className="text-lg sm:text-xl font-bold">About this {listing.category}</h3>
        <p className={`text-sm sm:text-base text-neutral-700 leading-relaxed ${!isDescExpanded ? "line-clamp-4" : ""}`}>
          {listing.description}
        </p>
        <button
          type="button"
          onClick={() => setIsDescExpanded((prev) => !prev)}
          className="text-xs sm:text-sm font-bold text-primary underline hover:text-accent transition cursor-pointer"
        >
          {isDescExpanded ? "Show less" : "Show more"}
        </button>
      </div>

      {/* 4. Sleeping Arrangements (or Vehicle Features / Inclusions) */}
      {!isVehicle && !isExperience && (
        <div className="border-b border-tertiary/50 pb-6 space-y-4">
          <h3 className="text-lg sm:text-xl font-bold">Where you'll sleep</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {Array.from({ length: listing.bedroomCount || 2 }).map((_, idx) => (
              <div
                key={idx}
                className="p-4 rounded-2xl border border-tertiary/70 space-y-2 bg-white"
              >
                <BrandBedIcon size={24} strokeWidth={1.8} className="text-primary" />
                <h4 className="font-bold text-sm">Bedroom {idx + 1}</h4>
                <p className="text-xs text-neutral-500">1 Queen bed · Linens provided</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. Amenities & What this place offers */}
      <div className="border-b border-tertiary/50 pb-6 space-y-4">
        <h3 className="text-lg sm:text-xl font-bold">
          {isVehicle ? "Included vehicle features" : isExperience ? "What's included" : "What this place offers"}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {allAmenities.slice(0, 8).map((amenityKey) => {
            const item = amenityIcons[amenityKey] || {
              label: amenityKey.replace(/_/g, " "),
              icon: BrandShieldIcon,
            };
            const IconComp = item.icon;
            return (
              <div key={amenityKey} className="flex items-center gap-3 text-sm text-neutral-800">
                <IconComp size={22} className="text-primary flex-shrink-0" />
                <span className="capitalize">{item.label}</span>
              </div>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => setIsAmenitiesModalOpen(true)}
          className="mt-3 px-5 py-2.5 rounded-xl border border-primary font-bold text-xs sm:text-sm text-primary hover:bg-neutral-100 transition cursor-pointer"
        >
          Show all {allAmenities.length} amenities
        </button>
      </div>

      {/* 6. House Rules & Cancellation Policy */}
      <div className="border-b border-tertiary/50 pb-6 space-y-4">
        <h3 className="text-lg sm:text-xl font-bold">House rules & Cancellation</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs sm:text-sm">
          <div>
            <h4 className="font-bold text-primary mb-1">Check-in / Checkout</h4>
            <p className="text-neutral-600">Check-in: 3:00 PM – 9:00 PM</p>
            <p className="text-neutral-600">Checkout before 11:00 AM</p>
          </div>
          <div>
            <h4 className="font-bold text-primary mb-1">During your stay</h4>
            <p className="text-neutral-600">No parties or events</p>
            <p className="text-neutral-600">No smoking inside the home</p>
          </div>
          <div>
            <h4 className="font-bold text-primary mb-1">Cancellation policy</h4>
            <p className="text-neutral-600 capitalize">
              {listing.cancellationPolicy || "flexible"} cancellation. Full refund if cancelled 48h prior.
            </p>
          </div>
        </div>
      </div>

      {/* 7. Reviews Section */}
      <div id="reviews" className="border-b border-tertiary/50 pb-8 space-y-6">
        <div className="flex items-center gap-3">
          <BrandStarIcon size={26} className="text-accent" />
          <h3 className="text-xl sm:text-2xl font-bold">
            {listing.rating?.toFixed(2) || "4.95"} · {reviews.length || 34} reviews
          </h3>
        </div>

        {/* Rating Category Breakdown Bars */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-8 gap-y-3 text-xs sm:text-sm">
          {[
            { label: "Cleanliness", score: 5.0 },
            { label: "Accuracy", score: 4.9 },
            { label: "Communication", score: 5.0 },
            { label: "Location", score: 4.9 },
            { label: "Check-in", score: 5.0 },
            { label: "Value", score: 4.8 },
          ].map((cat) => (
            <div key={cat.label} className="space-y-1">
              <div className="flex justify-between font-semibold">
                <span>{cat.label}</span>
                <span>{cat.score.toFixed(1)}</span>
              </div>
              <div className="h-1.5 w-full bg-neutral-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full"
                  style={{ width: `${(cat.score / 5.0) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Individual Review Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-4">
          {reviews.map((rev) => (
            <div key={rev.id} className="p-4 rounded-2xl border border-tertiary/60 bg-white space-y-2">
              <div className="flex items-center gap-3">
                <Avatar src={rev.user?.image || "/assets/avatar.png"} size={40} />
                <div>
                  <h4 className="font-bold text-sm text-primary">{rev.user?.name || "Guest"}</h4>
                  <p className="text-[11px] text-neutral-400">May 2024</p>
                </div>
              </div>
              <p className="text-xs sm:text-sm text-neutral-700 leading-relaxed">{rev.comment}</p>
            </div>
          ))}
        </div>
      </div>

      {/* 8. Location Map Section */}
      <div className="border-b border-tertiary/50 pb-8 space-y-4">
        <h3 className="text-lg sm:text-xl font-bold">Where you'll be</h3>
        <p className="text-xs sm:text-sm text-neutral-600 flex items-center">
          <BrandPinIcon
            size={16}
            strokeWidth={1.8}
            className="inline-block me-1.5 shrink-0 text-accent"
          />
          <span>{listing.city ? `${listing.city}, Algeria` : "Algeria"} — Exact location provided after confirmed booking.</span>
        </p>
        <Map center={listing.latlng} isApproximate={true} className="h-[380px]" />
      </div>

      {/* 9. Host Profile Card */}
      <div className="border-b border-tertiary/50 pb-8 space-y-4">
        <h3 className="text-lg sm:text-xl font-bold">Meet your host</h3>
        <div className="p-6 rounded-3xl border border-tertiary/70 bg-white flex flex-col sm:flex-row items-center gap-6">
          <Avatar src={host?.image || "/assets/avatar.png"} size={72} />
          <div className="space-y-1 text-center sm:text-start flex-1">
            <h4 className="font-bold text-lg text-primary">{host?.name || "Amina Benali"}</h4>
            <p className="text-xs text-neutral-500">Superhost · Hosting for 3 years in Tipaza & Algiers</p>
            <p className="text-xs sm:text-sm text-neutral-700 pt-1">
              "Passionate about Algerian heritage and welcoming travelers to our Mediterranean coastline."
            </p>
          </div>
          <button
            type="button"
            onClick={() => router.push(`/messages?hostId=${host?.id || "usr_amina"}`)}
            className="px-5 py-2.5 rounded-xl bg-primary text-white font-bold text-xs sm:text-sm hover:opacity-90 transition cursor-pointer flex-shrink-0"
          >
            Message host
          </button>
        </div>
      </div>

      {/* 10. Similar Listings Carousel */}
      {similarListings.length > 0 && (
        <div className="space-y-4 pt-2">
          <h3 className="text-lg sm:text-xl font-bold">Similar listings in Algeria</h3>
          <div className="flex gap-4 overflow-x-auto no-scrollbar py-2">
            {similarListings.map((sim) => (
              <ListingCarouselCard
                key={sim.id}
                listing={sim}
                currentUser={currentUser}
              />
            ))}
          </div>
        </div>
      )}

      {/* Amenities Modal */}
      {isAmenitiesModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 max-h-[85vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between border-b border-neutral-200 pb-3">
              <h3 className="font-bold text-lg text-primary">All amenities</h3>
              <button
                type="button"
                onClick={() => setIsAmenitiesModalOpen(false)}
                className="p-1 rounded-full hover:bg-neutral-100"
              >
                <BrandCloseIcon size={20} strokeWidth={2} />
              </button>
            </div>
            <div className="space-y-3 divide-y divide-neutral-100">
              {allAmenities.map((am) => (
                <div key={am} className="pt-2 flex items-center gap-3 text-sm text-neutral-800">
                  <BrandShieldIcon size={18} strokeWidth={1.8} className="text-accent" />
                  <span className="capitalize">{am.replace(/_/g, " ")}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
