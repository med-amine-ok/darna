"use client";

import React from "react";
import Image from "next/image";

export interface PhoneInputProps {
  value: string;
  onChange: (val: string) => void;
  label?: string;
  required?: boolean;
  placeholder?: string;
  className?: string;
}

export const PhoneInput: React.FC<PhoneInputProps> = ({
  value,
  onChange,
  label,
  required = false,
  placeholder = "555 12 34 56",
  className = "",
}) => {
  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <label className="block text-xs font-semibold text-neutral-700">
          {label} {required && <span className="text-accent">*</span>}
        </label>
      )}
      <div className="flex items-center rounded-xl border border-tertiary-300 bg-white overflow-hidden shadow-2xs focus-within:border-primary transition">
        {/* Algerian Flag Prefix */}
        <div className="flex items-center gap-1.5 px-3 py-2 bg-neutral-50 border-e border-neutral-200 shrink-0 select-none">
          {/* Algerian flag representation or unicode */}
          <span className="text-base leading-none">🇩🇿</span>
          <span className="text-xs font-bold text-neutral-700">+213</span>
        </div>
        <input
          type="tel"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="flex-1 px-3 py-2 text-xs text-neutral-800 placeholder-neutral-400 focus:outline-none bg-transparent"
        />
      </div>
    </div>
  );
};
