"use client";

import React, { useEffect, useMemo, useState, useRef } from "react";
import L from "leaflet";
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from "react-leaflet";
import Image from "next/image";
import { useRouter } from "@/navigation";
import { useTranslations } from "next-intl";
import { MdClose, MdChevronLeft, MdChevronRight } from "react-icons/md";
import { AiFillStar } from "react-icons/ai";
import { Compass, Calendar, Users, CheckCircle, MapPin } from "lucide-react";
import { Listing, User, Trip, ListingVertical } from "@/types";
import { getTripCoordinates } from "@/lib/mock-data/trips";
import HeartButton from "@/components/HeartButton";
import PriceDisplay from "@/components/common/PriceDisplay";
import "leaflet/dist/leaflet.css";

export interface MapBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

function MapController({
  center,
  zoom,
  bounds,
  selectedCoords,
  onBoundsChange,
}: {
  center?: [number, number];
  zoom?: number;
  bounds?: L.LatLngBoundsExpression;
  selectedCoords?: [number, number];
  onBoundsChange?: (bounds: MapBounds) => void;
}) {
  const map = useMapEvents({
    moveend: () => {
      if (onBoundsChange) {
        const b = map.getBounds();
        onBoundsChange({
          north: b.getNorth(),
          south: b.getSouth(),
          east: b.getEast(),
          west: b.getWest(),
        });
      }
    },
    zoomend: () => {
      if (onBoundsChange) {
        const b = map.getBounds();
        onBoundsChange({
          north: b.getNorth(),
          south: b.getSouth(),
          east: b.getEast(),
          west: b.getWest(),
        });
      }
    },
  });

  useEffect(() => {
    if (selectedCoords) {
      map.flyTo(selectedCoords, 13, {
        duration: 1.1,
        easeLinearity: 0.25,
      });
    } else if (bounds) {
      map.flyToBounds(bounds, {
        padding: [50, 50],
        maxZoom: 13,
        duration: 1.1,
        easeLinearity: 0.25,
      });
    } else if (center) {
      map.flyTo(center, zoom || 10, {
        duration: 1.1,
        easeLinearity: 0.25,
      });
    }
  }, [map, center, zoom, bounds, selectedCoords]);

  // Initial bounds reporting
  useEffect(() => {
    const timer = setTimeout(() => {
      if (onBoundsChange) {
        const b = map.getBounds();
        onBoundsChange({
          north: b.getNorth(),
          south: b.getSouth(),
          east: b.getEast(),
          west: b.getWest(),
        });
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [map, onBoundsChange]);

  return null;
}

interface SearchMapProps {
  listings?: Listing[];
  trips?: Trip[];
  currentVertical?: ListingVertical | "all" | string;
  currentUser?: User | null;
  selectedListingId?: string | null;
  hoveredListingId?: string | null;
  onSelectListing?: (id: string | null) => void;
  onHoverListing?: (id: string | null) => void;
  onBoundsChange?: (bounds: MapBounds) => void;
  center?: [number, number];
  zoom?: number;
  className?: string;
}

export default function SearchMap({
  listings = [],
  trips = [],
  currentVertical,
  currentUser,
  selectedListingId,
  hoveredListingId,
  onSelectListing,
  onHoverListing,
  onBoundsChange,
  center,
  zoom = 11,
  className = "w-full h-full",
}: SearchMapProps) {
  const router = useRouter();
  const tNav = useTranslations("nav");

  const [mapType, setMapType] = useState<"roadmap" | "satellite">("roadmap");
  const [internalSelectedId, setInternalSelectedId] = useState<string | null>(null);
  const [internalHoveredId, setInternalHoveredId] = useState<string | null>(null);
  const [previewImageIndex, setPreviewImageIndex] = useState(0);

  // Preview card visibility tied to hover and selected item
  const [hoveredCardListingId, setHoveredCardListingId] = useState<string | null>(
    selectedListingId || null
  );
  const [isCardHovered, setIsCardHovered] = useState(false);
  const isCardHoveredRef = useRef(false);
  const leaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Sync with selectedListingId on initial open or param change
  useEffect(() => {
    if (selectedListingId) {
      setHoveredCardListingId(selectedListingId);
    }
  }, [selectedListingId]);

  // Mouse drag & touch swipe state for images
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartX = useRef<number | null>(null);
  const hasDraggedRef = useRef(false);

  // Sync with incoming hoveredListingId prop
  useEffect(() => {
    if (hoveredListingId) {
      if (leaveTimerRef.current) {
        clearTimeout(leaveTimerRef.current);
        leaveTimerRef.current = null;
      }
      setHoveredCardListingId(hoveredListingId);
    } else {
      if (leaveTimerRef.current) clearTimeout(leaveTimerRef.current);
      leaveTimerRef.current = setTimeout(() => {
        if (!isCardHoveredRef.current) {
          setHoveredCardListingId(null);
        }
      }, 250);
    }
    return () => {
      if (leaveTimerRef.current) clearTimeout(leaveTimerRef.current);
    };
  }, [hoveredListingId]);

  const activeSelectedId =
    selectedListingId !== undefined ? selectedListingId : internalSelectedId;
  const activeHoveredId =
    hoveredCardListingId || (isCardHovered ? hoveredCardListingId : null);

  // Determine which items to display on the map
  const showListings = currentVertical !== "trip";
  const showTrips = currentVertical === "trip" || currentVertical === "all" || !currentVertical;

  // Find active item (Listing or Trip) for floating preview card
  const activeItem = useMemo(() => {
    if (!activeHoveredId) return null;
    const matchedListing = listings.find((l) => l.id === activeHoveredId);
    if (matchedListing) {
      return { type: "listing" as const, data: matchedListing };
    }
    const matchedTrip = trips.find((t) => t.id === activeHoveredId);
    if (matchedTrip) {
      return { type: "trip" as const, data: matchedTrip };
    }
    return null;
  }, [listings, trips, activeHoveredId]);

  useEffect(() => {
    setPreviewImageIndex(0);
    setDragOffset(0);
  }, [activeItem?.data.id]);

  // Pointer drag swiping handlers
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    dragStartX.current = e.clientX;
    hasDraggedRef.current = false;
    setIsDragging(true);
    setDragOffset(0);
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {}
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragStartX.current === null) return;
    const diff = e.clientX - dragStartX.current;
    if (Math.abs(diff) > 5) {
      hasDraggedRef.current = true;
    }
    setDragOffset(diff);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragStartX.current === null) return;
    const diff = e.clientX - dragStartX.current;
    const SWIPE_THRESHOLD = 30;

    if (previewImages.length > 1 && Math.abs(diff) > SWIPE_THRESHOLD) {
      if (diff < 0) {
        // Dragged left -> Next image
        setPreviewImageIndex((prev) => (prev + 1) % previewImages.length);
      } else {
        // Dragged right -> Previous image
        setPreviewImageIndex((prev) => (prev - 1 + previewImages.length) % previewImages.length);
      }
    }

    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}

    dragStartX.current = null;
    setIsDragging(false);
    setDragOffset(0);
  };

  const handlePointerCancel = (e: React.PointerEvent<HTMLDivElement>) => {
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
    dragStartX.current = null;
    setIsDragging(false);
    setDragOffset(0);
  };

  const { defaultCenter, bounds } = useMemo(() => {
    const coords: [number, number][] = [];

    if (showListings) {
      listings.forEach((l) => {
        if (l.latlng && l.latlng.length === 2 && !isNaN(l.latlng[0]) && !isNaN(l.latlng[1])) {
          coords.push(l.latlng as [number, number]);
        }
      });
    }

    if (showTrips) {
      trips.forEach((t) => {
        const c = t.latlng || getTripCoordinates(t);
        if (c && c.length === 2 && !isNaN(c[0]) && !isNaN(c[1])) {
          coords.push(c as [number, number]);
        }
      });
    }

    if (coords.length === 0) {
      return {
        defaultCenter: center || ([36.5897, 2.4475] as [number, number]),
        bounds: undefined,
      };
    }

    if (center) {
      return { defaultCenter: center, bounds: undefined };
    }

    if (coords.length === 1) {
      return { defaultCenter: coords[0], bounds: undefined };
    }

    const leafletBounds = L.latLngBounds(coords.map((c) => [c[0], c[1]]));
    return {
      defaultCenter: [
        leafletBounds.getCenter().lat,
        leafletBounds.getCenter().lng,
      ] as [number, number],
      bounds: leafletBounds,
    };
  }, [listings, trips, showListings, showTrips, center]);

  const selectedCoords = useMemo(() => {
    if (activeSelectedId) {
      const matchListing = listings.find((l) => l.id === activeSelectedId);
      if (matchListing?.latlng && matchListing.latlng.length === 2) {
        return matchListing.latlng as [number, number];
      }
      const matchTrip = trips.find((t) => t.id === activeSelectedId);
      if (matchTrip) {
        const c = matchTrip.latlng || getTripCoordinates(matchTrip);
        if (c && c.length === 2) return c as [number, number];
      }
    }
    return undefined;
  }, [activeSelectedId, listings, trips]);

  const createPriceIcon = (
    price: number,
    isSelected: boolean,
    isHovered: boolean,
    isTrip: boolean = false
  ) => {
    const active = isSelected || isHovered;
    const formattedDzd =
      price >= 1000 ? `${(price / 1000).toFixed(price % 1000 === 0 ? 0 : 1)}k DZD` : `${price} DZD`;
    const eurVal = Math.round(price / 152.47);

    const tripBadge = isTrip
      ? `<svg class="w-3.5 h-3.5 ${
          active ? "text-[#D9C9B2]" : "text-[#6B7F5B]"
        } shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"></polygon></svg>`
      : "";

    return L.divIcon({
      className: "custom-price-pin !bg-transparent !border-none",
      html: `
        <button 
          type="button"
          class="cursor-pointer font-bold text-[11px] px-3.5 py-1.5 rounded-full flex items-center gap-1.5 justify-center whitespace-nowrap select-none transition-all duration-300 transform-gpu ${
            active
              ? "bg-[#2E3A2F] text-white scale-115 -translate-y-1 shadow-2xl ring-2 ring-[#C96F4F] ring-offset-1 z-50 font-extrabold"
              : "bg-white/95 backdrop-blur-xs text-[#2E3A2F] hover:scale-110 hover:-translate-y-1 border border-[#D9C9B2] hover:border-[#C96F4F] shadow-md hover:shadow-xl"
          }"
          style="transition: transform 0.28s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.25s ease, background-color 0.2s ease, border-color 0.2s ease;"
        >
          ${tripBadge}
          <span>${formattedDzd}</span>
          <span class="text-[9.5px] font-normal ${
            active ? "text-neutral-300" : "text-neutral-500"
          }">(~€${eurVal})</span>
        </button>
      `,
      iconSize: [isTrip ? 112 : 98, 34],
      iconAnchor: [isTrip ? 56 : 49, 17],
    });
  };

  const googleRoadmapUrl = "https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}";
  const googleSatelliteUrl = "https://mt{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}";

  const previewImages = useMemo(() => {
    if (!activeItem) return [];
    if (activeItem.type === "listing") {
      return Array.isArray(activeItem.data.imageSrc)
        ? activeItem.data.imageSrc
        : [activeItem.data.imageSrc];
    } else {
      const t = activeItem.data;
      const arr = [t.coverPhoto, ...(t.gallery || [])].filter(Boolean);
      return arr.length > 0 ? arr : ["/assets/template.jpeg"];
    }
  }, [activeItem]);

  return (
    <div className={`relative ${className} group overflow-hidden`}>
      <MapContainer
        center={defaultCenter}
        zoom={zoom}
        scrollWheelZoom={true}
        attributionControl={false}
        className="w-full h-full z-0"
      >
        <MapController
          center={defaultCenter}
          zoom={zoom}
          bounds={bounds}
          selectedCoords={selectedCoords}
          onBoundsChange={onBoundsChange}
        />

        <TileLayer
          key={mapType}
          url={mapType === "roadmap" ? googleRoadmapUrl : googleSatelliteUrl}
          subdomains={["0", "1", "2", "3"]}
          maxZoom={20}
        />

        {/* 1. Listing Price Bubble Pins */}
        {showListings &&
          listings.map((listing) => {
            if (!listing.latlng || listing.latlng.length !== 2) return null;
            const isSelected = listing.id === activeSelectedId;
            const isHovered = listing.id === activeHoveredId;

            return (
              <Marker
                key={listing.id}
                position={listing.latlng as L.LatLngExpression}
                icon={createPriceIcon(listing.price, isSelected, isHovered, false)}
                zIndexOffset={isSelected ? 1000 : isHovered ? 900 : 1}
                eventHandlers={{
                  click: () => {
                    router.push(`/listings/${listing.id}`);
                  },
                  mouseover: () => {
                    if (leaveTimerRef.current) {
                      clearTimeout(leaveTimerRef.current);
                      leaveTimerRef.current = null;
                    }
                    setHoveredCardListingId(listing.id);
                    if (onHoverListing) onHoverListing(listing.id);
                    else setInternalHoveredId(listing.id);
                  },
                  mouseout: () => {
                    if (leaveTimerRef.current) clearTimeout(leaveTimerRef.current);
                    leaveTimerRef.current = setTimeout(() => {
                      if (!isCardHoveredRef.current) {
                        setHoveredCardListingId(null);
                        if (onHoverListing) onHoverListing(null);
                        else setInternalHoveredId(null);
                      }
                    }, 250);
                  },
                }}
              />
            );
          })}

        {/* 2. Agency Trip Price Bubble Pins */}
        {showTrips &&
          trips.map((trip) => {
            const coords = trip.latlng || getTripCoordinates(trip);
            if (!coords || coords.length !== 2) return null;
            const isSelected = trip.id === activeSelectedId;
            const isHovered = trip.id === activeHoveredId;

            return (
              <Marker
                key={trip.id}
                position={coords as L.LatLngExpression}
                icon={createPriceIcon(trip.pricePerPerson, isSelected, isHovered, true)}
                zIndexOffset={isSelected ? 1000 : isHovered ? 900 : 2}
                eventHandlers={{
                  click: () => {
                    router.push(`/trips/${trip.id}`);
                  },
                  mouseover: () => {
                    if (leaveTimerRef.current) {
                      clearTimeout(leaveTimerRef.current);
                      leaveTimerRef.current = null;
                    }
                    setHoveredCardListingId(trip.id);
                    if (onHoverListing) onHoverListing(trip.id);
                    else setInternalHoveredId(trip.id);
                  },
                  mouseout: () => {
                    if (leaveTimerRef.current) clearTimeout(leaveTimerRef.current);
                    leaveTimerRef.current = setTimeout(() => {
                      if (!isCardHoveredRef.current) {
                        setHoveredCardListingId(null);
                        if (onHoverListing) onHoverListing(null);
                        else setInternalHoveredId(null);
                      }
                    }, 250);
                  },
                }}
              />
            );
          })}
      </MapContainer>

      {/* Floating Preview Card - Appears on hover */}
      {activeItem && (
        <div
          className="absolute bottom-5 inset-x-4 sm:inset-x-auto sm:start-5 z-[500] sm:w-84 bg-white rounded-2xl shadow-2xl border border-tertiary/70 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200 select-none"
          onMouseEnter={() => {
            if (leaveTimerRef.current) {
              clearTimeout(leaveTimerRef.current);
              leaveTimerRef.current = null;
            }
            isCardHoveredRef.current = true;
            setIsCardHovered(true);
          }}
          onMouseLeave={() => {
            isCardHoveredRef.current = false;
            setIsCardHovered(false);
            setHoveredCardListingId(null);
            if (onHoverListing) onHoverListing(null);
            else setInternalHoveredId(null);
          }}
          onClick={(e) => {
            if (hasDraggedRef.current) {
              e.stopPropagation();
              e.preventDefault();
              hasDraggedRef.current = false;
              return;
            }
            if (activeItem.type === "listing") {
              router.push(`/listings/${activeItem.data.id}`);
            } else {
              router.push(`/trips/${activeItem.data.id}`);
            }
          }}
        >
          {/* Card Image with Mouse Drag & Touch Swipe Slider */}
          <div
            className={`relative aspect-[16/10] w-full bg-neutral-100 overflow-hidden select-none group/card ${
              previewImages.length > 1 ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"
            }`}
            style={{ touchAction: "pan-y" }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerCancel}
          >
            <div
              className="relative w-full h-full pointer-events-none"
              style={{
                transform: isDragging ? `translateX(${dragOffset}px)` : "translateX(0px)",
                transition: isDragging ? "none" : "transform 0.24s cubic-bezier(0.16, 1, 0.3, 1)",
              }}
            >
              <Image
                src={previewImages[previewImageIndex] || "/assets/template.jpeg"}
                alt={activeItem.data.title}
                fill
                draggable={false}
                className="object-cover pointer-events-none select-none group-hover/card:scale-105 transition-transform duration-300"
              />
            </div>

            {/* Close Preview Button */}
            <button
              type="button"
              aria-label="Close preview"
              onClick={(e) => {
                e.stopPropagation();
                isCardHoveredRef.current = false;
                setIsCardHovered(false);
                setHoveredCardListingId(null);
                if (onHoverListing) onHoverListing(null);
                else setInternalHoveredId(null);
              }}
              className="absolute top-2.5 start-2.5 z-20 w-7 h-7 bg-white/90 hover:bg-white rounded-full flex items-center justify-center text-primary shadow-md transition cursor-pointer"
            >
              <MdClose size={16} />
            </button>

            {/* Favorite or Type Badge */}
            {activeItem.type === "listing" ? (
              <div className="absolute top-2.5 end-2.5 z-20">
                <HeartButton listingId={activeItem.data.id} currentUser={currentUser} />
              </div>
            ) : (
              <div className="absolute top-2.5 end-2.5 z-20 flex items-center gap-1 bg-black/60 backdrop-blur-md text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-xs">
                <Calendar size={11} className="text-secondary" />
                <span>
                  {activeItem.data.durationDays}D / {Math.max(1, activeItem.data.durationDays - 1)}N
                </span>
              </div>
            )}

            {/* Agency Badge on Trip Image */}
            {activeItem.type === "trip" && (
              <div className="absolute bottom-2.5 start-2.5 z-20 flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-black/60 backdrop-blur-md text-white text-[11px] font-semibold max-w-[80%] truncate">
                <CheckCircle size={12} className="text-emerald-400 shrink-0" />
                <span className="truncate">
                  {activeItem.data.organization?.name || "Verified Agency"}
                </span>
              </div>
            )}

            {/* Prev/Next arrows for preview card */}
            {previewImages.length > 1 && (
              <>
                <button
                  type="button"
                  aria-label="Previous image"
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    setPreviewImageIndex(
                      (prev) => (prev - 1 + previewImages.length) % previewImages.length
                    );
                  }}
                  className="absolute top-1/2 -translate-y-1/2 start-2 z-20 w-6 h-6 bg-white/85 hover:bg-white rounded-full flex items-center justify-center text-primary shadow-xs transition cursor-pointer"
                >
                  <MdChevronLeft size={16} className="rtl:rotate-180" />
                </button>
                <button
                  type="button"
                  aria-label="Next image"
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    setPreviewImageIndex((prev) => (prev + 1) % previewImages.length);
                  }}
                  className="absolute top-1/2 -translate-y-1/2 end-2 z-20 w-6 h-6 bg-white/85 hover:bg-white rounded-full flex items-center justify-center text-primary shadow-xs transition cursor-pointer"
                >
                  <MdChevronRight size={16} className="rtl:rotate-180" />
                </button>

                {/* Carousel Pagination Dots */}
                <div className="absolute bottom-2.5 inset-x-0 flex justify-center items-center gap-1.5 z-20 pointer-events-none">
                  {previewImages.map((_, idx) => (
                    <div
                      key={idx}
                      className={`rounded-full transition-all duration-200 ${
                        idx === previewImageIndex
                          ? "bg-white w-2.5 h-1.5 shadow-sm"
                          : "bg-white/60 w-1.5 h-1.5"
                      }`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Details */}
          <div className="p-3.5 space-y-1 cursor-pointer">
            {activeItem.type === "listing" ? (
              <>
                <div className="flex items-center justify-between gap-2">
                  <h4 className="font-bold text-sm text-primary truncate flex items-center gap-1">
                    <Image
                      src="/assets/location.png"
                      alt="Location"
                      width={13}
                      height={13}
                      className="object-contain shrink-0"
                    />
                    <span className="truncate">
                      {activeItem.data.city ? `${activeItem.data.city}, Algeria` : activeItem.data.title}
                    </span>
                  </h4>
                  <span className="flex items-center gap-1 text-xs font-semibold text-neutral-800 flex-shrink-0">
                    <AiFillStar size={13} className="text-accent" />
                    <span>{activeItem.data.rating?.toFixed(2) || "4.95"}</span>
                  </span>
                </div>

                <p className="text-xs text-neutral-500 font-normal truncate">
                  {activeItem.data.title}
                </p>

                <div className="pt-1">
                  <PriceDisplay
                    price={activeItem.data.price}
                    originalPrice={activeItem.data.originalPrice}
                    period={
                      activeItem.data.category === "vehicle"
                        ? "/ day"
                        : activeItem.data.category === "experience"
                        ? "/ person"
                        : "/ night"
                    }
                    priceClassName="font-bold text-sm text-primary"
                  />
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center justify-between gap-2">
                  <h4 className="font-bold text-sm text-primary truncate flex items-center gap-1">
                    <Compass size={14} className="text-secondary shrink-0" />
                    <span className="truncate">{activeItem.data.city}, Algeria</span>
                  </h4>
                  <span className="flex items-center gap-1 text-xs font-semibold text-neutral-800 flex-shrink-0">
                    <AiFillStar size={13} className="text-amber-500 fill-amber-500" />
                    <span>{activeItem.data.rating?.toFixed(2) || "4.98"}</span>
                  </span>
                </div>

                <p className="text-xs font-medium text-primary line-clamp-1">
                  {activeItem.data.title}
                </p>

                <div className="pt-1 flex items-baseline justify-between gap-2">
                  <PriceDisplay
                    price={activeItem.data.pricePerPerson}
                    period="/ person"
                    priceClassName="font-bold text-sm text-primary"
                  />
                  <span className="text-[10px] text-neutral-500 font-medium flex items-center gap-1">
                    <Users size={11} />
                    <span>Max {activeItem.data.maxGroupSize}</span>
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Layer Switcher */}
      <div className="absolute top-4 end-4 z-[400] flex items-center bg-white/95 backdrop-blur-md p-1 rounded-xl shadow-md border border-tertiary/70 text-xs font-semibold">
        <button
          type="button"
          onClick={() => setMapType("roadmap")}
          className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
            mapType === "roadmap"
              ? "bg-primary text-white shadow-xs"
              : "text-neutral-700 hover:bg-neutral-100"
          }`}
        >
          Map
        </button>
        <button
          type="button"
          onClick={() => setMapType("satellite")}
          className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
            mapType === "satellite"
              ? "bg-primary text-white shadow-xs"
              : "text-neutral-700 hover:bg-neutral-100"
          }`}
        >
          Satellite
        </button>
      </div>
    </div>
  );
}
