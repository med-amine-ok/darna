"use client";

import React from "react";
import {
  MdCameraAlt,
  MdRestaurant,
  MdSpa,
  MdLunchDining,
  MdFitnessCenter,
  MdFaceRetouchingNatural,
  MdContentCut,
  MdRoomService,
} from "react-icons/md";
import { GiHerbsBundle } from "react-icons/gi";
import { useTranslations } from "next-intl";

export interface ServiceItem {
  id: string;
  labelKey: string;
  name: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}

export const serviceItems: ServiceItem[] = [
  { id: "photography", labelKey: "photography", name: "Photography", icon: MdCameraAlt },
  { id: "chefs", labelKey: "chefs", name: "Chefs", icon: MdRestaurant },
  { id: "massage", labelKey: "massage", name: "Massage", icon: MdSpa },
  { id: "prepared-meals", labelKey: "preparedMeals", name: "Prepared meals", icon: MdLunchDining },
  { id: "training", labelKey: "training", name: "Training", icon: MdFitnessCenter },
  { id: "makeup", labelKey: "makeup", name: "Makeup", icon: MdFaceRetouchingNatural },
  { id: "hair", labelKey: "hair", name: "Hair", icon: MdContentCut },
  { id: "spa-treatments", labelKey: "spaTreatments", name: "Spa treatments", icon: GiHerbsBundle },
  { id: "catering", labelKey: "catering", name: "Catering", icon: MdRoomService },
];

interface Props {
  selectedService: string | null;
  onSelectService: (serviceName: string) => void;
}

export default function ServicesPopover({
  selectedService,
  onSelectService,
}: Props) {
  const t = useTranslations("nav");

  return (
    <div className="bg-surface rounded-3xl shadow-xl border border-tertiary/60 p-5 w-[360px] sm:w-[460px] z-50">
      <div className="flex flex-wrap gap-2.5">
        {serviceItems.map((item) => {
          const isSelected = selectedService === item.name;
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectService(item.name)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-xs sm:text-sm transition cursor-pointer ${
                isSelected
                  ? "border-2 border-accent bg-accent/10 font-bold text-accent shadow-2xs"
                  : "border border-tertiary/60 hover:border-accent/60 bg-surface text-primary hover:text-primary"
              }`}
            >
              <Icon size={18} className={isSelected ? "text-accent" : "text-primary/70"} />
              <span>{t(item.labelKey as any)}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
