"use client";

import React from "react";
import Container from "./Container";

export default function Loader() {
  return (
    <Container>
      <div className="pt-24 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="col-span-1 animate-pulse space-y-3">
            {/* Image Skeleton */}
            <div className="aspect-square w-full bg-tertiary/40 rounded-2xl" />
            {/* Title Skeleton */}
            <div className="h-4 bg-tertiary/40 rounded-md w-3/4" />
            {/* Subtitle Skeleton */}
            <div className="h-3 bg-tertiary/40 rounded-md w-1/2" />
            {/* Price Skeleton */}
            <div className="h-4 bg-tertiary/40 rounded-md w-1/3 pt-1" />
          </div>
        ))}
      </div>
    </Container>
  );
}
