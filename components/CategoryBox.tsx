"use client";

import { useRouter } from "@/navigation";
import { useSearchParams } from "next/navigation";
import qs from "query-string";
import React, { useCallback } from "react";
import Image from "next/image";
import { IconType } from "react-icons";
import { useTranslations } from "next-intl";

type Props = {
  icon: IconType;
  label: string;
  selected?: boolean;
};

function CategoryBox({ icon: Icon, label, selected }: Props) {
  const router = useRouter();
  const params = useSearchParams();
  const t = useTranslations("categories");

  const handleClick = useCallback(() => {
    if (label === "Vehicles") {
      router.push("/vehicles");
      return;
    }

    let currentQuery = {};

    if (params) {
      currentQuery = qs.parse(params.toString());
    }

    const updatedQuery: any = {
      ...currentQuery,
      category: label,
    };

    if (params?.get("category") === label) {
      delete updatedQuery.category;
    }

    const url = qs.stringifyUrl(
      {
        url: "/",
        query: updatedQuery,
      },
      { skipNull: true }
    );

    router.push(url);
  }, [label, params, router]);

  // Attempt translation or fallback to English label
  let displayLabel = label;
  try {
    displayLabel = t(label as any);
  } catch {
    displayLabel = label;
  }

  return (
    <div
      onClick={handleClick}
      className={`flex flex-col items-center justify-center gap-2 p-3 border-b-2 hover:text-primary transition cursor-pointer whitespace-nowrap ${
        selected ? "border-b-accent text-accent font-semibold" : "border-transparent text-primary/60 hover:text-primary"
      }`}
    >
      {label === "Vehicles" ? (
        <Image
          src="/assets/car.png"
          alt="Vehicles"
          width={30}
          height={30}
          className={`w-[30px] h-[30px] object-contain ${
            selected ? "brightness-0 invert" : ""
          }`}
        />
      ) : (
        <Icon size={26} />
      )}
      <div className="font-medium text-xs">{displayLabel}</div>
    </div>
  );
}

export default CategoryBox;
