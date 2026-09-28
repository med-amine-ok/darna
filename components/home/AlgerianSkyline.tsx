"use client";

import React from "react";
import Image from "next/image";

interface SkylineProps {
  className?: string;
}

export default function AlgerianSkyline({ className = "" }: SkylineProps) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none select-none overflow-hidden w-full ${className}`}
    >
      <div className="relative w-full h-full flex items-end justify-center">
        <Image
          src="/bg.png"
          alt="Algerian Monuments"
          fill
          priority
          sizes="100vw"
          className="object-cover object-bottom mix-blend-multiply opacity-95 pointer-events-none"
        />
      </div>
    </div>
  );
}
