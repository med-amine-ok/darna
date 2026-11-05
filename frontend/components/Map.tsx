"use client";

import L from "leaflet";
import React, { useEffect } from "react";
import { MapContainer, Marker, Popup, Circle, useMap } from "react-leaflet";
import OpenFreeMapLayer from "@/components/map/OpenFreeMapLayer";
import "leaflet/dist/leaflet.css";

// Custom BLADUS Location Pin from /assets/location.png (70x104 source, shown at half size).
const darnaLocationIcon = L.icon({
  iconUrl: "/assets/location.png",
  iconSize: [36, 52],
  iconAnchor: [18, 52],
  popupAnchor: [0, -48],
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
  const defaultZoom = zoom || (isApproximate ? 13 : center ? 9 : 6);
  const mapCenter = (center as [number, number]) || [36.5897, 2.4475]; // Tipaza default

  return (
    <div className={`relative rounded-2xl overflow-hidden shadow-sm group ${className}`}>
      <MapContainer
        center={mapCenter}
        zoom={defaultZoom}
        scrollWheelZoom={false}
        className="w-full h-full z-0"
      >
        <SmoothMapController center={center ? (center as [number, number]) : undefined} zoom={defaultZoom} />

        <OpenFreeMapLayer />

        {center && isApproximate && (
          <>
            {/* Soft terracotta radius ring for guest privacy */}
            <Circle
              center={center as L.LatLngExpression}
              radius={850}
              pathOptions={{
                color: "#0B57D0",
                fillColor: "#0B57D0",
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

    </div>
  );
}
