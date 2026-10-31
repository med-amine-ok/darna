"use client";

import React from "react";
import { useTranslations } from "next-intl";
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
  const t = useTranslations("uiKit.types");
  const normalized = (type || "").toLowerCase().replace(/[\s-]/g, "_");

  // Determine label if not provided
  const getDisplayLabel = () => {
    if (label) return label;
    switch (normalized) {
      case "host":
      case "individual":
      case "hote":
        return t("host");
      case "hotel":
        return t("hotel");
      case "hostel":
        return t("hostel");
      case "travel_agency":
      case "agency":
      case "agence_voyage":
        return t("travelAgency");
      case "experience":
      case "experience_company":
        return t("experience");
      case "rental_agency":
      case "car_agency":
      case "agence_location":
        return t("rentalAgency");
      case "aventure":
        return t("aventure");
      case "culture":
        return t("culture");
      case "nature":
        return t("nature");
      case "gastronomie":
        return t("gastronomie");
      case "mer":
        return t("mer");
      case "suv":
        return t("suv");
      case "citadine":
        return t("citadine");
      case "berline":
        return t("berline");
      case "compacte":
        return t("compacte");
      case "utilitaire":
        return t("utilitaire");
      case "villa":
        return t("villa");
      case "appartement":
        return t("appartement");
      case "maison":
        return t("maison");
      case "bungalow":
        return t("bungalow");
      case "chalet":
        return t("chalet");
      case "studio":
        return t("studio");
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
          styles: "bg-primary-50 text-primary-800 ring-primary-200",
          icon: <Home className={iconClass} />,
        };
      case "hotel":
        return {
          styles: "bg-secondary-50 text-secondary-800 ring-secondary-200",
          icon: <Building2 className={iconClass} />,
        };
      case "hostel":
        return {
          styles: "bg-tertiary-50 text-tertiary-900 ring-tertiary-300",
          icon: <Bed className={iconClass} />,
        };
      case "travel_agency":
      case "agency":
      case "agence_voyage":
        return {
          styles: "bg-amber-50 text-amber-800 ring-amber-200",
          icon: <Plane className={iconClass} />,
        };
      case "experience":
      case "experience_company":
        return {
          styles: "bg-emerald-50 text-emerald-800 ring-emerald-200",
          icon: <Compass className={iconClass} />,
        };
      case "rental_agency":
      case "car_agency":
      case "agence_location":
        return {
          styles: "bg-primary-100/70 text-primary-800 ring-primary-300",
          icon: <Car className={iconClass} />,
        };
      case "aventure":
        return {
          styles: "bg-amber-50 text-amber-900 ring-amber-200",
          icon: <Mountain className={iconClass} />,
        };
      case "culture":
        return {
          styles: "bg-primary-50 text-primary-800 ring-primary-200",
          icon: <Landmark className={iconClass} />,
        };
      case "nature":
        return {
          styles: "bg-secondary-50 text-secondary-800 ring-secondary-200",
          icon: <Trees className={iconClass} />,
        };
      case "gastronomie":
        return {
          styles: "bg-rose-50 text-rose-800 ring-rose-200",
          icon: <Utensils className={iconClass} />,
        };
      case "mer":
        return {
          styles: "bg-sky-50 text-sky-800 ring-sky-200",
          icon: <Waves className={iconClass} />,
        };
      case "suv":
      case "citadine":
      case "berline":
      case "compacte":
      case "utilitaire":
        return {
          styles: "bg-primary/[0.05] text-primary-900 ring-primary/[0.12]",
          icon: normalized === "utilitaire" ? <Truck className={iconClass} /> : <Car className={iconClass} />,
        };
      case "villa":
      case "appartement":
      case "maison":
      case "bungalow":
      case "chalet":
      case "studio":
        return {
          styles: "bg-primary-50 text-primary-800 ring-primary-200",
          icon: <Home className={iconClass} />,
        };
      default:
        return {
          styles: "bg-primary/[0.05] text-primary-800 ring-primary/[0.12]",
          icon: <Shield className={iconClass} />,
        };
    }
  };

  const { styles, icon: defaultIcon } = getStyleAndIcon();
  const sizeStyles = {
    sm: "text-[11px] px-2 py-0.5 gap-1",
    md: "text-xs px-2.5 py-0.5 gap-1.5",
  };

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full ring-1 ring-inset select-none whitespace-nowrap ${styles} ${sizeStyles[size]} ${className}`}
    >
      <span aria-hidden="true" className="inline-flex">{icon || defaultIcon}</span>
      <span>{getDisplayLabel()}</span>
    </span>
  );
};
