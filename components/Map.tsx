"use client";

import L from "leaflet";
import React from "react";
import { MapContainer, Marker, Popup, TileLayer, Circle } from "react-leaflet";

import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import "leaflet/dist/leaflet.css";
import Flag from "react-world-flags";
import { tokens } from "@/lib/tokens";

// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon.src,
  iconRetinaUrl: markerIcon2x.src,
  shadowUrl: markerShadow.src,
});

type Props = {
  center?: number[];
  locationValue?: string;
  isApproximate?: boolean;
  zoom?: number;
};

function Map({ center, locationValue, isApproximate = false, zoom }: Props) {
  const defaultZoom = zoom || (isApproximate ? 13 : center ? 4 : 2);

  return (
    <MapContainer
      center={(center as L.LatLngExpression) || [51, -0.09]}
      zoom={defaultZoom}
      scrollWheelZoom={false}
      className="h-[35vh] rounded-2xl z-0"
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />
      {center && isApproximate && (
        <Circle
          center={center as L.LatLngExpression}
          radius={700}
          pathOptions={{
            color: tokens.colors.accent.DEFAULT,
            fillColor: tokens.colors.accent.DEFAULT,
            fillOpacity: 0.15,
            weight: 2,
          }}
        />
      )}
      {locationValue && !isApproximate ? (
        <>
          {center && (
            <Marker position={center as L.LatLngExpression}>
              <Popup>
                <div className="flex justify-center items-center animate-bounce">
                  <Flag code={locationValue} className="w-10" />
                </div>
              </Popup>
            </Marker>
          )}
        </>
      ) : (
        <>{center && !isApproximate && <Marker position={center as L.LatLngExpression} />}</>
      )}
    </MapContainer>
  );
}

export default Map;
