"use client";

import React, { useEffect, useMemo, useState, useRef } from "react";
import L from "leaflet";
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from "react-leaflet";
import Image from "next/image";
import { useRouter } from "@/navigation";
import { MdClose, MdChevronLeft, MdChevronRight, MdMyLocation } from "react-icons/md";
import { safeListing, SafeUser } from "@/types";
import HeartButton from "../HeartButton";
import PriceDisplay from "../common/PriceDisplay";
import "leaflet/dist/leaflet.css";

// Map controller to smoothly fly to filtered bounds or center
function MapController({
  center,
  zoom,
  bounds,
  onMapClick,
}: {
  center?: [number, number];
  zoom?: number;
  bounds?: L.LatLngBoundsExpression;
  onMapClick?: () => void;
}) {
  const map = useMap();

  useMapEvents({
    click: () => {
      onMapClick?.();
    },
  });

  useEffect(() => {
    if (bounds) {
      map.flyToBounds(bounds, {
        padding: [60, 60],
        maxZoom: 13,
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
  vehicles: safeListing[];
  currentUser?: SafeUser | null;
  selectedVehicleId?: string | null;
  hoveredVehicleId?: string | null;
  onSelectVehicle?: (id: string | null) => void;
  onHoverVehicle?: (id: string | null) => void;
  center?: [number, number];
  zoom?: number;
  className?: string;
};

export default function VehiclesMap({
  vehicles,
  currentUser,
  selectedVehicleId,
  hoveredVehicleId,
  onSelectVehicle,
  onHoverVehicle,
  center,
  zoom = 7,
  className = "w-full h-full",
}: Props) {
  const router = useRouter();
  const [mapType, setMapType] = useState<"roadmap" | "satellite">("roadmap");
  const [internalSelectedId, setInternalSelectedId] = useState<string | null>(null);
  const [internalHoveredId, setInternalHoveredId] = useState<string | null>(null);
  const [previewImageIndex, setPreviewImageIndex] = useState(0);
  const [isMouseOverPopup, setIsMouseOverPopup] = useState(false);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  const activeSelectedId =
    selectedVehicleId !== undefined ? selectedVehicleId : internalSelectedId;
  const activeHoveredId =
    hoveredVehicleId !== undefined ? hoveredVehicleId : internalHoveredId;
  const activeId = activeHoveredId || activeSelectedId;

  // Active vehicle for the popup preview
  const activeVehicle = useMemo(() => {
    if (!activeId) return null;
    return vehicles.find((v) => v.id === activeId) || null;
  }, [vehicles, activeId]);

  useEffect(() => {
    setPreviewImageIndex(0);
  }, [activeVehicle?.id]);

  // Close map preview popup on click outside
  useEffect(() => {
    if (!activeId) return;

    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      const target = e.target as HTMLElement;
      if (
        popupRef.current &&
        !popupRef.current.contains(target) &&
        !target.closest(".custom-vehicle-pin")
      ) {
        handleClosePopup();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [activeId]);

  // Compute map center and bounds
  const { defaultCenter, bounds } = useMemo(() => {
    const validCoords = vehicles
      .filter((v) => v.coordinates && v.coordinates.length === 2)
      .map((v) => v.coordinates as [number, number]);

    if (validCoords.length === 0) {
      return {
        defaultCenter: center || ([34.5, 3.2] as [number, number]), // Algeria center
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
      defaultCenter: [
        leafletBounds.getCenter().lat,
        leafletBounds.getCenter().lng,
      ] as [number, number],
      bounds: leafletBounds,
    };
  }, [vehicles, center]);

  // Custom marker icon with /assets/car.png
  const createVehicleMarkerIcon = (
    price: number,
    isSelected: boolean,
    isHovered: boolean,
  ) => {
    const active = isSelected || isHovered;
    const formattedDzd =
      price >= 1000 ? `${Math.round(price / 1000)}k DZD` : `${price} DZD`;
    const eurVal = Math.round(price / 152.47);

    return L.divIcon({
      className: "custom-vehicle-pin !bg-transparent !border-none",
      html: `
        <button 
          type="button"
          class="transition-all duration-200 transform cursor-pointer font-bold text-xs px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1.5 justify-center whitespace-nowrap select-none ${
            active
              ? "bg-neutral-900 text-white scale-110 shadow-2xl ring-2 ring-accent z-50"
              : "bg-surface text-primary hover:scale-105 border border-tertiary/80 hover:border-primary hover:shadow-xl"
          }"
        >
          <img src="/assets/car.png" alt="Car" class="w-5 h-5 object-contain inline-block flex-shrink-0 ${
            active ? "brightness-0 invert" : ""
          }" />
          <span>${formattedDzd}</span>
          <span class="text-[10px] font-normal ${active ? "text-neutral-300" : "text-primary/60"}">(~€${eurVal})</span>
        </button>
      `,
      iconSize: [112, 36],
      iconAnchor: [56, 18],
    });
  };

  const handleMarkerHover = (id: string) => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
    setInternalHoveredId(id);
    onHoverVehicle?.(id);
  };

  const handleMarkerLeave = () => {
    hideTimeoutRef.current = setTimeout(() => {
      if (!isMouseOverPopup) {
        setInternalHoveredId(null);
        onHoverVehicle?.(null);
      }
    }, 250);
  };

  const handleClosePopup = () => {
    setInternalHoveredId(null);
    setInternalSelectedId(null);
    onSelectVehicle?.(null);
    onHoverVehicle?.(null);
  };

  const previewImages =
    activeVehicle?.images && activeVehicle.images.length > 0
      ? activeVehicle.images
      : activeVehicle?.imageSrc
      ? [activeVehicle.imageSrc]
      : [];

  const handlePrevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPreviewImageIndex((prev) =>
      prev > 0 ? prev - 1 : previewImages.length - 1,
    );
  };

  const handleNextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPreviewImageIndex((prev) =>
      prev < previewImages.length - 1 ? prev + 1 : 0,
    );
  };

  // Map tile URLs
  const googleRoadmapUrl =
    "https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}";
  const googleSatelliteUrl =
    "https://mt{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}";

  return (
    <div className={`relative rounded-3xl overflow-hidden shadow-sm border border-tertiary/60 bg-surface/50 ${className}`}>
      {/* Map layer toggle buttons */}
      <div className="absolute top-4 start-4 z-[400] flex items-center bg-surface/90 backdrop-blur-md rounded-full p-1 border border-tertiary/70 shadow-sm">
        <button
          type="button"
          onClick={() => setMapType("roadmap")}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold transition cursor-pointer select-none ${
            mapType === "roadmap"
              ? "bg-primary text-surface shadow-xs"
              : "text-primary/70 hover:text-primary"
          }`}
        >
          Map
        </button>
        <button
          type="button"
          onClick={() => setMapType("satellite")}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold transition cursor-pointer select-none ${
            mapType === "satellite"
              ? "bg-primary text-surface shadow-xs"
              : "text-primary/70 hover:text-primary"
          }`}
        >
          Satellite
        </button>
      </div>

      {/* Map Header Badge */}
      <div className="absolute top-4 end-4 z-[400] hidden sm:flex items-center gap-1.5 bg-surface/90 backdrop-blur-md rounded-full px-3 py-1.5 border border-tertiary/70 shadow-sm text-xs font-semibold text-primary">
        <Image
          src="/assets/car.png"
          alt="Car"
          width={18}
          height={18}
          className="w-5 h-5 object-contain inline-block"
        />
        <span>{vehicles.length} Vehicles</span>
      </div>

      {/* Interactive Map */}
      <MapContainer
        center={defaultCenter}
        zoom={zoom}
        scrollWheelZoom={true}
        className="w-full h-full min-h-[450px]"
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://maps.google.com">Google Maps</a>'
          url={mapType === "roadmap" ? googleRoadmapUrl : googleSatelliteUrl}
          subdomains={["0", "1", "2", "3"]}
          maxZoom={20}
        />

        <MapController center={center} zoom={zoom} bounds={bounds} onMapClick={handleClosePopup} />

        {vehicles.map((v) => {
          if (!v.coordinates || v.coordinates.length !== 2) return null;
          const isSelected = v.id === activeSelectedId;
          const isHovered = v.id === activeHoveredId;

          return (
            <Marker
              key={v.id}
              position={v.coordinates as [number, number]}
              icon={createVehicleMarkerIcon(v.price, isSelected, isHovered)}
              zIndexOffset={isSelected || isHovered ? 1000 : 1}
              eventHandlers={{
                click: () => {
                  setInternalSelectedId(v.id);
                  onSelectVehicle?.(v.id);
                },
                mouseover: () => handleMarkerHover(v.id),
                mouseout: handleMarkerLeave,
              }}
            />
          );
        })}
      </MapContainer>

      {/* Floating Active Vehicle Card Popup */}
      {activeVehicle && (
        <div
          ref={popupRef}
          onMouseEnter={() => {
            setIsMouseOverPopup(true);
            if (hideTimeoutRef.current) {
              clearTimeout(hideTimeoutRef.current);
              hideTimeoutRef.current = null;
            }
          }}
          onMouseLeave={() => {
            setIsMouseOverPopup(false);
            handleMarkerLeave();
          }}
          className="absolute bottom-5 start-1/2 -translate-x-1/2 z-[500] w-[310px] sm:w-[340px] bg-surface rounded-2xl shadow-2xl border border-tertiary/80 overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        >
          {/* Close button */}
          <button
            type="button"
            onClick={handleClosePopup}
            aria-label="Close preview"
            className="absolute top-2.5 end-2.5 z-20 p-1.5 rounded-full bg-surface/90 hover:bg-surface text-primary shadow-md transition cursor-pointer"
          >
            <MdClose size={16} />
          </button>

          {/* Image carousel */}
          <div
            onClick={() => router.push(`/listings/${activeVehicle.id}`)}
            className="relative aspect-[16/10] w-full bg-neutral-100 cursor-pointer group"
          >
            <Image
              src={previewImages[previewImageIndex] || activeVehicle.imageSrc}
              alt={activeVehicle.title}
              fill
              className="object-cover group-hover:scale-105 transition duration-300"
              sizes="340px"
            />

            {/* Heart Button */}
            <div className="absolute top-2.5 start-2.5 z-10">
              <HeartButton
                listingId={activeVehicle.id}
                currentUser={currentUser}
              />
            </div>

            {/* Vehicle Badge */}
            <div className="absolute bottom-2.5 start-2.5 z-10 bg-surface/95 backdrop-blur-md text-primary text-[11px] font-bold px-2.5 py-0.5 rounded-full shadow-xs flex items-center gap-1.5 border border-tertiary/40">
              <Image
                src="/assets/car.png"
                alt="Car"
                width={14}
                height={14}
                className="w-3.5 h-3.5 object-contain"
              />
              <span>{activeVehicle.city || "Algeria"}</span>
            </div>

            {/* Image Navigation Arrows */}
            {previewImages.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={handlePrevImage}
                  aria-label="Previous photo"
                  className="hidden group-hover:flex items-center justify-center p-1 rounded-full bg-surface/90 hover:bg-surface text-primary shadow-md transition absolute top-1/2 -translate-y-1/2 start-2 hover:scale-105 active:scale-95 cursor-pointer z-10"
                >
                  <MdChevronLeft size={16} className="rtl:rotate-180" />
                </button>
                <button
                  type="button"
                  onClick={handleNextImage}
                  aria-label="Next photo"
                  className="hidden group-hover:flex items-center justify-center p-1 rounded-full bg-surface/90 hover:bg-surface text-primary shadow-md transition absolute top-1/2 -translate-y-1/2 end-2 hover:scale-105 active:scale-95 cursor-pointer z-10"
                >
                  <MdChevronRight size={16} className="rtl:rotate-180" />
                </button>
              </>
            )}
          </div>

          {/* Vehicle Info */}
          <div
            onClick={() => router.push(`/listings/${activeVehicle.id}`)}
            className="p-3.5 cursor-pointer"
          >
            <div className="flex items-center justify-between gap-2">
              <h4 className="font-bold text-sm text-primary truncate">
                {activeVehicle.title}
              </h4>
              <span className="flex items-center gap-1 font-semibold text-xs text-primary flex-shrink-0">
                <span className="text-amber-500">★</span>
                <span>{activeVehicle.rating ? activeVehicle.rating.toFixed(2) : "4.95"}</span>
              </span>
            </div>

            <p className="text-xs text-primary/70 truncate mt-0.5">
              {activeVehicle.subtitle || `${activeVehicle.guestCount} seats · Automatic`}
            </p>

            <div className="mt-2.5 pt-2 border-t border-tertiary/40 flex items-center justify-between">
              <div>
                <PriceDisplay
                  price={activeVehicle.price}
                  originalPrice={activeVehicle.originalPrice}
                  period="/ day"
                  priceClassName="text-sm font-bold text-primary"
                />
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  router.push(`/listings/${activeVehicle.id}`);
                }}
                className="px-3.5 py-1.5 rounded-full bg-primary hover:bg-primary/90 text-surface text-xs font-semibold shadow-xs transition cursor-pointer flex items-center gap-1"
              >
                <span>View Details</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
