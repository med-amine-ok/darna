"use client";

import React, { useState } from "react";
import { MapPin, Plus, Minus, Layers, Maximize2, X } from "lucide-react";

export interface MapPickerProps {
  addressText?: string;
  onAddressClear?: () => void;
  lat?: number;
  lng?: number;
  onChangeCoordinates?: (lat: number, lng: number) => void;
  onChange?: (lat: number, lng: number) => void;
  className?: string;
}

export const MapPicker: React.FC<MapPickerProps> = ({
  addressText = "Tassili n'Ajjer, Djanet, Illizi",
  onAddressClear,
  lat = 24.5,
  lng = 9.5,
  onChangeCoordinates,
  onChange,
  className = "",
}) => {
  const coordinateCallback = onChange || onChangeCoordinates;
  const [mapType, setMapType] = useState<"carte" | "satellite">("carte");
  const [zoom, setZoom] = useState(12);

  return (
    <div
      className={`relative w-full h-64 sm:h-72 rounded-2xl overflow-hidden border border-tertiary-300 bg-neutral-100 shadow-2xs ${className}`}
    >
      {/* Visual Map Representation */}
      <div
        className={`w-full h-full relative transition-all ${
          mapType === "satellite"
            ? "bg-[#6d6148] bg-[radial-gradient(#8a7a5c_1px,transparent_1px)] [background-size:16px_16px]"
            : "bg-[#e8ece9] bg-[linear-gradient(to_right,#dfe3e0_1px,transparent_1px),linear-gradient(to_bottom,#dfe3e0_1px,transparent_1px)] bg-[size:24px_24px]"
        }`}
      >
        {/* Decorative topographic / road curves */}
        <svg className="w-full h-full opacity-40 absolute inset-0 pointer-events-none">
          <path
            d="M 0 100 Q 150 50, 300 120 T 600 180"
            fill="none"
            stroke="#a3b19b"
            strokeWidth="3"
          />
          <path
            d="M 50 250 Q 250 180, 450 260 T 700 200"
            fill="none"
            stroke="#c4cfbe"
            strokeWidth="2"
          />
        </svg>

        {/* Center Draggable Pin with Pulsing Ripple */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center pointer-events-none z-10">
          <div className="relative">
            <div className="w-9 h-9 rounded-full bg-accent/20 animate-ping absolute -top-1 -start-1" />
            <div className="w-8 h-8 rounded-full bg-accent text-white flex items-center justify-center shadow-md">
              <MapPin className="w-5 h-5 fill-white" />
            </div>
          </div>
          <div className="mt-1 px-2 py-0.5 rounded bg-black/75 text-white text-[10px] font-bold shadow-xs whitespace-nowrap">
            Point sélectionné
          </div>
        </div>
      </div>

      {/* Top Map / Satellite Toggle */}
      <div className="absolute top-3 end-3 flex items-center bg-white/95 backdrop-blur-xs rounded-xl border border-tertiary-200 p-0.5 shadow-xs z-20">
        <button
          type="button"
          onClick={() => setMapType("carte")}
          className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
            mapType === "carte"
              ? "bg-primary text-white shadow-2xs"
              : "text-neutral-600 hover:text-primary"
          }`}
        >
          Carte
        </button>
        <button
          type="button"
          onClick={() => setMapType("satellite")}
          className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
            mapType === "satellite"
              ? "bg-primary text-white shadow-2xs"
              : "text-neutral-600 hover:text-primary"
          }`}
        >
          Satellite
        </button>
      </div>

      {/* Zoom Controls */}
      <div className="absolute end-3 top-16 flex flex-col gap-1 bg-white/95 backdrop-blur-xs rounded-xl border border-tertiary-200 p-1 shadow-xs z-20">
        <button
          type="button"
          onClick={() => setZoom((z) => Math.min(z + 1, 18))}
          className="p-1.5 rounded-lg text-neutral-600 hover:bg-neutral-100 hover:text-primary transition"
          aria-label="Zoom avant"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
        <div className="h-[1px] bg-neutral-200 my-0.5" />
        <button
          type="button"
          onClick={() => setZoom((z) => Math.max(z - 1, 5))}
          className="p-1.5 rounded-lg text-neutral-600 hover:bg-neutral-100 hover:text-primary transition"
          aria-label="Zoom arrière"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Bottom Floating Address Chip */}
      {addressText && (
        <div className="absolute bottom-3 inset-x-3 flex items-center justify-between px-3.5 py-2 bg-white/95 backdrop-blur-md rounded-xl border border-tertiary-200 shadow-sm z-20">
          <div className="flex items-center gap-2 truncate">
            <MapPin className="w-3.5 h-3.5 text-secondary shrink-0" />
            <span className="text-xs font-semibold text-primary truncate">
              {addressText}
            </span>
          </div>
          {onAddressClear && (
            <button
              type="button"
              onClick={onAddressClear}
              className="p-1 rounded-md text-neutral-400 hover:text-accent hover:bg-neutral-100 transition shrink-0"
              aria-label="Effacer l'adresse"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}
    </div>
  );
};
