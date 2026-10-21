"use client";

import React, { useCallback } from "react";
import Image from "next/image";
import { useRouter } from "@/navigation";
import { useSearchParams } from "next/navigation";
import qs from "query-string";
interface CategoryBoxProps {
  icon?: React.ComponentType<{ size?: number | string; className?: string; strokeWidth?: number }>;
  imgSrc?: string;
  label: string;
  selected?: boolean;
}

export default function CategoryBox({
  icon: Icon,
  imgSrc,
  label,
  selected,
}: CategoryBoxProps) {
  const router = useRouter();
  const params = useSearchParams();

  const handleClick = useCallback(() => {
    if (label === "Trips & Circuits") {
      router.push("/search?vertical=trip");
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

  return (
    <div
      onClick={handleClick}
      className={`flex flex-col items-center justify-center gap-2 pb-2.5 pt-1 border-b-2 hover:text-primary transition cursor-pointer whitespace-nowrap select-none ${
        selected
          ? "border-b-accent text-accent font-semibold"
          : "border-transparent text-primary/60 hover:text-primary"
      }`}
    >
      {imgSrc ? (
        <div className="w-6 h-6 relative flex items-center justify-center">
          <Image
            src={imgSrc}
            alt={label}
            width={24}
            height={24}
            className={`object-contain transition ${selected ? "brightness-0" : "opacity-75"}`}
          />
        </div>
      ) : Icon ? (
        <Icon size={24} />
      ) : null}
      <div className="font-medium text-xs">{label}</div>
    </div>
  );
}
