"use client";

import React from "react";
import Image from "next/image";
import { Link } from "@/navigation";
import { Trip } from "@/types";
import PriceDisplay from "@/components/common/PriceDisplay";
import {
  Compass,
  Calendar,
  Users,
  MapPin,
  Star,
  CheckCircle,
  ArrowRight,
} from "lucide-react";

interface TripCardProps {
  trip: Trip;
  onHover?: (id: string | null) => void;
  isHovered?: boolean;
  customHref?: string;
}

export default function TripCard({
  trip,
  onHover,
  isHovered = false,
  customHref,
}: TripCardProps) {
  const nights = Math.max(1, trip.durationDays - 1);
  const agencyName = trip.organization?.name || "Verified Travel Agency";

  return (
    <Link
      href={customHref || `/trips/${trip.id}`}
      onMouseEnter={() => onHover && onHover(trip.id)}
      onMouseLeave={() => onHover && onHover(null)}
      className={`group flex flex-col bg-white rounded-3xl border overflow-hidden transition-all duration-300 transform ${
        isHovered
          ? "border-primary shadow-2xl -translate-y-1.5 ring-2 ring-primary ring-offset-2 scale-[1.01]"
          : "border-tertiary/60 shadow-2xs hover:shadow-xl hover:border-primary/40 hover:-translate-y-1"
      }`}
    >
      {/* Cover Image Container */}
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-neutral-100">
        <Image
          src={trip.coverPhoto}
          alt={trip.title}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />

        {/* Top Badges */}
        <div className="absolute top-3 inset-x-3 flex items-center justify-between gap-2 min-w-0 pointer-events-none">
          <span className="px-3 py-1 rounded-full bg-white/90 backdrop-blur-md text-[11px] font-bold text-primary flex items-center gap-1.5 shadow-xs shrink-0 truncate max-w-[65%]">
            <Calendar size={13} className="text-secondary shrink-0" />
            <span className="truncate">
              {trip.durationDays} Days / {nights} Nights
            </span>
          </span>

          {trip.rating ? (
            <span className="px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-[11px] font-bold text-white flex items-center gap-1 shrink-0">
              <Star size={12} className="text-amber-400 fill-amber-400 shrink-0" />
              <span>{trip.rating.toFixed(2)}</span>
            </span>
          ) : (
            <span className="px-2.5 py-1 rounded-full bg-accent text-[11px] font-bold text-white shrink-0">
              New Expedition
            </span>
          )}
        </div>

        {/* Bottom Image Overlay: Agency Tag */}
        <div className="absolute bottom-3 start-3 end-3 flex items-center justify-between gap-2 min-w-0 text-white text-xs">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-black/50 backdrop-blur-md min-w-0 flex-1">
            <CheckCircle size={13} className="text-emerald-400 shrink-0" />
            <span className="font-semibold truncate">{agencyName}</span>
          </div>
          <span className="px-2 py-0.5 rounded-lg bg-white/20 backdrop-blur-md text-[11px] font-medium flex items-center gap-1 shrink-0">
            <Users size={12} className="shrink-0" />
            <span>Max {trip.maxGroupSize}</span>
          </span>
        </div>
      </div>

      {/* Card Body */}
      <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
        <div>
          {/* Location */}
          <div className="flex items-center gap-1 text-xs font-semibold text-secondary uppercase tracking-wider mb-1.5">
            <MapPin size={13} />
            <span>{trip.city}, Algeria</span>
          </div>

          {/* Title */}
          <h3 className="font-serif text-base sm:text-lg font-bold text-primary group-hover:text-secondary transition-colors line-clamp-2 leading-snug">
            {trip.title}
          </h3>

          {/* Brief Itinerary snippet */}
          <p className="text-xs text-neutral-500 line-clamp-2 mt-2 leading-relaxed">
            {trip.description}
          </p>
        </div>

        {/* Card Footer: Pricing & Action */}
        <div className="pt-3 border-t border-tertiary/40 flex items-end justify-between gap-2">
          <div>
            <span className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
              Starting from
            </span>
            <PriceDisplay
              price={trip.pricePerPerson}
              period="/ person"
              priceClassName="text-lg font-black text-primary"
              eurClassName="text-[11px] text-neutral-400"
            />
          </div>

          <div className="flex items-center gap-1 text-xs font-bold text-primary group-hover:text-secondary group-hover:translate-x-1 transition-all">
            <span>Details</span>
            <ArrowRight size={14} />
          </div>
        </div>
      </div>
    </Link>
  );
}
