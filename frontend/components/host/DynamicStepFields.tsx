"use client";

import React from "react";
import { useLocale, useTranslations } from "next-intl";
import { OnboardingFieldConfig } from "@/types";
import { BrandCheckIcon, BrandPlusIcon } from "@/components/icons";
import { Chip, Switch } from "@/components/ui";

interface DynamicStepFieldsProps {
  fields: OnboardingFieldConfig[];
  values: Record<string, any>;
  onChange: (fieldId: string, value: any) => void;
  /** Overrides the active UI locale (defaults to next-intl's locale). */
  locale?: string;
}

/** Same look as the kit fields (`.field-control` in globals.css). */
const FIELD_CLASS =
  "field-control block w-full min-h-12 rounded-xl bg-white px-4 py-3 text-base sm:text-body text-primary-900 placeholder:text-primary-400";

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
    <div className="space-y-4 border-t border-primary/[0.08] pt-6">
      <p className="text-eyebrow uppercase text-secondary-700">
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
              {isToggle ? null : isGroup ? (
                <p id={labelId} className="block text-meta font-semibold text-primary-800">
                  {label} {field.required && <span aria-hidden="true" className="text-accent-700">*</span>}
                </p>
              ) : (
                <label id={labelId} htmlFor={inputId} className="block text-meta font-semibold text-primary-800">
                  {label} {field.required && <span aria-hidden="true" className="text-accent-700">*</span>}
                </label>
              )}

              {helpText && !isToggle && (
                <p id={helpId} className="text-meta text-primary-600">
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
                      <Chip
                        key={opt.value}
                        selected={isSelected}
                        onSelectedChange={toggleOption}
                        icon={isSelected ? <BrandCheckIcon size={14} aria-hidden="true" /> : <BrandPlusIcon size={14} aria-hidden="true" />}
                      >
                        {opt.label[currentLang] || opt.label.en}
                      </Chip>
                    );
                  })}
                </div>
              )}

              {/* Toggle Switch */}
              {isToggle && (
                <Switch
                  id={inputId}
                  label={<span className="text-body font-semibold text-primary-900">{label}</span>}
                  description={helpText || undefined}
                  checked={Boolean(val)}
                  onCheckedChange={(checked) => onChange(field.id, checked)}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
