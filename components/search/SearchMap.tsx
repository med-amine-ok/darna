"use client";

import React, { useEffect, useMemo, useState, useRef } from "react";
import L from "leaflet";
import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import Image from "next/image";
import { useRouter } from "@/navigation";
import { useTranslations } from "next-intl";
import { MdClose, MdChevronLeft, MdChevronRight } from "react-icons/md";
import { safeListing, SafeUser } from "@/types";
import HeartButton from "../HeartButton";
import "leaflet/dist/leaflet.css";

// Smooth Map Controller for fluid flyTo animations between cities & bounds
function MapController({
  center,
  zoom,
  bounds,
}: {
  center?: [number, number];
  zoom?: number;
  bounds?: L.LatLngBoundsExpression;
}) {
  const map = useMap();

  useEffect(() => {
    if (bounds) {
      map.flyToBounds(bounds, {
        padding: [50, 50],
        maxZoom: 14,
        duration: 1.2,
        easeLinearity: 0.25,
      });
    } else if (center) {
      map.flyTo(center, zoom || 11, {
        duration: 1.2,
        easeLinearity: 0.25,
      });
    }
  }, [map, center, zoom, bounds]);

  return null;
}

type Props = {
  listings: safeListing[];
  currentUser?: SafeUser | null;
  selectedListingId?: string | null;
  hoveredListingId?: string | null;
  onSelectListing?: (id: string | null) => void;
  onHoverListing?: (id: string | null) => void;
  center?: [number, number];
  zoom?: number;
  className?: string;
};

