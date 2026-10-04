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
      className={`pointer-events-none select-none w-full ${className}`}
    >
      <div className="relative w-full flex items-center justify-center">
        <Image
          src="/bg.png"
          alt="Algerian Monuments"
          width={2400}
          height={600}
          priority
          sizes="100vw"
          className="w-full h-auto object-cover object-bottom mix-blend-multiply opacity-95 pointer-events-none"
        />
      </div>
    </div>
  );
}
