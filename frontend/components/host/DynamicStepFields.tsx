"use client";

import React from "react";
import { OnboardingFieldConfig } from "@/types";

interface DynamicStepFieldsProps {
  fields: OnboardingFieldConfig[];
  values: Record<string, any>;
  onChange: (fieldId: string, value: any) => void;
  locale?: string;
}

export default function DynamicStepFields({
  fields,
  values,
  onChange,
  locale = "en",
}: DynamicStepFieldsProps) {
  if (!fields || fields.length === 0) return null;

  const currentLang = (["en", "fr", "ar"].includes(locale) ? locale : "en") as "en" | "fr" | "ar";

  return (
    <div className="space-y-4 pt-4 border-t border-tertiary/50">
      <div className="text-xs font-bold uppercase tracking-wider text-secondary">
        Additional Configured Information
      </div>

      <div className="space-y-4">
        {fields.map((field) => {
          const val = values[field.id] !== undefined ? values[field.id] : field.defaultValue || "";
          const label = field.label[currentLang] || field.label.en;
          const helpText = field.helpText ? field.helpText[currentLang] || field.helpText.en : "";
          const placeholder = field.placeholder ? field.placeholder[currentLang] || field.placeholder.en : "";

          return (
            <div key={field.id} className="space-y-1.5">
              <label className="block text-xs sm:text-sm font-bold text-neutral-800">
                {label} {field.required && <span className="text-rose-500">*</span>}
              </label>

              {helpText && (
                <p className="text-xs text-neutral-500 leading-relaxed">{helpText}</p>
              )}

              {/* Text Input */}
              {field.type === "text" && (
                <input
                  type="text"
                  required={field.required}
                  value={val}
                  placeholder={placeholder}
                  onChange={(e) => onChange(field.id, e.target.value)}
                  className="w-full px-4 py-2.5 text-sm bg-white border border-tertiary rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-hidden"
                />
              )}

              {/* Numeric Input */}
              {field.type === "number" && (
                <input
                  type="number"
                  required={field.required}
                  value={val}
                  placeholder={placeholder}
                  onChange={(e) => onChange(field.id, Number(e.target.value))}
                  className="w-full px-4 py-2.5 text-sm bg-white border border-tertiary rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-hidden"
                />
              )}

              {/* Textarea */}
              {field.type === "textarea" && (
                <textarea
                  rows={3}
                  required={field.required}
                  value={val}
                  placeholder={placeholder}
                  onChange={(e) => onChange(field.id, e.target.value)}
                  className="w-full px-4 py-2.5 text-sm bg-white border border-tertiary rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-hidden resize-none"
                />
              )}

              {/* Select Dropdown */}
              {field.type === "select" && (
                <select
                  required={field.required}
                  value={val}
                  onChange={(e) => onChange(field.id, e.target.value)}
                  className="w-full px-4 py-2.5 text-sm bg-white border border-tertiary rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-hidden"
                >
                  <option value="">Select an option...</option>
                  {field.options?.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label[currentLang] || opt.label.en}
                    </option>
                  ))}
                </select>
              )}

              {/* Multi-Select Tag Buttons */}
              {field.type === "multi-select" && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {field.options?.map((opt) => {
                    const selectedList: string[] = Array.isArray(val) ? val : [];
                    const isSelected = selectedList.includes(opt.value);

                    const toggleOption = () => {
                      if (isSelected) {
                        onChange(
                          field.id,
                          selectedList.filter((item) => item !== opt.value)
                        );
                      } else {
                        onChange(field.id, [...selectedList, opt.value]);
                      }
                    };

                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={toggleOption}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
                          isSelected
                            ? "bg-primary text-white border-primary shadow-2xs"
                            : "bg-white text-neutral-700 border-tertiary hover:border-primary/50"
                        }`}
                      >
                        {isSelected ? "✓ " : "+ "}
                        {opt.label[currentLang] || opt.label.en}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Toggle Switch */}
              {field.type === "toggle" && (
                <div className="flex items-center gap-3 pt-1">
                  <input
                    type="checkbox"
                    id={`toggle_${field.id}`}
                    checked={Boolean(val)}
                    onChange={(e) => onChange(field.id, e.target.checked)}
                    className="w-4 h-4 text-primary rounded border-tertiary focus:ring-primary"
                  />
                  <label
                    htmlFor={`toggle_${field.id}`}
                    className="text-xs sm:text-sm font-semibold text-neutral-800"
                  >
                    {label}
                  </label>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
