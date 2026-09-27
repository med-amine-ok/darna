"use client";

import React from "react";

type Props = {
  title: string;
  subtitle?: string;
  center?: boolean;
};

function Heading({ title, subtitle, center }: Props) {
  return (
    <div className={center ? "text-center" : "text-start"}>
      <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900">{title}</h2>
      {subtitle && (
        <p className="font-normal text-neutral-500 text-sm sm:text-base mt-1">{subtitle}</p>
      )}
    </div>
  );
}

export default Heading;
