"use client";

import React, { useEffect, useMemo, useState, useRef, useCallback } from "react";
import L from "leaflet";
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from "react-leaflet";
import Image from "next/image";
import { useRouter } from "@/navigation";
import { useTranslations } from "next-intl";
import {
  BrandCloseIcon,
  BrandChevronLeftIcon,
  BrandChevronRightIcon,
  BrandStarIcon,
  BrandCompassIcon,
  BrandCalendarIcon,
  BrandUsersIcon,
  BrandCheckIcon,
  BrandPinIcon,
} from "@/components/icons";
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

export interface MapItemEntry {
  id: string;
  type: "listing" | "trip";
  data: Listing | Trip;
  price: number;
  coords: [number, number];
  title: string;
  rating?: number;
  category?: string;
  imageSrc: string;
}

export interface MapCluster {
  id: string;
  center: [number, number];
  items: MapItemEntry[];
  minPrice: number;
  count: number;
  hasTrips: boolean;
  hasListings: boolean;
}

/**
 * Calculates great-circle distance in kilometers between two lat/lng coordinates (Haversine formula)
 */
function getDistanceKm(coord1: [number, number], coord2: [number, number]): number {
  const R = 6371; // Earth radius in km
  const dLat = ((coord2[0] - coord1[0]) * Math.PI) / 180;
  const dLng = ((coord2[1] - coord1[1]) * Math.PI) / 180;
  const lat1 = (coord1[0] * Math.PI) / 180;
  const lat2 = (coord2[0] * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLng / 2) * Math.sin(dLng / 2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function isValidLatLng(coords: any): coords is [number, number] {
  if (!coords || !Array.isArray(coords) || coords.length !== 2) return false;
  const lat = Number(coords[0]);
  const lng = Number(coords[1]);
  return (
    !Number.isNaN(lat) &&
    !Number.isNaN(lng) &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

// Global safety guard for Leaflet: Prevents NaN calculations and crashes when container size is 0 or hidden
if (typeof window !== "undefined" && typeof (L as any)?.Map?.prototype !== "undefined") {
  const mapProto = L.Map.prototype as any;
  if (!mapProto._darnaGuarded) {
    mapProto._darnaGuarded = true;

    // Guard getBoundsZoom to never produce NaN or divide-by-zero zoom levels
    const origGetBoundsZoom = mapProto.getBoundsZoom;
    mapProto.getBoundsZoom = function (bounds: any, inside?: boolean, padding?: any) {
      try {
        const size = this.getSize();
        const pad = L.point(padding || [0, 0]);
        if (!size || size.x <= pad.x || size.y <= pad.y) {
          return this.getZoom() || 11;
        }
        const result = origGetBoundsZoom.call(this, bounds, inside, padding);
        return isNaN(result) || !isFinite(result) ? (this.getZoom() || 11) : result;
      } catch {
        return this.getZoom() || 11;
      }
    };

    // Guard flyTo from running animation loop when container size is 0x0 or coords are invalid
    const origFlyTo = mapProto.flyTo;
    mapProto.flyTo = function (targetCenter: any, targetZoom?: any, options?: any) {
      try {
        if (!targetCenter || !isValidLatLng(targetCenter)) {
          return this;
        }
        const size = this.getSize();
        if (!size || size.x <= 0 || size.y <= 0) {
          return this.setView(targetCenter, targetZoom || this.getZoom() || 11, { animate: false });
        }
        return origFlyTo.call(this, targetCenter, targetZoom, options);
      } catch {
        try {
          if (targetCenter && isValidLatLng(targetCenter)) {
            return this.setView(targetCenter, targetZoom || this.getZoom() || 11, { animate: false });
          }
        } catch {}
        return this;
      }
    };

    // Guard flyToBounds
    const origFlyToBounds = mapProto.flyToBounds;
    mapProto.flyToBounds = function (bounds: any, options?: any) {
      try {
        if (!bounds || (typeof bounds.isValid === "function" && !bounds.isValid())) {
          return this;
        }
        const size = this.getSize();
        if (!size || size.x <= 0 || size.y <= 0) {
          const center = typeof bounds.getCenter === "function" ? bounds.getCenter() : null;
          if (center && isValidLatLng([center.lat, center.lng])) {
            return this.setView(center, this.getZoom() || 11, { animate: false });
          }
          return this;
        }
        return origFlyToBounds.call(this, bounds, options);
      } catch {
        return this;
      }
    };

    // Guard fitBounds
    const origFitBounds = mapProto.fitBounds;
    mapProto.fitBounds = function (bounds: any, options?: any) {
      try {
        if (!bounds || (typeof bounds.isValid === "function" && !bounds.isValid())) {
          return this;
        }
        const size = this.getSize();
        if (!size || size.x <= 0 || size.y <= 0) {
          const center = typeof bounds.getCenter === "function" ? bounds.getCenter() : null;
          if (center && isValidLatLng([center.lat, center.lng])) {
            return this.setView(center, this.getZoom() || 11, { animate: false });
          }
          return this;
        }
        return origFitBounds.call(this, bounds, options);
      } catch {
        return this;
      }
    };
  }
}

function MapController({
  center,
  zoom,
  bounds,
  selectedCoords,
  mapFocus,
  isVisible,
  onBoundsChange,
  onMapClick,
  onZoomChange,
}: {
  center?: [number, number];
  zoom?: number;
  bounds?: L.LatLngBoundsExpression;
  selectedCoords?: [number, number];
  mapFocus?: { coords: [number, number]; zoom: number; key: number } | null;
  isVisible?: boolean;
  onBoundsChange?: (bounds: MapBounds) => void;
  onMapClick?: () => void;
  onZoomChange?: (zoom: number) => void;
}) {
  const map = useMapEvents({
    click: () => {
      if (onMapClick) onMapClick();
    },
    moveend: () => {
      if (!onBoundsChange || isVisible === false) return;
      try {
        const size = map.getSize();
        if (!size || size.x <= 0 || size.y <= 0) return;
        const b = map.getBounds();
        if (b && typeof b.isValid === "function" && b.isValid()) {
          onBoundsChange({
            north: b.getNorth(),
            south: b.getSouth(),
            east: b.getEast(),
            west: b.getWest(),
          });
        }
      } catch {}
    },
    zoomend: () => {
      if (onZoomChange) {
        try {
          onZoomChange(map.getZoom());
        } catch {}
      }
      if (!onBoundsChange || isVisible === false) return;
      try {
        const size = map.getSize();
        if (!size || size.x <= 0 || size.y <= 0) return;
        const b = map.getBounds();
        if (b && typeof b.isValid === "function" && b.isValid()) {
          onBoundsChange({
            north: b.getNorth(),
            south: b.getSouth(),
            east: b.getEast(),
            west: b.getWest(),
          });
        }
      } catch {}
    },
  });

  const reportBounds = useCallback(() => {
    if (!onBoundsChange || isVisible === false) return;
    try {
      const size = map.getSize();
      if (!size || size.x <= 0 || size.y <= 0) return;
      const b = map.getBounds();
      if (b && typeof b.isValid === "function" && b.isValid()) {
        onBoundsChange({
          north: b.getNorth(),
          south: b.getSouth(),
          east: b.getEast(),
          west: b.getWest(),
        });
      }
    } catch {}
  }, [map, onBoundsChange, isVisible]);

  // Observe map container size changes to automatically invalidate size
  useEffect(() => {
    if (!map) return;
    const container = map.getContainer();
    if (!container || typeof ResizeObserver === "undefined") return;

    let resizeTimer: any = null;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          clearTimeout(resizeTimer);
          resizeTimer = setTimeout(() => {
            try {
              map.invalidateSize();
            } catch {}
          }, 80);
        }
      }
    });

    observer.observe(container);
    return () => {
      clearTimeout(resizeTimer);
      observer.disconnect();
    };
  }, [map]);

  // Auto invalidate size on mount
  useEffect(() => {
    if (!map) return;
    const timer = setTimeout(() => {
      try {
        map.invalidateSize();
      } catch {}
    }, 250);

    return () => clearTimeout(timer);
  }, [map]);

  useEffect(() => {
    try {
      const size = map.getSize();
      const canAnimate = size && size.x > 0 && size.y > 0;

      if (mapFocus?.coords && isValidLatLng(mapFocus.coords)) {
        if (canAnimate) {
          map.flyTo(mapFocus.coords, mapFocus.zoom || 12, {
            duration: 1.1,
            easeLinearity: 0.25,
          });
        } else {
          map.setView(mapFocus.coords, mapFocus.zoom || 12, { animate: false });
        }
        return;
      }

      if (selectedCoords && isValidLatLng(selectedCoords)) {
        if (canAnimate) {
          map.flyTo(selectedCoords, 13, {
            duration: 1.1,
            easeLinearity: 0.25,
          });
        } else {
          map.setView(selectedCoords, 13, { animate: false });
        }
      } else if (bounds && typeof (bounds as any).isValid === "function" && (bounds as any).isValid()) {
        if (canAnimate) {
          map.flyToBounds(bounds, {
            padding: [50, 50],
            maxZoom: 13,
            duration: 1.1,
            easeLinearity: 0.25,
          });
        } else {
          map.fitBounds(bounds, { padding: [50, 50], maxZoom: 13, animate: false });
        }
      } else if (center && isValidLatLng(center)) {
        if (canAnimate) {
          map.flyTo(center, zoom || 10, {
            duration: 1.1,
            easeLinearity: 0.25,
          });
        } else {
          map.setView(center, zoom || 10, { animate: false });
        }
      }
    } catch (err) {
      console.warn("Map fly navigation prevented invalid coordinate:", err);
    }
  }, [map, center, zoom, bounds, selectedCoords, mapFocus]);

  // Initial bounds and zoom reporting
  useEffect(() => {
    if (isVisible === false) return;
    if (onZoomChange) {
      try {
        onZoomChange(map.getZoom());
      } catch {}
    }
    const timer = setTimeout(() => {
      reportBounds();
    }, 400);
    return () => clearTimeout(timer);
  }, [map, isVisible, reportBounds, onZoomChange]);

  useEffect(() => {
    if (isVisible !== false) {
      const timer = setTimeout(() => {
        try {
          map.invalidateSize();
          reportBounds();
        } catch {}
      }, 120);
      return () => clearTimeout(timer);
    }
  }, [isVisible, map, reportBounds]);

  return null;
}

