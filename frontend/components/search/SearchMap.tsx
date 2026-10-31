"use client";

import React, { useEffect, useId, useMemo, useState, useRef, useCallback } from "react";
import L from "leaflet";
import { MapContainer, Marker, useMap, useMapEvents } from "react-leaflet";
import OpenFreeMapLayer from "@/components/map/OpenFreeMapLayer";
import Image from "next/image";
import { Link, useRouter } from "@/navigation";
import { useLocale, useTranslations } from "next-intl";
import { AnimatePresence, m } from "framer-motion";
import { formatDzd } from "@/lib/currency";
import { formatRating, intlLocale } from "@/lib/i18n/date-locale";
import { priceSuffixKey } from "@/components/listing/cardLabels";
import {
  BrandCloseIcon,
  BrandChevronLeftIcon,
  BrandChevronRightIcon,
  BrandStarIcon,
  BrandCalendarIcon,
  BrandUsersIcon,
  BrandCheckIcon,
  BrandPlusIcon,
  BrandMinusIcon,
} from "@/components/icons";
import { Listing, User, Trip, ListingVertical } from "@/types";
import { getTripCoordinates } from "@/lib/trip-coordinates";
import HeartButton from "@/components/HeartButton";
import PriceDisplay from "@/components/common/PriceDisplay";
import { useShowTotalPrice } from "@/hook/useShowTotalPrice";
import { cn } from "@/components/ui/cn";
import { Switch } from "@/components/ui/Choice";
import { dur, ease } from "@/lib/motion";
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
}

/** Great-circle distance in km (Haversine). */
function getDistanceKm(a: [number, number], b: [number, number]): number {
  const rad = Math.PI / 180;
  const dLat = (b[0] - a[0]) * rad;
  const dLng = (b[1] - a[1]) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a[0] * rad) * Math.cos(b[0] * rad) * Math.sin(dLng / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(h));
}

/** Escapes text interpolated into Leaflet divIcon HTML strings. */
function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);
}