export default function SearchMap({
  listings,
  currentUser,
  selectedListingId,
  hoveredListingId,
  onSelectListing,
  onHoverListing,
  center,
  zoom = 11,
  className = "w-full h-full",
}: Props) {
  const router = useRouter();
  const t = useTranslations("common");
  const tSearch = useTranslations("search");

  const [mapType, setMapType] = useState<"roadmap" | "satellite">("roadmap");
  const [internalSelectedId, setInternalSelectedId] = useState<string | null>(null);
  const [internalHoveredId, setInternalHoveredId] = useState<string | null>(null);
  const [previewImageIndex, setPreviewImageIndex] = useState(0);
  const [isMouseOverPopup, setIsMouseOverPopup] = useState(false);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const activeSelectedId = selectedListingId !== undefined ? selectedListingId : internalSelectedId;
  const activeHoveredId = hoveredListingId !== undefined ? hoveredListingId : internalHoveredId;
  const activeId = activeHoveredId || activeSelectedId;

  // Active listing for the floating preview card
  const activeListing = useMemo(() => {
    if (!activeId) return null;
    return listings.find((l) => l.id === activeId) || null;
  }, [listings, activeId]);

  // Reset preview image index when active listing changes
  useEffect(() => {
    setPreviewImageIndex(0);
  }, [activeListing?.id]);

  // Compute map center and bounds
  const { defaultCenter, bounds } = useMemo(() => {
    const validCoords = listings
      .filter((l) => l.coordinates && l.coordinates.length === 2)
      .map((l) => l.coordinates as [number, number]);

    if (validCoords.length === 0) {
      return {
        defaultCenter: center || ([36.5986, 2.4417] as [number, number]), // Tipaza default
        bounds: undefined,
      };
    }

    if (center) {
      return { defaultCenter: center, bounds: undefined };
    }

    if (validCoords.length === 1) {
      return { defaultCenter: validCoords[0], bounds: undefined };
    }

    const leafletBounds = L.latLngBounds(validCoords.map((c) => [c[0], c[1]]));
    return {
      defaultCenter: [leafletBounds.getCenter().lat, leafletBounds.getCenter().lng] as [number, number],
      bounds: leafletBounds,
    };
  }, [listings, center]);

  // Clean and responsive price badge icons
  const createPriceIcon = (price: number, isSelected: boolean, isHovered: boolean) => {
    const active = isSelected || isHovered;
    return L.divIcon({
      className: "custom-price-pin !bg-transparent !border-none",
      html: `
        <button 
          type="button"
          class="transition-all duration-200 transform cursor-pointer font-bold text-[12px] px-3 py-1.5 rounded-full shadow-md flex items-center justify-center whitespace-nowrap select-none ${
            active
              ? "bg-neutral-900 text-white scale-110 shadow-2xl ring-2 ring-white z-50"
              : "bg-white text-neutral-900 hover:scale-105 border border-neutral-300 hover:border-neutral-400 hover:shadow-lg"
          }"
        >
          $${price}
        </button>
      `,
      iconSize: [60, 30],
      iconAnchor: [30, 15],
    });
  };

  const handleMarkerHover = (id: string) => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
    setInternalHoveredId(id);
    onHoverListing?.(id);
  };

  const handleMarkerLeave = () => {
    hideTimeoutRef.current = setTimeout(() => {
      if (!isMouseOverPopup) {
        setInternalHoveredId(null);
        onHoverListing?.(null);
      }
    }, 250);
  };

  const handleClosePopup = () => {
    setInternalHoveredId(null);
    setInternalSelectedId(null);
    onSelectListing?.(null);
    onHoverListing?.(null);
  };

  const previewImages = activeListing?.images && activeListing.images.length > 0
    ? activeListing.images
    : activeListing?.imageSrc
    ? [activeListing.imageSrc]
    : [];

  const handlePrevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPreviewImageIndex((prev) => (prev > 0 ? prev - 1 : previewImages.length - 1));
  };

  const handleNextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPreviewImageIndex((prev) => (prev < previewImages.length - 1 ? prev + 1 : 0));
  };

  const twoNightsPrice = activeListing ? activeListing.price * 2 : 0;
  const originalPrice = activeListing
    ? activeListing.originalPrice
      ? activeListing.originalPrice * 2
      : Math.round(activeListing.price * 2 * 1.15)
    : 0;

  // Google Maps tile endpoints
  const googleRoadmapUrl = "https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}";
  const googleSatelliteUrl = "https://mt{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}";

  return (
    <div className={`relative overflow-hidden rounded-3xl ${className}`}>
      <MapContainer
        center={defaultCenter}
        zoom={zoom}
        scrollWheelZoom={true}
        attributionControl={false}
        className="w-full h-full min-h-[400px] z-0"
      >
        <TileLayer
          key={mapType}
          url={mapType === "roadmap" ? googleRoadmapUrl : googleSatelliteUrl}
          subdomains={["0", "1", "2", "3"]}
          maxZoom={20}
        />

        <MapController center={defaultCenter} zoom={zoom} bounds={bounds} />

        {listings.map((listing) => {
          if (!listing.coordinates || listing.coordinates.length < 2) return null;
          const isSelected = activeSelectedId === listing.id;
          const isHovered = activeHoveredId === listing.id;

          return (
            <Marker
              key={listing.id}
              position={listing.coordinates}
              icon={createPriceIcon(listing.price, isSelected, isHovered)}
              zIndexOffset={isSelected ? 1000 : isHovered ? 900 : 1}
              eventHandlers={{
                click: () => {
                  setInternalSelectedId(listing.id);
                  onSelectListing?.(listing.id);
                },
                mouseover: () => {
                  handleMarkerHover(listing.id);
                },
                mouseout: () => {
                  handleMarkerLeave();
                },
              }}
            />
          );
        })}
      </MapContainer>

      {/* Google Maps Layer Switcher Pill */}
      <div className="absolute top-4 end-4 z-[400] flex items-center bg-white/95 backdrop-blur-md p-1 rounded-2xl shadow-lg border border-neutral-200/90 text-xs font-semibold">
        <button
          type="button"
          onClick={() => setMapType("roadmap")}
          className={`px-3 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1.5 ${
            mapType === "roadmap"
              ? "bg-neutral-900 text-white shadow-xs"
              : "text-neutral-700 hover:bg-neutral-100"
          }`}
        >
          <span>Map</span>
        </button>
        <button
          type="button"
          onClick={() => setMapType("satellite")}
          className={`px-3 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1.5 ${
            mapType === "satellite"
              ? "bg-neutral-900 text-white shadow-xs"
              : "text-neutral-700 hover:bg-neutral-100"
          }`}
        >
          <span>Satellite</span>
        </button>
      </div>



      {/* Floating Detail Card on Hover / Selection */}
      {activeListing && (
        <div
          onMouseEnter={() => {
            if (hideTimeoutRef.current) {
              clearTimeout(hideTimeoutRef.current);
              hideTimeoutRef.current = null;
            }
            setIsMouseOverPopup(true);
          }}
          onMouseLeave={() => {
            setIsMouseOverPopup(false);
            setInternalHoveredId(null);
            onHoverListing?.(null);
          }}
          className="absolute top-4 start-4 sm:start-6 z-[1000] w-72 sm:w-80 bg-surface rounded-3xl shadow-2xl p-3 border border-tertiary/60 flex flex-col gap-2 animate-in fade-in zoom-in-95 duration-150"
        >
          {/* Card Top: Image Carousel */}
          <div
            className="relative aspect-[4/3] w-full rounded-2xl overflow-hidden bg-tertiary/20 cursor-pointer group"
            onClick={() => router.push(`/listings/${activeListing.id}`)}
          >
            <Image
              fill
              src={previewImages[previewImageIndex] || activeListing.imageSrc}
              alt={activeListing.title}
              className="object-cover group-hover:scale-102 transition duration-300"
              sizes="(max-width: 640px) 280px, 320px"
              priority
            />

            {/* Top-Right: Heart Button and Close X */}
            <div
              className="absolute top-2.5 end-2.5 flex items-center gap-1.5 z-20"
              onClick={(e) => e.stopPropagation()}
            >
              <HeartButton
                listingId={activeListing.id}
                currentUser={currentUser}
                variant="circle"
              />
              <button
                type="button"
                aria-label="Close"
                onClick={handleClosePopup}
                className="w-8 h-8 rounded-full bg-surface/90 hover:bg-surface text-primary shadow-md flex items-center justify-center transition cursor-pointer"
              >
                <MdClose size={16} />
              </button>
            </div>

            {/* Left & Right Arrow Buttons */}
            {previewImages.length > 1 && (
              <>
                <button
                  type="button"
                  aria-label="Previous"
                  onClick={handlePrevImage}
                  className="absolute start-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white/90 hover:bg-white text-neutral-800 shadow-md flex items-center justify-center transition z-20 cursor-pointer"
                >
                  <MdChevronLeft size={18} className="rtl:rotate-180" />
                </button>
                <button
                  type="button"
                  aria-label="Next"
                  onClick={handleNextImage}
                  className="absolute end-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white/90 hover:bg-white text-neutral-800 shadow-md flex items-center justify-center transition z-20 cursor-pointer"
                >
                  <MdChevronRight size={18} className="rtl:rotate-180" />
                </button>
              </>
            )}

            {/* Dots Indicators at bottom */}
            {previewImages.length > 1 && (
              <div className="absolute bottom-2.5 inset-x-0 flex items-center justify-center gap-1 z-20">
                {previewImages.slice(0, 5).map((_, i) => (
                  <span
                    key={i}
                    className={`h-1.5 rounded-full transition-all ${
                      i === previewImageIndex ? "w-3 bg-white" : "w-1.5 bg-white/60"
                    }`}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Card Bottom: Text and Pricing */}
          <div
            className="flex flex-col gap-0.5 cursor-pointer px-1 pt-1"
            onClick={() => router.push(`/listings/${activeListing.id}`)}
          >
            <div className="flex items-center gap-1.5">
              <img
                src="/assets/location.png"
                style={{ width: 14, height: 18 }}
                className="object-contain flex-shrink-0"
                alt=""
              />
              <h3 className="font-bold text-sm sm:text-base text-primary leading-tight truncate">
                {activeListing.category ? `${activeListing.category} in ${activeListing.city || "Tipaza"}` : activeListing.title}
              </h3>
            </div>
            <p className="text-xs text-primary/70 line-clamp-1 ms-5">
              {activeListing.title}
            </p>
            <p className="text-xs text-primary/60 ms-5">
              Feb 19 – 21
            </p>

            {/* Pricing Row with strikethrough */}
            <div className="flex items-baseline gap-1 text-xs text-primary/70 pt-1 ms-5">
              {originalPrice > twoNightsPrice && (
                <span className="line-through text-primary/40 font-normal">
                  ${originalPrice}
                </span>
              )}
              <span className="font-bold text-primary text-sm">
                ${twoNightsPrice}
              </span>
              <span>for 2 nights</span>
            </div>

            {/* Credit / Perk Tag */}
            <div className="pt-1 ms-5">
              <span className="inline-flex items-center text-xs font-semibold text-secondary-700 bg-secondary-50 px-2 py-0.5 rounded-md">
                +$75 DARNA credit
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
