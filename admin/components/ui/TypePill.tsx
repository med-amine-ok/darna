"use client";

import React from "react";
import {
  Home,
  Building2,
  Bed,
  Plane,
  Compass,
  Car,
  Mountain,
  Landmark,
  Trees,
  Utensils,
  Waves,
  Shield,
  Truck,
} from "lucide-react";

export type TypePillVariant =
  | "host"
  | "hotel"
  | "hostel"
  | "agency"
  | "travel_agency"
  | "experience"
  | "experience_company"
  | "car_agency"
  | "rental_agency"
  // Categories
  | "aventure"
  | "culture"
  | "nature"
  | "gastronomie"
  | "mer"
  // Car types
  | "suv"
  | "citadine"
  | "berline"
  | "compacte"
  | "utilitaire"
  // Property types
  | "villa"
  | "appartement"
  | "maison"
  | "bungalow"
  | "chalet"
  | "studio"
  | "default";

export interface TypePillProps {
  type: string;
  label?: string;
  icon?: React.ReactNode;
  size?: "sm" | "md";
  className?: string;
}

export const TypePill: React.FC<TypePillProps> = ({
  type,
  label,
  icon,
  size = "md",
  className = "",
}) => {
  const normalized = (type || "").toLowerCase().replace(/[\s-]/g, "_");

  // Determine label if not provided
  const getDisplayLabel = () => {
    if (label) return label;
    switch (normalized) {
      case "host":
      case "individual":
      case "hote":
        return "Hôte";
      case "hotel":
        return "Hôtel";
      case "hostel":
        return "Hostel";
      case "travel_agency":
      case "agency":
      case "agence_voyage":
        return "Agence voyage";
      case "experience":
      case "experience_company":
        return "Expérience";
      case "rental_agency":
      case "car_agency":
      case "agence_location":
        return "Agence location";
      case "aventure":
        return "Aventure";
      case "culture":
        return "Culture";
      case "nature":
        return "Nature";
      case "gastronomie":
        return "Gastronomie";
      case "mer":
        return "Mer";
      case "suv":
        return "SUV";
      case "citadine":
        return "Citadine";
      case "berline":
        return "Berline";
      case "compacte":
        return "Compacte";
      case "utilitaire":
        return "Utilitaire";
      case "villa":
        return "Villa";
      case "appartement":
        return "Appartement";
      case "maison":
        return "Maison";
      case "bungalow":
        return "Bungalow";
      case "chalet":
        return "Chalet";
      case "studio":
        return "Studio";
      default:
        return type;
    }
  };

  const getStyleAndIcon = () => {
    const iconClass = size === "sm" ? "w-3 h-3 shrink-0" : "w-3.5 h-3.5 shrink-0";

    switch (normalized) {
      case "host":
      case "individual":
      case "hote":
        return {
          styles: "bg-primary-50 text-primary-800 border-primary-200",
          icon: <Home className={iconClass} />,
        };
      case "hotel":
        return {
          styles: "bg-secondary-50 text-secondary-800 border-secondary-200",
          icon: <Building2 className={iconClass} />,
        };
      case "hostel":
        return {
          styles: "bg-tertiary-50 text-tertiary-900 border-tertiary-300",
          icon: <Bed className={iconClass} />,
        };
      case "travel_agency":
      case "agency":
      case "agence_voyage":
        return {
          styles: "bg-amber-50 text-amber-800 border-amber-200",
          icon: <Plane className={iconClass} />,
        };
      case "experience":
      case "experience_company":
        return {
          styles: "bg-emerald-50 text-emerald-800 border-emerald-200",
          icon: <Compass className={iconClass} />,
        };
      case "rental_agency":
      case "car_agency":
      case "agence_location":
        return {
          styles: "bg-primary-100/70 text-primary-800 border-primary-300",
          icon: <Car className={iconClass} />,
        };
      case "aventure":
        return {
          styles: "bg-amber-50 text-amber-900 border-amber-200",
          icon: <Mountain className={iconClass} />,
        };
      case "culture":
        return {
          styles: "bg-primary-50 text-primary-800 border-primary-200",
          icon: <Landmark className={iconClass} />,
        };
      case "nature":
        return {
          styles: "bg-secondary-50 text-secondary-800 border-secondary-200",
          icon: <Trees className={iconClass} />,
        };
      case "gastronomie":
        return {
          styles: "bg-rose-50 text-rose-800 border-rose-200",
          icon: <Utensils className={iconClass} />,
        };
      case "mer":
        return {
          styles: "bg-sky-50 text-sky-800 border-sky-200",
          icon: <Waves className={iconClass} />,
        };
      case "suv":
      case "citadine":
      case "berline":
      case "compacte":
      case "utilitaire":
        return {
          styles: "bg-neutral-100 text-neutral-800 border-neutral-200",
          icon: normalized === "utilitaire" ? <Truck className={iconClass} /> : <Car className={iconClass} />,
        };
      case "villa":
      case "appartement":
      case "maison":
      case "bungalow":
      case "chalet":
      case "studio":
        return {
          styles: "bg-primary-50 text-primary-800 border-primary-200",
          icon: <Home className={iconClass} />,
        };
      default:
        return {
          styles: "bg-neutral-100 text-neutral-700 border-neutral-200",
          icon: <Shield className={iconClass} />,
        };
    }
  };

  const { styles, icon: defaultIcon } = getStyleAndIcon();
  const sizeStyles = {
    sm: "text-[10px] px-2 py-0.5 gap-1",
    md: "text-xs px-2.5 py-1 gap-1.5",
  };

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full border shadow-2xs select-none whitespace-nowrap ${styles} ${sizeStyles[size]} ${className}`}
    >
      {icon || defaultIcon}
      <span>{getDisplayLabel()}</span>
    </span>
  );
};