export function isValidLatLng(coords: unknown): coords is [number, number] {
  if (!coords || !Array.isArray(coords) || coords.length !== 2) return false;
  const lat = Number(coords[0]);
  const lng = Number(coords[1]);
  return Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

// Global safety guard for Leaflet: no NaN zooms or animation loops while the container is 0×0 (hidden).
if (typeof window !== "undefined" && typeof (L as any)?.Map?.prototype !== "undefined") {
  const mapProto = L.Map.prototype as any;
  if (!mapProto._darnaGuarded) {
    mapProto._darnaGuarded = true;

    const origGetBoundsZoom = mapProto.getBoundsZoom;
    mapProto.getBoundsZoom = function (bounds: any, inside?: boolean, padding?: any) {
      try {
        const size = this.getSize();
        const pad = L.point(padding || [0, 0]);
        if (!size || size.x <= pad.x || size.y <= pad.y) return this.getZoom() || 11;
        const result = origGetBoundsZoom.call(this, bounds, inside, padding);
        return isNaN(result) || !isFinite(result) ? this.getZoom() || 11 : result;
      } catch {
        return this.getZoom() || 11;
      }
    };

    const origFlyTo = mapProto.flyTo;
    mapProto.flyTo = function (targetCenter: any, targetZoom?: any, options?: any) {
      try {
        const asArray = Array.isArray(targetCenter) ? targetCenter : targetCenter ? [targetCenter.lat, targetCenter.lng] : null;
        if (!asArray || !isValidLatLng(asArray)) return this;
        const size = this.getSize();
        if (!size || size.x <= 0 || size.y <= 0) {
          return this.setView(targetCenter, targetZoom || this.getZoom() || 11, { animate: false });
        }
        return origFlyTo.call(this, targetCenter, targetZoom, options);
      } catch {
        return this;
      }
    };

    for (const name of ["flyToBounds", "fitBounds"] as const) {
      const orig = mapProto[name];
      mapProto[name] = function (bounds: any, options?: any) {
        try {
          if (!bounds || (typeof bounds.isValid === "function" && !bounds.isValid())) return this;
          const size = this.getSize();
          if (!size || size.x <= 0 || size.y <= 0) {
            const center = typeof bounds.getCenter === "function" ? bounds.getCenter() : null;
            if (center && isValidLatLng([center.lat, center.lng])) {
              return this.setView(center, this.getZoom() || 11, { animate: false });
            }
            return this;
          }
          return orig.call(this, bounds, options);
        } catch {
          return this;
        }
      };
    }
  }
}

function readBounds(map: L.Map): MapBounds | null {
  try {
    const size = map.getSize();
    if (!size || size.x <= 0 || size.y <= 0) return null;
    const b = map.getBounds();
    if (!b || !b.isValid()) return null;
    return { north: b.getNorth(), south: b.getSouth(), east: b.getEast(), west: b.getWest() };
  } catch {
    return null;
  }
}

/**
 * Drives the camera and reports bounds. Bounds are only reported after the *user* moves the
 * map (drag, wheel, pinch, double-click or our zoom buttons): programmatic fits never filter
 * the list, so it can't go blank before the map has settled (UI-AUDIT bug 1).
 */
function MapController({
  fitKey,
  center,
  zoom,
  bounds,
  selectedCoords,
  isVisible,
  onBoundsChange,
  onMapClick,
  onZoomChange,
  onMapReady,
}: {
  fitKey: string;
  center: [number, number];
  zoom: number;
  bounds?: L.LatLngBounds;
  selectedCoords?: [number, number];
  isVisible?: boolean;
  onBoundsChange?: (bounds: MapBounds) => void;
  onMapClick?: () => void;
  onZoomChange?: (zoom: number) => void;
  onMapReady?: (map: L.Map) => void;
}) {
  const userMoved = useRef(false);

  const map = useMapEvents({
    click: () => onMapClick?.(),
    dragstart: () => {
      userMoved.current = true;
    },
    zoomend: () => onZoomChange?.(map.getZoom()),
    moveend: () => {
      if (!userMoved.current || isVisible === false || !onBoundsChange) return;
      const b = readBounds(map);
      if (b) onBoundsChange(b);
    },
  });

  useEffect(() => {
    onMapReady?.(map);
  }, [map, onMapReady]);

  // Wheel / pinch / double-click count as user moves too.
  useEffect(() => {
    const el = map.getContainer();
    const mark = () => {
      userMoved.current = true;
    };
    const onTouch = (e: TouchEvent) => {
      if (e.touches.length > 1) mark();
    };
    el.addEventListener("wheel", mark, { passive: true });
    el.addEventListener("dblclick", mark);
    el.addEventListener("touchstart", onTouch, { passive: true });
    el.addEventListener("darna:user-zoom", mark);
    return () => {
      el.removeEventListener("wheel", mark);
      el.removeEventListener("dblclick", mark);
      el.removeEventListener("touchstart", onTouch);
      el.removeEventListener("darna:user-zoom", mark);
    };
  }, [map]);

  // Keep Leaflet's size in sync with its (animated) container.
  useEffect(() => {
    const container = map.getContainer();
    if (typeof ResizeObserver === "undefined") return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const observer = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      if (width > 0 && height > 0) {
        clearTimeout(timer);
        timer = setTimeout(() => {
          try {
            map.invalidateSize();
          } catch {}
        }, 80);
      }
    });
    observer.observe(container);
    return () => {
      clearTimeout(timer);
      observer.disconnect();
    };
  }, [map]);

  // New result set: forget the user's camera and fit the results.
  useEffect(() => {
    userMoved.current = false;
    const fit = () => {
      try {
        if (bounds && bounds.isValid()) {
          map.fitBounds(bounds, { padding: [56, 56], maxZoom: 13, animate: false });
        } else if (isValidLatLng(center)) {
          map.setView(center, zoom, { animate: false });
        }
      } catch {}
    };
    fit();
    // Re-fit once the container has its final size (dynamic import, sheet animation).
    const timer = setTimeout(() => {
      try {
        map.invalidateSize();
      } catch {}
      if (!userMoved.current) fit();
    }, 320);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, fitKey, isVisible]);

  // Selected item: fly in when zoomed far out, otherwise only pan enough to keep it (and its card) in view.
  useEffect(() => {
    if (!selectedCoords || !isValidLatLng(selectedCoords)) return;
    try {
      if (map.getZoom() < 11) {
        map.flyTo(selectedCoords, 13, { duration: 0.9, easeLinearity: 0.3 });
      } else {
        map.panInside(selectedCoords, { paddingTopLeft: [160, 300], paddingBottomRight: [160, 60] });
      }
    } catch {}
  }, [map, selectedCoords]);

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
  /** Called with the visible area after the user pans/zooms the map. */
  onBoundsChange?: (bounds: MapBounds) => void;
  /** Renders the "Search as I move the map" switch on the map. */
  searchAsMove?: boolean;
  onSearchAsMoveChange?: (value: boolean) => void;
  center?: [number, number];
  zoom?: number;
  className?: string;
}

