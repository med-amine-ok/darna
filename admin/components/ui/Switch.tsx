"use client";

import React from "react";

export interface SwitchProps {
  label?: string;
  checked?: boolean;
  defaultChecked?: boolean;
  onChange?: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
}

export const Switch: React.FC<SwitchProps> = ({
  label,
  checked,
  defaultChecked,
  onChange,
  disabled = false,
  className = "",
}) => {
  const [internalChecked, setInternalChecked] = React.useState(defaultChecked ?? false);
  const isChecked = checked !== undefined ? checked : internalChecked;

  const handleToggle = () => {
    if (disabled) return;
    const next = !isChecked;
    if (checked === undefined) {
      setInternalChecked(next);
    }
    onChange?.(next);
  };

  return (
    <label
      className={`inline-flex items-center gap-2.5 cursor-pointer select-none ${
        disabled ? "opacity-50 cursor-not-allowed" : ""
      } ${className}`}
    >
      <div
        onClick={handleToggle}
        className={`w-11 h-6 rounded-full transition-colors relative p-0.5 ${
          isChecked ? "bg-secondary" : "bg-neutral-200"
        }`}
      >
        <div
          className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${
            isChecked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </div>
      {label && <span className="text-xs font-semibold text-primary">{label}</span>}
    </label>
  );
};
