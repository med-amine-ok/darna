"use client";

import React from "react";
import { IconType } from "react-icons";

type Props = {
  label: string;
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  disabled?: boolean;
  outline?: boolean;
  small?: boolean;
  icon?: IconType;
  isColor?: boolean;
};

function Button({
  label,
  onClick,
  disabled,
  outline,
  small,
  icon: Icon,
  isColor,
}: Props) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`relative disabled:opacity-50 disabled:cursor-not-allowed transition duration-150 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 outline-none w-full font-semibold cursor-pointer ${
        outline
          ? "bg-white hover:bg-neutral-50 text-primary border border-primary"
          : "bg-accent hover:bg-accent-600 active:bg-accent-700 text-white border-transparent shadow-xs"
      } ${
        small
          ? "text-xs sm:text-sm py-2 px-3 rounded-lg"
          : "text-sm sm:text-base py-3.5 px-5 rounded-xl"
      }`}
    >
      {Icon && (
        <Icon
          size={small ? 18 : 22}
          className={`absolute start-4 top-1/2 -translate-y-1/2 ${
            isColor ? "text-blue-600" : outline ? "text-primary" : "text-white"
          }`}
        />
      )}
      {label}
    </button>
  );
}

export default Button;
