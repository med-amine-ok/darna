"use client";

import React from "react";
import { useLocale, useTranslations } from "next-intl";
import { OnboardingFieldConfig } from "@/types";
import { BrandCheckIcon, BrandPlusIcon } from "@/components/icons";

interface DynamicStepFieldsProps {
  fields: OnboardingFieldConfig[];
  values: Record<string, any>;
  onChange: (fieldId: string, value: any) => void;
  /** Overrides the active UI locale (defaults to next-intl's locale). */
  locale?: string;
}

const FIELD_CLASS =
  "w-full px-4 py-2.5 text-sm bg-white border border-tertiary rounded-xl text-primary placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary/20 focus-visible:ring-accent-600 focus:border-primary";

const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2";

/**
 * Renders admin-configured onboarding fields. Labels, placeholders, help texts
 * and options come from the config already localized (en/fr/ar).
 */
export default function DynamicStepFields({
  fields,
  values,
  onChange,
  locale: localeOverride,
}: DynamicStepFieldsProps) {
  const t = useTranslations("hostFlow");
  const activeLocale = useLocale();
  const locale = localeOverride ?? activeLocale;

  if (!fields || fields.length === 0) return null;

  const currentLang = (["en", "fr", "ar"].includes(locale) ? locale : "en") as "en" | "fr" | "ar";

  return (
    <div className="space-y-4 pt-4 border-t border-tertiary/50">
      <p className="text-xs font-bold uppercase tracking-wider text-secondary-700">
        {t("customStep.additionalInfo")}
      </p>

      <div className="space-y-4">
        {fields.map((field) => {
          const val = values[field.id] !== undefined ? values[field.id] : field.defaultValue || "";
          const label = field.label[currentLang] || field.label.en;
          const helpText = field.helpText ? field.helpText[currentLang] || field.helpText.en : "";
          const placeholder = field.placeholder ? field.placeholder[currentLang] || field.placeholder.en : "";
          const inputId = `dyn-field-${field.id}`;
          const labelId = `${inputId}-label`;
          const helpId = helpText ? `${inputId}-help` : undefined;
          // Toggles and tag groups are labelled differently from plain inputs.
          const isGroup = field.type === "multi-select";
          const isToggle = field.type === "toggle";

          return (
            <div key={field.id} className="space-y-1.5">
              {isGroup || isToggle ? (
                <p id={labelId} className="block text-xs sm:text-sm font-bold text-neutral-800">
                  {label} {field.required && <span aria-hidden="true" className="text-rose-600">*</span>}
                </p>
              ) : (
                <label id={labelId} htmlFor={inputId} className="block text-xs sm:text-sm font-bold text-neutral-800">
                  {label} {field.required && <span aria-hidden="true" className="text-rose-600">*</span>}
                </label>
              )}

              {helpText && (
                <p id={helpId} className="text-xs text-neutral-600 leading-relaxed">
                  {helpText}
                </p>
              )}

              {/* Text Input */}
              {field.type === "text" && (
                <input
                  id={inputId}
                  type="text"
                  required={field.required}
                  aria-required={field.required || undefined}
                  aria-describedby={helpId}
                  value={val}
                  placeholder={placeholder}
                  onChange={(e) => onChange(field.id, e.target.value)}
                  className={FIELD_CLASS}
                />
              )}

              {/* Numeric Input */}
              {field.type === "number" && (
                <input
                  id={inputId}
                  type="number"
                  required={field.required}
                  aria-required={field.required || undefined}
                  aria-describedby={helpId}
                  value={val}
                  placeholder={placeholder}
                  onChange={(e) => onChange(field.id, Number(e.target.value))}
                  className={FIELD_CLASS}
                />
              )}

              {/* Textarea */}
              {field.type === "textarea" && (
                <textarea
                  id={inputId}
                  rows={3}
                  required={field.required}
                  aria-required={field.required || undefined}
                  aria-describedby={helpId}
                  value={val}
                  placeholder={placeholder}
                  onChange={(e) => onChange(field.id, e.target.value)}
                  className={`${FIELD_CLASS} resize-none`}
                />
              )}

              {/* Select Dropdown */}
              {field.type === "select" && (
                <select
                  id={inputId}
                  required={field.required}
                  aria-required={field.required || undefined}
                  aria-describedby={helpId}
                  value={val}
                  onChange={(e) => onChange(field.id, e.target.value)}
                  className={FIELD_CLASS}
                >
                  <option value="">{t("customStep.selectOption")}</option>
                  {field.options?.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label[currentLang] || opt.label.en}
                    </option>
                  ))}
                </select>
              )}

              {/* Multi-Select Tag Buttons */}
              {isGroup && (
                <div
                  className="flex flex-wrap gap-2 pt-1"
                  role="group"
                  aria-labelledby={labelId}
                  aria-describedby={helpId}
                >
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
                        aria-pressed={isSelected}
                        onClick={toggleOption}
                        className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold border transition ${FOCUS_RING} ${
                          isSelected
                            ? "bg-primary text-white border-primary shadow-2xs"
                            : "bg-white text-neutral-700 border-tertiary hover:border-primary/50"
                        }`}
                      >
                        {isSelected ? <BrandCheckIcon size={12} /> : <BrandPlusIcon size={12} />}
                        <span>{opt.label[currentLang] || opt.label.en}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Toggle Switch */}
              {isToggle && (
                <div className="flex items-center gap-3 pt-1">
                  <input
                    type="checkbox"
                    id={inputId}
                    checked={Boolean(val)}
                    onChange={(e) => onChange(field.id, e.target.checked)}
                    aria-describedby={helpId}
                    className={`w-4 h-4 text-primary rounded border-tertiary focus:ring-primary ${FOCUS_RING}`}
                  />
                  <label htmlFor={inputId} className="text-xs sm:text-sm font-semibold text-neutral-800">
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
