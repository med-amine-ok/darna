"use client";

import React from "react";
import Image from "next/image";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import {
  BrandTrashIcon,
  BrandPlusIcon,
  BrandCheckIcon,
  InstantBookingIcon,
  RequestReviewIcon,
} from "@/components/icons";
import {
  FOCUS_RING,
  STEP_ERROR_ID,
  WILAYAS,
  type BookingMode,
  type LatLng,
  type PhotoPreset,
  type TeamInvite,
} from "./data";

// Leaflet touches `window`, so the map is client-only.
const LocationMap = dynamic(() => import("@/components/Map"), { ssr: false });

/* ------------------------------------------------------------------ */
/* Step header                                                         */
/* ------------------------------------------------------------------ */

export function StepHeader({
  eyebrow,
  title,
  subtitle,
  level = 2,
  size = "md",
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  level?: 1 | 2;
  size?: "md" | "lg";
}) {
  const Heading = level === 1 ? "h1" : "h2";
  const titleSize = size === "lg" ? "text-2xl sm:text-4xl" : "text-2xl";
  return (
    <div className="text-center max-w-xl mx-auto space-y-1">
      {eyebrow && (
        <p className="text-xs uppercase tracking-wider text-secondary-700 font-bold">{eyebrow}</p>
      )}
      {/* tabIndex=-1 lets the flow move focus here when the step changes. */}
      <Heading
        tabIndex={-1}
        data-step-heading
        className={`${titleSize} font-bold text-primary font-serif focus:outline-none`}
      >
        {title}
      </Heading>
      {subtitle && <p className="text-xs sm:text-sm text-neutral-600">{subtitle}</p>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Form fields                                                         */
/* ------------------------------------------------------------------ */

const FIELD_BASE =
  "border border-tertiary/80 rounded-xl text-primary placeholder:text-neutral-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus:border-primary aria-[invalid=true]:border-status-error";

/** Field classes; `size` carries width/padding/text size so variants never conflict. */
export const fieldClass = (
  tone: "white" | "muted" = "muted",
  size = "w-full px-3.5 py-2.5 text-xs sm:text-sm"
) => `${FIELD_BASE} ${tone === "white" ? "bg-white" : "bg-neutral-50"} ${size}`;

export const labelClass = "block text-xs font-semibold text-neutral-700 mb-1";

type TextFieldProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value"> & {
  id: string;
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  invalid?: boolean;
  tone?: "white" | "muted";
  mono?: boolean;
};

/** Labelled text input; `invalid` wires aria-invalid + the step error summary. */
export function TextField({
  id,
  label,
  value,
  onValueChange,
  invalid = false,
  tone = "muted",
  mono = false,
  type = "text",
  ...rest
}: TextFieldProps) {
  return (
    <div>
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        aria-invalid={invalid || undefined}
        aria-describedby={invalid ? STEP_ERROR_ID : undefined}
        className={`${fieldClass(tone)}${mono ? " font-mono" : ""}`}
        {...rest}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Selectable chips / cards                                            */
/* ------------------------------------------------------------------ */

/** Multi-select chip with a check mark (toggle button). */
export function ToggleChip({
  pressed,
  onToggle,
  children,
}: {
  pressed: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onToggle}
      className={`p-2.5 rounded-xl border text-start flex items-center justify-between gap-1 text-xs transition ${FOCUS_RING} ${
        pressed
          ? "border-primary bg-primary/5 text-primary font-bold"
          : "border-tertiary/70 bg-neutral-50 text-neutral-700 font-medium hover:border-neutral-500"
      }`}
    >
      <span className="truncate">{children}</span>
      {pressed && <BrandCheckIcon size={14} className="text-primary shrink-0" />}
    </button>
  );
}

/** Review summary row; render inside a <dl>. */
export function ReviewRow({
  label,
  children,
  valueClassName = "text-primary",
}: {
  label: string;
  children: React.ReactNode;
  valueClassName?: string;
}) {
  return (
    <div className="flex justify-between items-center gap-3">
      <dt className="text-neutral-600">{label}</dt>
      <dd className={`text-end ${valueClassName}`}>{children}</dd>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Location (wilaya + city + street + map)                             */
/* ------------------------------------------------------------------ */

export function LocationFields({
  idPrefix,
  tone,
  wilaya,
  onWilayaChange,
  city,
  onCityChange,
  cityPlaceholder,
  street,
  onStreetChange,
  streetLabel,
  streetPlaceholder,
  latlng,
  invalidCity = false,
  invalidStreet = false,
  showMapLabel = true,
}: {
  idPrefix: string;
  tone: "white" | "muted";
  wilaya: string;
  onWilayaChange: (value: string, latlng: LatLng) => void;
  city: string;
  onCityChange: (value: string) => void;
  cityPlaceholder: string;
  street: string;
  onStreetChange: (value: string) => void;
  streetLabel: string;
  streetPlaceholder: string;
  latlng: LatLng;
  invalidCity?: boolean;
  invalidStreet?: boolean;
  showMapLabel?: boolean;
}) {
  const t = useTranslations("hostFlow");
  const known = WILAYAS.some((w) => w.value === wilaya);
  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label htmlFor={`${idPrefix}-wilaya`} className={labelClass}>
            {t("location.wilaya")}
          </label>
          <select
            id={`${idPrefix}-wilaya`}
            value={wilaya}
            onChange={(e) => {
              const sel = WILAYAS.find((w) => w.value === e.target.value);
              if (sel) onWilayaChange(sel.value, sel.latlng);
            }}
            className={fieldClass(tone)}
          >
            {!known && wilaya && <option value={wilaya}>{wilaya}</option>}
            {WILAYAS.map((w) => (
              <option key={w.id} value={w.value}>
                {t(`wilayas.${w.id}`)}
              </option>
            ))}
          </select>
        </div>
        <TextField
          id={`${idPrefix}-city`}
          label={t("city")}
          value={city}
          onValueChange={onCityChange}
          placeholder={cityPlaceholder}
          invalid={invalidCity}
          tone={tone}
          autoComplete="address-level2"
        />
      </div>

      <TextField
        id={`${idPrefix}-street`}
        label={streetLabel}
        value={street}
        onValueChange={onStreetChange}
        placeholder={streetPlaceholder}
        invalid={invalidStreet}
        tone={tone}
        autoComplete="street-address"
      />

      <div className="space-y-1.5 pt-1" role="group" aria-labelledby={`${idPrefix}-map-label`}>
        <p
          id={`${idPrefix}-map-label`}
          className={showMapLabel ? "block text-xs font-semibold text-neutral-700" : "sr-only"}
        >
          {showMapLabel ? t("location.mapLabel") : t("location.mapPreview")}
        </p>
        <div className="rounded-2xl overflow-hidden border border-tertiary shadow-xs h-56 sm:h-60 relative">
          <LocationMap center={latlng} />
        </div>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Photo gallery editor                                                */
/* ------------------------------------------------------------------ */

export function PhotoGalleryEditor({
  idPrefix,
  photos,
  onRemove,
  urlValue,
  onUrlChange,
  onAddUrl,
  presets,
  onAddPreset,
  invalid = false,
}: {
  idPrefix: string;
  photos: string[];
  onRemove: (index: number) => void;
  urlValue: string;
  onUrlChange: (value: string) => void;
  onAddUrl: () => void;
  presets: PhotoPreset[];
  onAddPreset: (src: string) => void;
  invalid?: boolean;
}) {
  const t = useTranslations("hostFlow");
  return (
    <div className="space-y-4">
      <ul className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {photos.map((src, index) => (
          <li
            key={`${src}-${index}`}
            className="relative aspect-video rounded-2xl overflow-hidden border border-tertiary group bg-neutral-100"
          >
            <Image
              src={src}
              alt={t("photos.photoAlt", { number: index + 1 })}
              fill
              sizes="(min-width: 640px) 25vw, 50vw"
              className="object-cover"
            />
            {index === 0 && (
              <span className="absolute top-2 start-2 px-2 py-0.5 bg-primary text-white text-[10px] font-bold rounded-full">
                {t("coverPhoto")}
              </span>
            )}
            <button
              type="button"
              onClick={() => onRemove(index)}
              aria-label={t("photos.removeLabel", { number: index + 1 })}
              title={t("photos.removeLabel", { number: index + 1 })}
              className={`absolute top-2 end-2 p-1 bg-black/60 text-white rounded-full opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition hover:bg-rose-600 ${FOCUS_RING}`}
            >
              <BrandTrashIcon size={14} />
            </button>
          </li>
        ))}
      </ul>

      <div className="p-4 bg-white rounded-2xl border border-tertiary/70 space-y-3">
        <label htmlFor={`${idPrefix}-photo-url`} className="block text-xs font-semibold text-neutral-700">
          {t("photos.urlLabel")}
        </label>
        <div className="flex gap-2">
          <input
            id={`${idPrefix}-photo-url`}
            type="url"
            inputMode="url"
            value={urlValue}
            onChange={(e) => onUrlChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                onAddUrl();
              }
            }}
            placeholder={t("addPhotoUrlPlaceholder")}
            aria-invalid={invalid || undefined}
            aria-describedby={invalid ? STEP_ERROR_ID : undefined}
            className={fieldClass("muted", "flex-1 min-w-0 px-3.5 py-2 text-xs")}
          />
          <button
            type="button"
            onClick={onAddUrl}
            className={`px-4 py-2 bg-primary text-white rounded-xl text-xs font-semibold hover:bg-primary/95 transition ${FOCUS_RING}`}
          >
            {t("addPhoto")}
          </button>
        </div>

        <div className="pt-1 flex flex-wrap gap-1.5 text-[11px]" role="group" aria-labelledby={`${idPrefix}-presets`}>
          <span id={`${idPrefix}-presets`} className="text-neutral-600 self-center me-1">
            {t("photos.presetsLabel")}
          </span>
          {presets.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => onAddPreset(preset.src)}
              aria-label={t("photos.addPreset", { name: t(`photos.presets.${preset.id}`) })}
              className={`inline-flex items-center gap-1 px-2.5 py-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-lg font-medium transition ${FOCUS_RING}`}
            >
              <BrandPlusIcon size={12} />
              <span>{t(`photos.presets.${preset.id}`)}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Team invites                                                        */
/* ------------------------------------------------------------------ */

export function TeamInvitesEditor({
  idPrefix,
  invites,
  setInvites,
  placeholder,
  managerLabel,
  adminLabel,
  addLabel,
}: {
  idPrefix: string;
  invites: TeamInvite[];
  setInvites: React.Dispatch<React.SetStateAction<TeamInvite[]>>;
  placeholder: string;
  managerLabel: string;
  adminLabel: string;
  addLabel: string;
}) {
  const t = useTranslations("hostFlow");
  return (
    <div className="space-y-3 bg-white p-6 rounded-3xl border border-tertiary shadow-xs">
      {invites.map((inv, i) => (
        <div key={i} className="flex items-center gap-2">
          <label htmlFor={`${idPrefix}-invite-${i}`} className="sr-only">
            {t("team.emailLabel", { number: i + 1 })}
          </label>
          <input
            id={`${idPrefix}-invite-${i}`}
            type="email"
            autoComplete="off"
            value={inv.email}
            onChange={(e) => {
              const val = e.target.value;
              setInvites((prev) => prev.map((item, idx) => (idx === i ? { ...item, email: val } : item)));
            }}
            placeholder={placeholder}
            className={fieldClass("muted", "flex-1 min-w-0 px-3 py-2 text-xs")}
          />
          <label htmlFor={`${idPrefix}-role-${i}`} className="sr-only">
            {t("team.roleLabel", { number: i + 1 })}
          </label>
          <select
            id={`${idPrefix}-role-${i}`}
            value={inv.role}
            onChange={(e) => {
              const role = e.target.value as TeamInvite["role"];
              setInvites((prev) => prev.map((item, idx) => (idx === i ? { ...item, role } : item)));
            }}
            className={fieldClass("muted", "px-2.5 py-2 text-xs")}
          >
            <option value="manager">{managerLabel}</option>
            <option value="admin">{adminLabel}</option>
          </select>
        </div>
      ))}

      <button
        type="button"
        onClick={() => setInvites((prev) => [...prev, { email: "", role: "manager" }])}
        className={`text-xs font-semibold text-secondary-700 flex items-center gap-1 hover:underline pt-1 rounded ${FOCUS_RING}`}
      >
        <BrandPlusIcon size={15} />
        <span>{addLabel}</span>
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Booking approval mode                                               */
/* ------------------------------------------------------------------ */

export function BookingModeChooser({
  value,
  onChange,
  instantTitle,
  instantDesc,
  requestDesc,
  labelledBy,
}: {
  value: BookingMode;
  onChange: (mode: BookingMode) => void;
  instantTitle: string;
  instantDesc: string;
  requestDesc: string;
  labelledBy?: string;
}) {
  const t = useTranslations("hostFlow");
  const options: {
    mode: BookingMode;
    title: string;
    desc: string;
    badge: string;
    badgeClass: string;
    Icon: typeof InstantBookingIcon;
  }[] = [
    {
      mode: "instant",
      title: instantTitle,
      desc: instantDesc,
      badge: t("bookingMode.recommended"),
      badgeClass: "bg-emerald-100 text-emerald-800",
      Icon: InstantBookingIcon,
    },
    {
      mode: "request",
      title: t("bookingMode.request"),
      desc: requestDesc,
      badge: t("bookingMode.manualReview"),
      badgeClass: "bg-neutral-100 text-neutral-700",
      Icon: RequestReviewIcon,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4" role="group" aria-labelledby={labelledBy}>
      {options.map(({ mode, title, desc, badge, badgeClass, Icon }) => {
        const selected = value === mode;
        return (
          <button
            key={mode}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(mode)}
            className={`p-6 rounded-3xl border-2 text-start transition flex flex-col justify-between ${FOCUS_RING} ${
              selected
                ? "border-primary bg-white shadow-md ring-2 ring-primary/20"
                : "border-tertiary/70 bg-white hover:border-neutral-500"
            }`}
          >
            <span className="space-y-2 block">
              <span className="flex items-center justify-between">
                <Icon size={26} className="text-primary" />
                <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${badgeClass}`}>{badge}</span>
              </span>
              <span className="block font-bold text-primary text-sm">{title}</span>
              <span className="block text-xs text-neutral-600 leading-relaxed">{desc}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Info callout                                                        */
/* ------------------------------------------------------------------ */

export function Notice({
  icon,
  title,
  children,
  className,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
  className: string;
}) {
  return (
    <div className={`p-3 rounded-2xl border mt-2 ${className}`}>
      <p className="font-bold flex items-center gap-1">
        {icon}
        <span>{title}</span>
      </p>
      <p className="text-[11px] mt-0.5">{children}</p>
    </div>
  );
}
