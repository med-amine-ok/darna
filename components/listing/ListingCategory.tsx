"use client";

import React from "react";
import { IconType } from "react-icons";

import Image from "next/image";

type Props = {
  icon?: IconType;
  label: string;
  description: string;
};

function ListingCategory({ icon: Icon, label, description }: Props) {
  const isVehicle = label === "Vehicles" || label?.toLowerCase().includes("vehic");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-row items-center gap-4">
        {isVehicle ? (
          <div className="w-14 h-14 rounded-2xl bg-tertiary/20 border border-tertiary/60 flex items-center justify-center p-2 flex-shrink-0 shadow-xs">
            <Image
              src="/assets/car.png"
              alt="Vehicles"
              width={42}
              height={42}
              className="w-full h-full object-contain"
            />
          </div>
        ) : (
          Icon && <Icon size={40} className="text-neutral-600 flex-shrink-0" />
        )}
        <div className="flex flex-col">
          <p className="text-lg font-semibold text-primary">{label}</p>
          <p className="text-primary/70 font-light">{description}</p>
        </div>
      </div>
    </div>
  );
}

export default ListingCategory;
