"use client";

import React from "react";

type Props = {
  children: React.ReactNode;
  className?: string;
};

function Container({ children, className = "" }: Props) {
  return (
    <div
      className={`max-w-[1760px] mx-auto px-4 sm:px-6 md:px-10 lg:px-14 xl:px-20 w-full ${className}`}
    >
      {children}
    </div>
  );
}

export default Container;