interface SearchMapProps {
  listings?: Listing[];
  trips?: Trip[];
  currentVertical?: ListingVertical | "all" | string;
  currentUser?: User | null;
  selectedListingId?: string | null;
  hoveredListingId?: string | null;
  isVisible?: boolean;
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
  isVisible,
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
  const [internalHoveredId, setInternalHoveredId] = useState<string | null>(null);
  const [previewImageIndex, setPreviewImageIndex] = useState(0);
  const [mapFocus, setMapFocus] = useState<{ coords: [number, number]; zoom: number; key: number } | null>(null);
  const [mapZoom, setMapZoom] = useState<number>(zoom || 10);

  // Preview card visibility is strictly tied to click selection (never on hover)
  const [clickedCardId, setClickedCardId] = useState<string | null>(
    selectedListingId || null
  );

  // Sync with selectedListingId prop if provided from parent
  useEffect(() => {
    if (selectedListingId !== undefined) {
      setClickedCardId(selectedListingId);
    }
  }, [selectedListingId]);

  // Mouse drag & touch swipe state for images
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartX = useRef<number | null>(null);
  const hasDraggedRef = useRef(false);

  // Sync with incoming hoveredListingId prop for pin highlight only
  useEffect(() => {
    if (hoveredListingId !== undefined) {
      setInternalHoveredId(hoveredListingId);
    }
  }, [hoveredListingId]);