/** Star + average rating, or "New" when the item has no rating yet. */
function InlineRating({ rating }: { rating?: number }) {
  const locale = useLocale();
  const t = useTranslations("listing");
  const value = formatRating(rating, locale);
  if (!value) return <span className="text-secondary-700">{t("ratingNew")}</span>;
  return (
    <>
      <BrandStarIcon size={13} className="text-accent-600" />
      <span className="sr-only">{t("ratingLabel", { rating: value })}</span>
      <span aria-hidden="true">{value}</span>
    </>
  );
}

const PREVIEW_W = 300;
const PREVIEW_H = 300;

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
  searchAsMove,
  onSearchAsMoveChange,
  center,
  zoom = 11,
  className = "w-full h-full",
}: SearchMapProps) {
  const router = useRouter();
  const [showTotalPrice] = useShowTotalPrice();
  const locale = useLocale();
  const t = useTranslations("search.map");
  const tSearch = useTranslations("search");
  const tListing = useTranslations("listing");
  const tCommon = useTranslations("common");
  const moveSwitchId = useId();

  const [internalHoveredId, setInternalHoveredId] = useState<string | null>(null);
  const [previewImageIndex, setPreviewImageIndex] = useState(0);
  const [mapZoom, setMapZoom] = useState<number>(zoom);
  const [map, setMap] = useState<L.Map | null>(null);
  const [pinPoint, setPinPoint] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [expandedClusterId, setExpandedClusterId] = useState<string | null>(null);

  // The preview card follows click selection (never hover).
  const [clickedCardId, setClickedCardId] = useState<string | null>(selectedListingId || null);
  useEffect(() => {
    if (selectedListingId !== undefined) setClickedCardId(selectedListingId);
  }, [selectedListingId]);

  useEffect(() => {
    if (hoveredListingId !== undefined) setInternalHoveredId(hoveredListingId);
  }, [hoveredListingId]);

  const dragStartX = useRef<number | null>(null);
  const hasDraggedRef = useRef(false);

  const showListings = currentVertical !== "trip";
  const showTrips = currentVertical === "trip" || currentVertical === "all" || !currentVertical;

  const activeItem = useMemo(() => {
    if (!clickedCardId) return null;
    const matchedListing = listings.find((l) => l.id === clickedCardId);
    if (matchedListing) return { type: "listing" as const, data: matchedListing };
    const matchedTrip = trips.find((tr) => tr.id === clickedCardId);
    if (matchedTrip) return { type: "trip" as const, data: matchedTrip };
    return null;
  }, [listings, trips, clickedCardId]);

  useEffect(() => {
    setPreviewImageIndex(0);
  }, [activeItem?.data.id]);

  const closePreview = useCallback(() => {
    setClickedCardId(null);
    onSelectListing?.(null);
  }, [onSelectListing]);

  // Escape closes the floating preview card.
  useEffect(() => {
    if (!activeItem) return;
    const onKeyDown = (e: KeyboardEvent) => e.key === "Escape" && closePreview();
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [activeItem, closePreview]);

  const activeItemHref = activeItem ? (activeItem.type === "listing" ? `/listings/${activeItem.data.id}` : `/trips/${activeItem.data.id}`) : null;

  const activeMapItems = useMemo<MapItemEntry[]>(() => {
    const list: MapItemEntry[] = [];
    if (showListings) {
      for (const listing of listings) {
        if (!isValidLatLng(listing.latlng)) continue;
        const imgs = Array.isArray(listing.imageSrc) ? listing.imageSrc : [listing.imageSrc];
        list.push({
          id: listing.id,
          type: "listing",
          data: listing,
          price: showTotalPrice && typeof listing.quotedTotal === "number" ? listing.quotedTotal : listing.price,
          coords: [Number(listing.latlng[0]), Number(listing.latlng[1])],
          title: listing.title,
          rating: listing.rating,
          category: listing.category,
          imageSrc: imgs[0] || "/assets/template.jpeg",
        });
      }
    }
    if (showTrips) {
      for (const trip of trips) {
        const coords = trip.latlng || getTripCoordinates(trip);
        if (!isValidLatLng(coords)) continue;
        list.push({
          id: trip.id,
          type: "trip",
          data: trip,
          price: trip.pricePerPerson,
          coords: [Number(coords[0]), Number(coords[1])],
          title: trip.title,
          rating: trip.rating,
          category: "trip",
          imageSrc: trip.coverPhoto || "/assets/template.jpeg",
        });
      }
    }
    return list;
  }, [listings, trips, showListings, showTrips, showTotalPrice]);

  const { defaultCenter, bounds } = useMemo(() => {
    const fallback: [number, number] = center && isValidLatLng(center) ? center : [36.7538, 3.0588];
    if (center && isValidLatLng(center)) return { defaultCenter: center, bounds: undefined };
    if (activeMapItems.length === 0) return { defaultCenter: fallback, bounds: undefined };
    if (activeMapItems.length === 1) return { defaultCenter: activeMapItems[0].coords, bounds: undefined };
    try {
      const b = L.latLngBounds(activeMapItems.map((i) => i.coords));
      if (b.isValid()) {
        const c = b.getCenter();
        return { defaultCenter: [c.lat, c.lng] as [number, number], bounds: b };
      }
    } catch {}
    return { defaultCenter: fallback, bounds: undefined };
  }, [activeMapItems, center]);

  // A new result set (ids) means a new camera fit.
  const fitKey = useMemo(() => activeMapItems.map((i) => i.id).join(","), [activeMapItems]);

  const selectedCoords = useMemo(() => {
    const item = activeMapItems.find((i) => i.id === clickedCardId);
    return item?.coords;
  }, [clickedCardId, activeMapItems]);

  // Tiny offsets so pins at the same address don't hide each other.
  const renderedItems = useMemo(() => {
    return activeMapItems.map((item) => {
      const sameSpot = activeMapItems.filter((o) => Math.hypot(o.coords[0] - item.coords[0], o.coords[1] - item.coords[1]) < 0.0006);
      if (sameSpot.length < 2) return { ...item, displayCoords: item.coords };
      const idx = sameSpot.findIndex((s) => s.id === item.id);
      const angle = (2 * Math.PI * idx) / sameSpot.length - Math.PI / 2;
      const offset = 0.0005;
      const cosLat = Math.cos((item.coords[0] * Math.PI) / 180) || 1;
      return {
        ...item,
        displayCoords: [item.coords[0] + offset * Math.cos(angle), item.coords[1] + (offset * Math.sin(angle)) / cosLat] as [number, number],
      };
    });
  }, [activeMapItems]);

  // Clusters for zoomed-out views (< 11): roughly one pill width apart on screen, at least 10 km.
  const clusters = useMemo<MapCluster[]>(() => {
    const result: MapCluster[] = [];
    const radiusKm = Math.max(10, 9000 / 2 ** mapZoom);
    for (const item of activeMapItems) {
      let closest: MapCluster | null = null;
      let min = radiusKm;
      for (const c of result) {
        const d = getDistanceKm(c.center, item.coords);
        if (d <= min) {
          min = d;
          closest = c;
        }
      }
      if (closest) {
        closest.items.push(item);
        closest.count = closest.items.length;
        closest.minPrice = Math.min(closest.minPrice, item.price);
        closest.center = [
          closest.items.reduce((a, c) => a + c.coords[0], 0) / closest.items.length,
          closest.items.reduce((a, c) => a + c.coords[1], 0) / closest.items.length,
        ];
      } else {
        result.push({
          id: `cluster_${item.coords[0].toFixed(4)}_${item.coords[1].toFixed(4)}`,
          center: [item.coords[0], item.coords[1]],
          items: [item],
          minPrice: item.price,
          count: 1,
        });
      }
    }
    return result;
  }, [activeMapItems, mapZoom]);

  const compactNumber = useMemo(
    () => new Intl.NumberFormat(intlLocale(locale), { notation: "compact", maximumFractionDigits: 1 }),
    [locale]
  );

  /**
   * Price pill marker: white e2 pill at rest; ink when its card is hovered; ink with a
   * terracotta pulse ring when selected. The 0×0 icon box keeps the pill centred on the point.
   */
  const createPriceIcon = (price: number, isSelected: boolean, isHovered: boolean, isTrip: boolean, title: string) => {
    const label = `${compactNumber.format(price)} ${tCommon("currencySymbol")}`;
    const srLabel = escapeHtml(t("pinLabel", { title, price: formatDzd(price, locale) }));
    const dark = isSelected || isHovered;
    const tripDot = isTrip
      ? `<span class="inline-block h-1.5 w-1.5 rounded-full ${dark ? "bg-tertiary-300" : "bg-secondary-600"}"></span>`
      : "";
    const pulse = isSelected
      ? `<span aria-hidden="true" class="absolute inset-0 rounded-full ring-2 ring-accent-500/70 motion-safe:animate-ping"></span>`
      : "";
    return L.divIcon({
      className: "darna-pin group !bg-transparent !border-0",
      html: `<span class="absolute left-0 top-0 -translate-x-1/2 -translate-y-1/2">
        <span class="relative flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-[13px] font-semibold leading-none tabular-nums cursor-pointer select-none transition-[transform,background-color,color,box-shadow] duration-fast ease-standard ${
          dark
            ? "bg-primary-900 text-white shadow-e3 scale-110"
            : "bg-white text-primary-900 shadow-e2 group-hover:scale-105 group-hover:shadow-e3"
        }">${pulse}${tripDot}<span class="sr-only">${srLabel}</span><span aria-hidden="true">${escapeHtml(label)}</span></span>
      </span>`,
      iconSize: [0, 0],
      iconAnchor: [0, 0],
    });
  };

  const createClusterIcon = (count: number, minPrice: number, active: boolean) => {
    const from = `${compactNumber.format(minPrice)} ${tCommon("currencySymbol")}`;
    return L.divIcon({
      className: "darna-pin group !bg-transparent !border-0",
      html: `<span class="absolute left-0 top-0 -translate-x-1/2 -translate-y-1/2">
        <span class="flex items-center gap-1.5 whitespace-nowrap rounded-full py-1 ps-1 pe-3 text-[13px] font-semibold leading-none cursor-pointer select-none shadow-e2 transition-[transform,box-shadow] duration-fast ease-standard group-hover:scale-105 group-hover:shadow-e3 ${
          active ? "bg-primary-900 text-white" : "bg-white text-primary-900"
        }">
          <span class="flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 tabular-nums ${active ? "bg-white text-primary-900" : "bg-primary-800 text-white"}" aria-hidden="true">${count}</span>
          <span class="sr-only">${escapeHtml(t("clusterLabel", { count }))}</span>
          <span aria-hidden="true" class="tabular-nums">${escapeHtml(from)}</span>
        </span>
      </span>`,
      iconSize: [0, 0],
      iconAnchor: [0, 0],
    });
  };

  const previewImages = useMemo(() => {
    if (!activeItem) return [];
    if (activeItem.type === "listing") {
      const imgs = Array.isArray(activeItem.data.imageSrc) ? activeItem.data.imageSrc : [activeItem.data.imageSrc];
      return imgs.filter(Boolean).length ? imgs.filter(Boolean) : ["/assets/template.jpeg"];
    }
    const arr = [activeItem.data.coverPhoto, ...(activeItem.data.gallery || [])].filter(Boolean);
    return arr.length > 0 ? arr : ["/assets/template.jpeg"];
  }, [activeItem]);

  // Anchor the preview card to its pin (desktop); it re-anchors as the map moves.
  useEffect(() => {
    if (!map || !selectedCoords) {
      setPinPoint(null);
      return;
    }
    const update = () => {
      try {
        const p = map.latLngToContainerPoint(selectedCoords);
        const s = map.getSize();
        setPinPoint({ x: p.x, y: p.y, w: s.x, h: s.y });
      } catch {
        setPinPoint(null);
      }
    };
    update();
    map.on("move zoom resize", update);
    return () => {
      map.off("move zoom resize", update);
    };
  }, [map, selectedCoords]);

  const anchored = pinPoint && pinPoint.w >= 640 && pinPoint.h >= 480;
  const cardStyle: React.CSSProperties | undefined = anchored
    ? (() => {
        const left = Math.min(Math.max(pinPoint.x - PREVIEW_W / 2, 12), pinPoint.w - PREVIEW_W - 12);
        const above = pinPoint.y - PREVIEW_H - 28 >= 12;
        const top = above ? pinPoint.y - PREVIEW_H - 28 : Math.min(pinPoint.y + 28, pinPoint.h - PREVIEW_H - 12);
        return {
          left,
          top,
          width: PREVIEW_W,
          transformOrigin: `${pinPoint.x - left}px ${above ? "100%" : "0%"}`,
        };
      })()
    : undefined;

  const stepPreview = (dir: 1 | -1) => (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setPreviewImageIndex((prev) => (prev + dir + previewImages.length) % previewImages.length);
  };

  const userZoom = (dir: 1 | -1) => {
    if (!map) return;
    map.getContainer().dispatchEvent(new Event("darna:user-zoom"));
    if (dir > 0) map.zoomIn();
    else map.zoomOut();
  };

  const markerHandlers = (item: MapItemEntry) => ({
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
  });

  const renderPin = (item: MapItemEntry, position: [number, number], baseZ = 1) => {
    const isSelected = item.id === clickedCardId;
    const isHovered = item.id === internalHoveredId;
    return (
      <Marker
        key={item.id}
        position={position}
        icon={createPriceIcon(item.price, isSelected, isHovered, item.type === "trip", item.title)}
        zIndexOffset={isSelected ? 1000 : isHovered ? 900 : baseZ}
        keyboard
        title={item.title}
        eventHandlers={markerHandlers(item)}
      />
    );
  };

  const glassBtn =
    "glass-light shadow-e2 text-primary-900 cursor-pointer transition-[box-shadow,background-color] duration-fast ease-standard hover:bg-white hover:shadow-e3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600";

  return (
    <div className={cn("relative overflow-hidden bg-tertiary-100", className)}>
      <MapContainer
        center={defaultCenter}
        zoom={zoom}
        scrollWheelZoom
        zoomControl={false}
        className="z-0 h-full w-full"
      >
        <MapController
          fitKey={fitKey}
          center={defaultCenter}
          zoom={zoom}
          bounds={bounds}
          selectedCoords={selectedCoords}
          isVisible={isVisible}
          onBoundsChange={onBoundsChange}
          onMapReady={setMap}
          onZoomChange={(z) => {
            setMapZoom(z);
            if (z < 11 && expandedClusterId) setExpandedClusterId(null);
          }}
          onMapClick={() => {
            closePreview();
            setExpandedClusterId(null);
          }}
        />

        <OpenFreeMapLayer />

        {mapZoom >= 11
          ? renderedItems.map((item) => renderPin(item, item.displayCoords))
          : clusters.map((cluster) => {
              if (cluster.count === 1) return renderPin(cluster.items[0], cluster.center);
              if (expandedClusterId === cluster.id) {
                return <React.Fragment key={cluster.id}>{cluster.items.map((item) => renderPin(item, item.coords, 700))}</React.Fragment>;
              }
              const active = cluster.items.some((i) => i.id === clickedCardId || i.id === internalHoveredId);
              return (
                <Marker
                  key={cluster.id}
                  position={cluster.center}
                  icon={createClusterIcon(cluster.count, cluster.minPrice, active)}
                  zIndexOffset={active ? 950 : 50}
                  keyboard
                  title={t("clusterLabel", { count: cluster.count })}
                  eventHandlers={{
                    click: (e) => {
                      setExpandedClusterId(cluster.id);
                      const target = e.target as L.Marker & { _map?: L.Map };
                      try {
                        const b = L.latLngBounds(cluster.items.map((i) => i.coords));
                        if (b.isValid() && target._map) {
                          target._map.getContainer().dispatchEvent(new Event("darna:user-zoom"));
                          target._map.flyToBounds(b, { padding: [72, 72], maxZoom: 14, duration: 0.8 });
                        }
                      } catch {}
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
            })}
      </MapContainer>

      {/* Top-start: search as the map moves */}
      {onSearchAsMoveChange && (
        <div className="glass-light absolute top-4 start-4 z-[400] flex h-11 items-center gap-2.5 rounded-full ps-2 pe-4 shadow-e2">
          <Switch id={moveSwitchId} size="sm" ariaLabel={tSearch("searchAsMapMoves")} checked={Boolean(searchAsMove)} onCheckedChange={onSearchAsMoveChange} />
          <label htmlFor={moveSwitchId} className="cursor-pointer whitespace-nowrap text-meta font-semibold text-primary-900">
            {tSearch("searchAsMapMoves")}
          </label>
        </div>
      )}

      {/* End edge: zoom */}
      <div className="absolute end-4 top-1/2 z-[400] flex -translate-y-1/2 flex-col overflow-hidden rounded-2xl shadow-e2">
        <button type="button" aria-label={t("zoomIn")} onClick={() => userZoom(1)} className={cn(glassBtn, "flex h-11 w-11 items-center justify-center rounded-none shadow-none")}>
          <BrandPlusIcon size={18} />
        </button>
        <span aria-hidden="true" className="h-px bg-primary/[0.08]" />
        <button type="button" aria-label={t("zoomOut")} onClick={() => userZoom(-1)} className={cn(glassBtn, "flex h-11 w-11 items-center justify-center rounded-none shadow-none")}>
          <BrandMinusIcon size={18} />
        </button>
      </div>

      {/* Preview card: grows out of its pin on desktop, docks to the bottom on small maps */}
      <AnimatePresence>
        {activeItem && (
          <m.div
            key={activeItem.data.id}
            role="region"
            aria-label={t("previewLabel")}
            initial={{ opacity: 0, scale: anchored ? 0.6 : 1, y: anchored ? 0 : 24 }}
            animate={{ opacity: 1, scale: 1, y: 0, transition: { type: "spring", stiffness: 420, damping: 32 } }}
            exit={{ opacity: 0, scale: anchored ? 0.9 : 1, y: anchored ? 0 : 16, transition: { duration: dur.fast, ease: ease.standard } }}
            style={cardStyle}
            className={cn(
              "absolute z-[500] overflow-hidden rounded-2xl bg-white shadow-e4 select-none",
              !anchored && "inset-x-4 bottom-[calc(1rem+env(safe-area-inset-bottom))] sm:inset-x-auto sm:start-4 sm:w-[300px]"
            )}
          >
            <div
              className={cn("relative aspect-[20/13] w-full overflow-hidden bg-tertiary-100", previewImages.length > 1 ? "cursor-grab active:cursor-grabbing" : "cursor-pointer")}
              style={{ touchAction: "pan-y" }}
              onPointerDown={(e) => {
                if (e.pointerType === "mouse" && e.button !== 0) return;
                dragStartX.current = e.clientX;
                hasDraggedRef.current = false;
              }}
              onPointerMove={(e) => {
                if (dragStartX.current !== null && Math.abs(e.clientX - dragStartX.current) > 6) hasDraggedRef.current = true;
              }}
              onPointerUp={(e) => {
                if (dragStartX.current === null) return;
                const diff = e.clientX - dragStartX.current;
                dragStartX.current = null;
                if (previewImages.length > 1 && Math.abs(diff) > 30) {
                  const forward = locale === "ar" ? diff > 0 : diff < 0;
                  setPreviewImageIndex((prev) => (prev + (forward ? 1 : -1) + previewImages.length) % previewImages.length);
                  return;
                }
                // A plain tap on the photo opens the item (keyboard users use the title link).
                if (!hasDraggedRef.current && activeItemHref && !(e.target as HTMLElement).closest("button")) {
                  router.push(activeItemHref);
                }
              }}
              onPointerCancel={() => (dragStartX.current = null)}
            >
              <AnimatePresence initial={false} mode="popLayout">
                <m.div
                  key={previewImageIndex}
                  className="absolute inset-0"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1, transition: { duration: dur.base, ease: ease.out } }}
                  exit={{ opacity: 0, transition: { duration: dur.fast } }}
                >
                  <Image src={previewImages[previewImageIndex] || "/assets/template.jpeg"} alt="" fill sizes="300px" draggable={false} className="pointer-events-none object-cover" />
                </m.div>
              </AnimatePresence>
              <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-primary-900/25 to-transparent" />

              <button
                type="button"
                aria-label={t("closePreview")}
                onClick={(e) => {
                  e.stopPropagation();
                  closePreview();
                }}
                className="absolute top-2 start-2 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-primary-900 shadow-e2 cursor-pointer transition hover:bg-white before:absolute before:-inset-1.5 before:content-[''] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600"
              >
                <BrandCloseIcon size={15} strokeWidth={2.2} />
              </button>

              {activeItem.type === "listing" ? (
                <div className="absolute top-0.5 end-0.5 z-20">
                  <HeartButton listingId={activeItem.data.id} currentUser={currentUser} />
                </div>
              ) : (
                <span className="glass-light absolute top-2.5 end-2.5 z-20 flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold text-primary-900 shadow-e1">
                  <BrandCalendarIcon size={12} strokeWidth={2} className="text-secondary-700" />
                  {t("tripDuration", { days: activeItem.data.durationDays, nights: Math.max(1, activeItem.data.durationDays - 1) })}
                </span>
              )}

              {activeItem.type === "trip" && (
                <span className="glass-light absolute bottom-2.5 start-2.5 z-20 flex max-w-[80%] items-center gap-1.5 truncate rounded-full px-2.5 py-1 text-[11px] font-semibold text-primary-900">
                  <BrandCheckIcon size={12} strokeWidth={2.5} className="shrink-0 text-secondary-700" />
                  <span className="truncate">{activeItem.data.organization?.name || t("verifiedAgency")}</span>
                </span>
              )}

              {previewImages.length > 1 && (
                <>
                  <button type="button" aria-label={tListing("previousPhoto")} onClick={stepPreview(-1)} className="absolute start-2 top-1/2 z-20 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-primary-900 shadow-e2 cursor-pointer hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600">
                    <BrandChevronLeftIcon size={16} strokeWidth={2.2} className="rtl:rotate-180" />
                  </button>
                  <button type="button" aria-label={tListing("nextPhoto")} onClick={stepPreview(1)} className="absolute end-2 top-1/2 z-20 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-primary-900 shadow-e2 cursor-pointer hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600">
                    <BrandChevronRightIcon size={16} strokeWidth={2.2} className="rtl:rotate-180" />
                  </button>
                  <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-2.5 z-20 flex items-center justify-center gap-1.5">
                    {previewImages.slice(0, 5).map((_, idx) => (
                      <span key={idx} className={cn("h-1.5 w-1.5 rounded-full bg-white transition-opacity duration-fast", idx === Math.min(previewImageIndex, 4) ? "opacity-100" : "opacity-60")} />
                    ))}
                  </div>
                </>
              )}
            </div>

            <div className="relative space-y-0.5 p-3.5">
              <div className="flex items-start justify-between gap-2">
                <h4 className="min-w-0 truncate text-[0.9375rem] font-semibold text-primary-900">
                  <Link
                    href={activeItemHref ?? "/"}
                    className="rounded after:absolute after:inset-0 after:content-[''] focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-inset focus-visible:after:ring-accent-600"
                  >
                    {activeItem.data.title}
                  </Link>
                </h4>
                <span className="flex shrink-0 items-center gap-1 pt-0.5 text-meta font-semibold tabular-nums text-primary-800">
                  <InlineRating rating={activeItem.data.rating} />
                </span>
              </div>
              <p className="truncate text-meta text-primary-500">{tListing("cityCountry", { city: activeItem.data.city })}</p>
              {activeItem.type === "listing" ? (
                <PriceDisplay
                  className="pt-1"
                  price={showTotalPrice && typeof activeItem.data.quotedTotal === "number" ? activeItem.data.quotedTotal : activeItem.data.price}
                  originalPrice={showTotalPrice && typeof activeItem.data.quotedTotal === "number" ? undefined : activeItem.data.originalPrice}
                  period={
                    showTotalPrice && typeof activeItem.data.quotedTotal === "number"
                      ? tListing("priceSuffix.total")
                      : tListing(priceSuffixKey(activeItem.data))
                  }
                  priceClassName="font-semibold text-[0.9375rem] text-primary-900 tabular-nums"
                  eurClassName="text-meta text-primary-500 tabular-nums"
                />
              ) : (
                <div className="flex items-baseline justify-between gap-2 pt-1">
                  <PriceDisplay
                    price={activeItem.data.pricePerPerson}
                    period={tListing("priceSuffix.person")}
                    priceClassName="font-semibold text-[0.9375rem] text-primary-900 tabular-nums"
                    eurClassName="text-meta text-primary-500 tabular-nums"
                  />
                  <span className="flex items-center gap-1 text-meta text-primary-600">
                    <BrandUsersIcon size={13} strokeWidth={1.8} />
                    {t("maxGroup", { count: activeItem.data.maxGroupSize })}
                  </span>
                </div>
              )}
            </div>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}
