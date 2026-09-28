"use client";

import React from "react";

type Props = {
  onClick: () => void;
  label: string;
};

function MenuItem({ onClick, label }: Props) {
  return (
    <div
      className="px-4 py-3 hover:bg-tertiary/20 text-primary transition font-semibold text-start"
      onClick={onClick}
    >
      {label}
    </div>
  );
}

export default MenuItem;
