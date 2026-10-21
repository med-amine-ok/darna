"use client";

import L from "leaflet";
import React, { useState, useEffect } from "react";
import { MapContainer, Marker, Popup, TileLayer, Circle, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";

// Custom DARNA Location Pin from /assets/location.png
const darnaLocationIcon = L.icon({
  iconUrl: "/assets/location.png",
  iconSize: [36, 52],
  iconAnchor: [18, 50],
  popupAnchor: [0, -46],
  className: "darna-location-pin drop-shadow-xl transition-transform duration-200 hover:scale-110",
});

function SmoothMapController({
  center,
  zoom,
}: {
  center?: [number, number];
  zoom?: number;
}) {
  const map = useMap();

  useEffect(() => {
    if (center && center.length === 2 && !isNaN(center[0]) && !isNaN(center[1])) {
      map.flyTo(center, zoom || 13, {
        duration: 1.2,
        easeLinearity: 0.25,
      });
    }
  }, [map, center, zoom]);

  return null;
}

interface MapProps {
  center?: number[];
  locationValue?: string;
  isApproximate?: boolean;
  zoom?: number;
  className?: string;
}

export default function Map({
  center,
  locationValue,
  isApproximate = false,
  zoom,
  className = "w-full h-[35vh] min-h-[300px]",
}: MapProps) {
  const [mapType, setMapType] = useState<"roadmap" | "satellite">("roadmap");
  const defaultZoom = zoom || (isApproximate ? 13 : center ? 9 : 6);
  const mapCenter = (center as [number, number]) || [36.5897, 2.4475]; // Tipaza default

  const googleRoadmapUrl = "https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}";
  const googleSatelliteUrl = "https://mt{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}";

  return (
    <div className={`relative rounded-2xl overflow-hidden shadow-sm group ${className}`}>
      <MapContainer
        center={mapCenter}
        zoom={defaultZoom}
        scrollWheelZoom={false}
        attributionControl={false}
        className="w-full h-full z-0"
      >
        <SmoothMapController center={center ? (center as [number, number]) : undefined} zoom={defaultZoom} />

        <TileLayer
          key={mapType}
          url={mapType === "roadmap" ? googleRoadmapUrl : googleSatelliteUrl}
          subdomains={["0", "1", "2", "3"]}
          maxZoom={20}
        />

        {center && isApproximate && (
          <>
            {/* Soft terracotta radius ring for guest privacy */}
            <Circle
              center={center as L.LatLngExpression}
              radius={850}
              pathOptions={{
                color: "#C96F4F",
                fillColor: "#C96F4F",
                fillOpacity: 0.2,
                weight: 2,
                dashArray: "6, 6",
              }}
            />
            <Marker position={center as L.LatLngExpression} icon={darnaLocationIcon} />
          </>
        )}

        {center && !isApproximate && (
          <Marker position={center as L.LatLngExpression} icon={darnaLocationIcon}>
            {locationValue && (
              <Popup>
                <div className="p-1 text-xs font-bold text-primary">
                  {locationValue}
                </div>
              </Popup>
            )}
          </Marker>
        )}
      </MapContainer>

      {/* Map Layer Switcher */}
      <div className="absolute top-3 end-3 z-[400] flex items-center bg-white/90 backdrop-blur-md p-1 rounded-xl shadow-md border border-tertiary/60 text-xs font-semibold">
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