  // Determine which items to display on the map
  const showListings = currentVertical !== "trip";
  const showTrips = currentVertical === "trip" || currentVertical === "all" || !currentVertical;

  // Find active item (Listing or Trip) for floating preview card - ONLY when clicked!
  const activeItem = useMemo(() => {
    if (!clickedCardId) return null;
    const matchedListing = listings.find((l) => l.id === clickedCardId);
    if (matchedListing) {
      return { type: "listing" as const, data: matchedListing };
    }
    const matchedTrip = trips.find((t) => t.id === clickedCardId);
    if (matchedTrip) {
      return { type: "trip" as const, data: matchedTrip };
    }
    return null;
  }, [listings, trips, clickedCardId]);

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
        if (isValidLatLng(l.latlng)) {
          coords.push([Number(l.latlng[0]), Number(l.latlng[1])]);
        }
      });
    }

    if (showTrips) {
      trips.forEach((t) => {
        const c = t.latlng || getTripCoordinates(t);
        if (isValidLatLng(c)) {
          coords.push([Number(c[0]), Number(c[1])]);
        }
      });
    }

    const fallbackCenter: [number, number] =
      center && isValidLatLng(center) ? center : [36.7538, 3.0588];

    if (coords.length === 0) {
      return {
        defaultCenter: fallbackCenter,
        bounds: undefined,
      };
    }

    if (center && isValidLatLng(center)) {
      return { defaultCenter: center, bounds: undefined };
    }

    if (coords.length === 1) {
      return { defaultCenter: coords[0], bounds: undefined };
    }

    try {
      const leafletBounds = L.latLngBounds(coords.map((c) => [c[0], c[1]]));
      if (leafletBounds.isValid()) {
        const c = leafletBounds.getCenter();
        if (isValidLatLng([c.lat, c.lng])) {
          return {
            defaultCenter: [c.lat, c.lng] as [number, number],
            bounds: leafletBounds,
          };
        }
      }
    } catch {}

    return {
      defaultCenter: fallbackCenter,
      bounds: undefined,
    };
  }, [listings, trips, showListings, showTrips, center]);

  const selectedCoords = useMemo(() => {
    if (clickedCardId) {
      const matchListing = listings.find((l) => l.id === clickedCardId);
      if (matchListing?.latlng && isValidLatLng(matchListing.latlng)) {
        return [Number(matchListing.latlng[0]), Number(matchListing.latlng[1])] as [number, number];
      }
      const matchTrip = trips.find((t) => t.id === clickedCardId);
      if (matchTrip) {
        const c = matchTrip.latlng || getTripCoordinates(matchTrip);
        if (isValidLatLng(c)) return [Number(c[0]), Number(c[1])] as [number, number];
      }
    }
    return undefined;
  }, [clickedCardId, listings, trips]);

  const [expandedClusterId, setExpandedClusterId] = useState<string | null>(null);

  // Group active listings and trips
  const activeMapItems = useMemo<MapItemEntry[]>(() => {
    const list: MapItemEntry[] = [];

    if (showListings) {
      listings.forEach((listing) => {
        if (isValidLatLng(listing.latlng)) {
          const imgs = Array.isArray(listing.imageSrc) ? listing.imageSrc : [listing.imageSrc];
          list.push({
            id: listing.id,
            type: "listing",
            data: listing,
            price: listing.price,
            coords: [Number(listing.latlng[0]), Number(listing.latlng[1])],
            title: listing.title,
            rating: listing.rating,
            category: listing.category,
            imageSrc: imgs[0] || "/assets/template.jpeg",
          });
        }
      });
    }

    if (showTrips) {
      trips.forEach((trip) => {
        const coords = trip.latlng || getTripCoordinates(trip);
        if (isValidLatLng(coords)) {
          const imgs = [trip.coverPhoto, ...(trip.gallery || [])].filter(Boolean);
          list.push({
            id: trip.id,
            type: "trip",
            data: trip,
            price: trip.pricePerPerson,
            coords: [Number(coords[0]), Number(coords[1])],
            title: trip.title,
            rating: trip.rating,
            category: "trip",
            imageSrc: imgs[0] || "/assets/template.jpeg",
          });
        }
      });
    }

    return list;
  }, [listings, trips, showListings, showTrips]);

  // Individual items with micro-offset for overlapping properties (< 0.0006 deg)
  const renderedItems = useMemo(() => {
    return activeMapItems.map((item) => {
      const sameSpot = activeMapItems.filter(
        (other) =>
          Math.hypot(other.coords[0] - item.coords[0], other.coords[1] - item.coords[1]) < 0.0006
      );
      if (sameSpot.length > 1) {
        const subIdx = sameSpot.findIndex((s) => s.id === item.id);
        const subTotal = sameSpot.length;
        const angle = (2 * Math.PI * subIdx) / subTotal - Math.PI / 2;
        const microOffset = 0.0005; // ~40m micro-offset so overlapping pins don't completely occlude each other
        const cosLat = Math.cos((item.coords[0] * Math.PI) / 180) || 1;
        return {
          ...item,
          displayCoords: [
            item.coords[0] + microOffset * Math.cos(angle),
            item.coords[1] + (microOffset * Math.sin(angle)) / cosLat,
          ] as [number, number],
        };
      }
      return {
        ...item,
        displayCoords: item.coords,
      };
    });
  }, [activeMapItems]);

  // Cluster properties within a 10 km range to calculate counts of a place
  const CLUSTER_RANGE_KM = 10; // 10 km range to calculate counts of a locality/place

  const clusters = useMemo<MapCluster[]>(() => {
    const result: MapCluster[] = [];

    for (const item of activeMapItems) {
      // Find closest existing cluster within 10 km
      let closestCluster: MapCluster | null = null;
      let minDistance = CLUSTER_RANGE_KM;

      for (const c of result) {
        const dist = getDistanceKm(c.center, item.coords);
        if (dist <= minDistance) {
          minDistance = dist;
          closestCluster = c;
        }
      }

      if (closestCluster !== null) {
        const target: MapCluster = closestCluster;
        target.items.push(item);
        target.count = target.items.length;
        target.minPrice = Math.min(target.minPrice, item.price);
        if (item.type === "trip") target.hasTrips = true;
        if (item.type === "listing") target.hasListings = true;
        // Recalculate geographic centroid for the cluster badge
        const sumLat = target.items.reduce((acc, curr) => acc + curr.coords[0], 0);
        const sumLng = target.items.reduce((acc, curr) => acc + curr.coords[1], 0);
        target.center = [
          sumLat / target.items.length,
          sumLng / target.items.length,
        ];
      } else {
        result.push({
          id: `cluster_${item.coords[0].toFixed(4)}_${item.coords[1].toFixed(4)}`,
          center: [item.coords[0], item.coords[1]],
          items: [item],
          minPrice: item.price,
          count: 1,
          hasTrips: item.type === "trip",
          hasListings: item.type === "listing",
        });
      }
    }

    return result;
  }, [activeMapItems]);

  const createPriceIcon = (
    price: number,
    isSelected: boolean,
    isHovered: boolean,
    isTrip: boolean = false
  ) => {
    const active = isSelected || isHovered;
    const formattedDzd =
      price >= 1000 ? `${(price / 1000).toFixed(price % 1000 === 0 ? 0 : 1)}k DZD` : `${price} DZD`;

    const tripBadge = isTrip
      ? `<svg class="w-3 h-3 ${
          active ? "text-[#D9C9B2]" : "text-[#6B7F5B]"
        } shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"></polygon></svg>`
      : "";

    return L.divIcon({
      className: `custom-price-pin !bg-transparent !border-none ${active ? "is-active" : ""}`,
      html: `
        <button 
          type="button"
          class="price-pin-btn cursor-pointer font-extrabold text-[11.5px] px-3 py-1.5 rounded-full flex items-center gap-1.5 justify-center whitespace-nowrap select-none border transition-all ${
            active
              ? "bg-[#2E3A2F] text-white border-[#C96F4F] ring-2 ring-[#C96F4F]/40 shadow-xl"
              : "bg-white text-[#2E3A2F] border-[#D9C9B2]/90 hover:border-[#C96F4F] shadow-sm hover:shadow-lg"
          }"
        >
          ${tripBadge}
          <span class="tracking-tight">${formattedDzd}</span>
        </button>
      `,
      iconSize: [isTrip ? 88 : 74, 30],
      iconAnchor: [isTrip ? 44 : 37, 15],
    });
  };

  const createClusterIcon = (
    count: number,
    isSelected: boolean,
    isHovered: boolean
  ) => {
    const active = isSelected || isHovered;

    return L.divIcon({
      className: `custom-cluster-pin !bg-transparent !border-none ${active ? "is-active" : ""}`,
      html: `
        <button 
          type="button"
          class="cluster-pin-btn cursor-pointer w-8 h-8 rounded-full flex items-center justify-center font-black text-xs text-white shadow-md bg-[#C96F4F] hover:bg-[#B55F40] ring-2 ring-white/90 transition-transform duration-200"
          aria-label="${count} properties"
        >
          <span>${count}</span>
        </button>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
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
          mapFocus={mapFocus}
          isVisible={isVisible}
          onBoundsChange={onBoundsChange}
          onZoomChange={(currentZoom) => {
            setMapZoom(currentZoom);
            if (currentZoom < 11 && expandedClusterId) {
              setExpandedClusterId(null);
            }
          }}
          onMapClick={() => {
            setClickedCardId(null);
            onSelectListing?.(null);
            setExpandedClusterId(null);
          }}
        />

        <TileLayer
          key={mapType}
          url={mapType === "roadmap" ? googleRoadmapUrl : googleSatelliteUrl}
          subdomains={["0", "1", "2", "3"]}
          maxZoom={20}
        />

        {/* 1. Clustered & Individual Price Bubble Pins */}
        {mapZoom >= 11 ? (
          // When zoomed in: ALL properties appear as their normal price pins ("like usual without count button")
          renderedItems.map((item) => {
            const isSelected = item.id === clickedCardId;
            const isHovered = item.id === internalHoveredId;

            return (
              <Marker
                key={item.id}
                position={item.displayCoords as L.LatLngExpression}
                icon={createPriceIcon(item.price, isSelected, isHovered, item.type === "trip")}
                zIndexOffset={isSelected ? 1000 : isHovered ? 900 : 1}
                eventHandlers={{
                  click: () => {
                    setClickedCardId(item.id);
                    onSelectListing?.(item.id);
                  },
                  mouseover: () => {
                    setInternalHoveredId(item.id);
                    onHoverListing?.(item.id);
                  },
                  mouseout: () => {
                    setInternalHoveredId(null);
                    onHoverListing?.(null);
                  },
                }}
              />
            );
          })
        ) : (
          clusters.map((cluster) => {
            // A: Single-item pin
            if (cluster.count === 1) {
              const item = cluster.items[0];
              const isSelected = item.id === clickedCardId;
              const isHovered = item.id === internalHoveredId;

              return (
                <Marker
                  key={item.id}
                  position={cluster.center as L.LatLngExpression}
                  icon={createPriceIcon(item.price, isSelected, isHovered, item.type === "trip")}
                  zIndexOffset={isSelected ? 1000 : isHovered ? 900 : 1}
                  eventHandlers={{
                    click: () => {
                      setClickedCardId(item.id);
                      onSelectListing?.(item.id);
                    },
                    mouseover: () => {
                      setInternalHoveredId(item.id);
                      onHoverListing?.(item.id);
                    },
                    mouseout: () => {
                      setInternalHoveredId(null);
                      onHoverListing?.(null);
                    },
                  }}
                />
              );
            }

            // B: Multi-item cluster (within 10 km range)
            const isExpanded = expandedClusterId === cluster.id;
            const isSelected = cluster.items.some((i) => i.id === clickedCardId);
            const isHovered = cluster.items.some((i) => i.id === internalHoveredId);

            if (!isExpanded) {
              return (
                <Marker
                  key={cluster.id}
                  position={cluster.center as L.LatLngExpression}
                  icon={createClusterIcon(cluster.count, isSelected, isHovered)}
                  zIndexOffset={isHovered ? 950 : 50}
                  eventHandlers={{
                    click: (e) => {
                      setExpandedClusterId(cluster.id);

                      // Smoothly zoom in to this 10 km locality and fit its properties
                      if (cluster.items.length > 1) {
                        const validCoords = cluster.items
                          .map((i) => i.coords)
                          .filter(isValidLatLng);
                        if (validCoords.length > 0 && e.target?._map) {
                          try {
                            const b = L.latLngBounds(validCoords);
                            if (b.isValid()) {
                              e.target._map.fitBounds(b, {
                                padding: [60, 60],
                                maxZoom: 14,
                              });
                            }
                          } catch {}
                        }
                      } else if (isValidLatLng(cluster.center)) {
                        setMapFocus({
                          coords: cluster.center,
                          zoom: 14,
                          key: Date.now(),
                        });
                      }
                    },
                    mouseover: () => {
                      setInternalHoveredId(cluster.items[0].id);
                      onHoverListing?.(cluster.items[0].id);
                    },
                    mouseout: () => {
                      setInternalHoveredId(null);
                      onHoverListing?.(null);
                    },
                  }}
                />
              );
            }

            // C: Expanded multi-item cluster - appears "like usual" (standard price pins), not count!
            return (
              <React.Fragment key={cluster.id}>
                {cluster.items.map((item) => {
                  const overlappingItems = cluster.items.filter(
                    (other) =>
                      Math.hypot(other.coords[0] - item.coords[0], other.coords[1] - item.coords[1]) < 0.0007
                  );

                  let displayCoords: [number, number] = item.coords;
                  if (overlappingItems.length > 1) {
                    const subIdx = overlappingItems.findIndex((o) => o.id === item.id);
                    const subTotal = overlappingItems.length;
                    const angle = (2 * Math.PI * subIdx) / subTotal - Math.PI / 2;
                    const microOffset = 0.0006;
                    const cosLat = Math.cos((item.coords[0] * Math.PI) / 180) || 1;
                    displayCoords = [
                      item.coords[0] + microOffset * Math.cos(angle),
                      item.coords[1] + (microOffset * Math.sin(angle)) / cosLat,
                    ];
                  }

                  const itemSelected = item.id === clickedCardId;
                  const itemHovered = item.id === internalHoveredId;

                  return (
                    <Marker
                      key={item.id}
                      position={displayCoords as L.LatLngExpression}
                      icon={createPriceIcon(item.price, itemSelected, itemHovered, item.type === "trip")}
                      zIndexOffset={itemSelected ? 1000 : itemHovered ? 900 : 700}
                      eventHandlers={{
                        click: () => {
                          setClickedCardId(item.id);
                          onSelectListing?.(item.id);
                        },
                        mouseover: () => {
                          setInternalHoveredId(item.id);
                          onHoverListing?.(item.id);
                        },
                        mouseout: () => {
                          setInternalHoveredId(null);
                          onHoverListing?.(null);
                        },
                      }}
                    />
                  );
                })}
              </React.Fragment>
            );
          })
        )}
      </MapContainer>

      {/* Floating Preview Card - Strictly appears on CLICK with smooth motion */}
      {activeItem && (
        <div
          className="absolute bottom-5 inset-x-4 sm:inset-x-auto sm:start-5 z-[500] sm:w-84 bg-white rounded-2xl shadow-2xl border border-tertiary/70 overflow-hidden select-none transition-all duration-300 ease-out transform animate-in fade-in zoom-in-95 slide-in-from-bottom-5"
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
                setClickedCardId(null);
                onSelectListing?.(null);
              }}
              className="absolute top-2.5 start-2.5 z-20 w-7 h-7 bg-white/90 hover:bg-white rounded-full flex items-center justify-center text-primary shadow-md transition cursor-pointer"
            >
              <BrandCloseIcon size={16} strokeWidth={2.2} />
            </button>

            {/* Favorite or Type Badge */}
            {activeItem.type === "listing" ? (
              <div className="absolute top-2.5 end-2.5 z-20">
                <HeartButton listingId={activeItem.data.id} currentUser={currentUser} />
              </div>
            ) : (
              <div className="absolute top-2.5 end-2.5 z-20 flex items-center gap-1 bg-black/60 backdrop-blur-md text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-xs">
                <BrandCalendarIcon size={11} strokeWidth={2} className="text-secondary" />
                <span>
                  {activeItem.data.durationDays}D / {Math.max(1, activeItem.data.durationDays - 1)}N
                </span>
              </div>
            )}

            {/* Agency Badge on Trip Image */}
            {activeItem.type === "trip" && (
              <div className="absolute bottom-2.5 start-2.5 z-20 flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-black/60 backdrop-blur-md text-white text-[11px] font-semibold max-w-[80%] truncate">
                <BrandCheckIcon size={12} strokeWidth={2.5} className="text-emerald-400 shrink-0" />
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
                  <BrandChevronLeftIcon size={16} strokeWidth={2.2} className="rtl:rotate-180" />
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
                  <BrandChevronRightIcon size={16} strokeWidth={2.2} className="rtl:rotate-180" />
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
                    <BrandPinIcon
                      size={13}
                      strokeWidth={2}
                      className="text-accent shrink-0"
                    />
                    <span className="truncate">
                      {activeItem.data.city ? `${activeItem.data.city}, Algeria` : activeItem.data.title}
                    </span>
                  </h4>
                  <span className="flex items-center gap-1 text-xs font-semibold text-neutral-800 flex-shrink-0">
                    <BrandStarIcon size={13} className="fill-accent text-accent" />
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
                    <BrandCompassIcon size={14} className="text-secondary shrink-0" />
                    <span className="truncate">{activeItem.data.city}, Algeria</span>
                  </h4>
                  <span className="flex items-center gap-1 text-xs font-semibold text-neutral-800 flex-shrink-0">
                    <BrandStarIcon size={13} className="fill-accent text-accent" />
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
                    <BrandUsersIcon size={12} strokeWidth={1.8} />
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
