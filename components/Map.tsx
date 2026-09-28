"use client";

import L from "leaflet";
import React, { useState, useEffect } from "react";
import { MapContainer, Marker, Popup, TileLayer, Circle, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import Flag from "react-world-flags";

// Custom DARNA Location Pin from /assets/location.png
const darnaLocationIcon = L.icon({
  iconUrl: "/assets/location.png",
  iconSize: [40, 58],
  iconAnchor: [20, 56],
  popupAnchor: [0, -52],
  className: "darna-location-pin drop-shadow-xl transition-transform duration-200 hover:scale-110",
});

// Smooth map controller for fluid city fly-to transitions
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
        duration: 1.4,
        easeLinearity: 0.25,
      });
    }
  }, [map, center, zoom]);

  return null;
}

type Props = {
  center?: number[];
  locationValue?: string;
  isApproximate?: boolean;
  zoom?: number;
};

function Map({ center, locationValue, isApproximate = false, zoom }: Props) {
  const [mapType, setMapType] = useState<"roadmap" | "satellite">("roadmap");
  const defaultZoom = zoom || (isApproximate ? 13 : center ? 6 : 3);
  const mapCenter = (center as [number, number]) || [36.5986, 2.4417]; // Default to Tipaza, Algeria

  // Google Maps tile endpoints
  const googleRoadmapUrl = "https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}";
  const googleSatelliteUrl = "https://mt{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}";

  return (
    <div className="relative w-full h-[35vh] min-h-[300px] rounded-2xl overflow-hidden shadow-sm group">
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
            {/* Soft terracotta radius ring for privacy */}
            <Circle
              center={center as L.LatLngExpression}
              radius={800}
              pathOptions={{
                color: "#C96F4F",
                fillColor: "#C96F4F",
                fillOpacity: 0.18,
                weight: 2,
                dashArray: "6, 6",
              }}
            />
            {/* Center custom DARNA location pin */}
            <Marker position={center as L.LatLngExpression} icon={darnaLocationIcon} />
          </>
        )}

        {center && !isApproximate && (
          <Marker position={center as L.LatLngExpression} icon={darnaLocationIcon}>
            {locationValue && (
              <Popup className="darna-map-popup">
                <div className="flex flex-col items-center gap-1.5 p-1">
                  <Flag code={locationValue} className="w-8 rounded-xs shadow-xs" />
                  <span className="text-xs font-bold text-neutral-800 uppercase tracking-wider">
                    {locationValue}
                  </span>
                </div>
              </Popup>
            )}
          </Marker>
        )}
      </MapContainer>

      {/* Google Maps Layer Switcher Pill */}
      <div className="absolute top-3 end-3 z-[400] flex items-center bg-white/90 backdrop-blur-md p-1 rounded-xl shadow-md border border-neutral-200/80 text-xs font-semibold">
        <button
          type="button"
          onClick={() => setMapType("roadmap")}
          className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
            mapType === "roadmap"
              ? "bg-neutral-900 text-white shadow-xs"
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
              ? "bg-neutral-900 text-white shadow-xs"
              : "text-neutral-700 hover:bg-neutral-100"
          }`}
        >
          Satellite
        </button>
      </div>


    </div>
  );
}

export default Map;
