"use client";

import React, { useId, useState } from "react";
import Image from "next/image";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { m } from "framer-motion";
import {
  BrandTrashIcon,
  BrandPlusIcon,
  BrandCheckIcon,
  BrandUploadIcon,
  BrandChevronLeftIcon,
  BrandChevronRightIcon,
  BrandStarIcon,
  InstantBookingIcon,
  RequestReviewIcon,
} from "@/components/icons";
import { Badge, Button, Chip, Input, Select, cn, focusRing } from "@/components/ui";
import type { BadgeTone } from "@/components/ui";
import { spring } from "@/lib/motion";
import {
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
  align = "start",
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  level?: 1 | 2;
  size?: "md" | "lg";
  align?: "start" | "center";
}) {
  const Heading = level === 1 ? "h1" : "h2";
  return (
    <div className={cn("space-y-2", align === "center" ? "mx-auto max-w-2xl text-center" : "max-w-2xl text-start")}>
      {eyebrow && <p className="text-eyebrow uppercase text-secondary-700">{eyebrow}</p>}
      {/* tabIndex=-1 lets the flow move focus here when the step changes. */}
      <Heading
        tabIndex={-1}
        data-step-heading
        className={cn(
          "font-serif font-normal text-primary-900 text-balance focus:outline-none",
          size === "lg" ? "text-display-lg" : "text-display-md"
        )}
      >
        {title}
      </Heading>
      {subtitle && <p className="text-body-lg text-primary-600 text-pretty">{subtitle}</p>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Form fields                                                         */
/* ------------------------------------------------------------------ */

/**
 * Classes for the few raw controls left in the flow (they share the kit `.field-control` look).
 * `size` carries width/height/padding/text size so variants never conflict.
 */
export const fieldClass = (
  _tone: "white" | "muted" = "muted",
  size = "w-full h-12 px-4 text-base sm:text-body"
) => `field-control rounded-xl bg-white text-primary-900 placeholder:text-primary-400 ${size}`;

export const labelClass = "mb-1.5 block text-meta font-semibold text-primary-700";

type TextFieldProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value" | "prefix" | "size"> & {
  id: string;
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  invalid?: boolean;
  tone?: "white" | "muted";
  mono?: boolean;
  helper?: React.ReactNode;
};

/** Labelled kit Input; `invalid` wires aria-invalid + the step error summary. */
export function TextField({
  id,
  label,
  value,
  onValueChange,
  invalid = false,
  tone: _tone,
  mono = false,
  type = "text",
  helper,
  className,
  ...rest
}: TextFieldProps) {
  return (
    <Input
      id={id}
      type={type}
      label={label}
      helper={helper}
      value={value}
      onChange={(e) => onValueChange(e.target.value)}
      {...rest}
      aria-invalid={invalid || undefined}
      aria-describedby={invalid ? STEP_ERROR_ID : undefined}
      className={cn(mono && "tabular-nums tracking-wide", className)}
    />
  );
}

/* ------------------------------------------------------------------ */
/* Selectable chips / cards                                            */
/* ------------------------------------------------------------------ */

/** Multi-select chip with a check mark (kit Chip, aria-pressed). */
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
    <Chip
      selected={pressed}
      onSelectedChange={onToggle}
      icon={pressed ? <BrandCheckIcon size={14} aria-hidden="true" /> : <BrandPlusIcon size={14} aria-hidden="true" />}
    >
      {children}
    </Chip>
  );
}

/**
 * Large selectable tile (aria-pressed toggle button): icon, title, optional description,
 * lifts on hover, ink ring + check when selected.
 */
export function ChoiceCard({
  selected,
  onSelect,
  icon,
  title,
  description,
  meta,
  className,
  size = "md",
  id,
}: {
  selected: boolean;
  onSelect: () => void;
  icon?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  meta?: React.ReactNode;
  className?: string;
  size?: "sm" | "md";
  id?: string;
}) {
  return (
    <button
      type="button"
      id={id}
      aria-pressed={selected}
      onClick={onSelect}
      className={cn(
        "group relative flex w-full flex-col items-start gap-3 rounded-2xl bg-white text-start",
        "transition-[box-shadow,transform,background-color] duration-base ease-out hover:-translate-y-0.5",
        size === "sm" ? "p-4" : "p-5",
        selected
          ? "shadow-e2 ring-2 ring-primary-800"
          : "shadow-e1 hover:shadow-e2",
        focusRing,
        className
      )}
    >
      <span className="flex w-full items-start justify-between gap-3">
        {icon && (
          <span
            className={cn(
              "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-colors duration-fast ease-standard",
              selected ? "bg-primary-800 text-white" : "bg-tertiary-100 text-primary-700 group-hover:bg-tertiary-200"
            )}
          >
            {icon}
          </span>
        )}
        <span
          aria-hidden="true"
          className={cn(
            "ms-auto flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition-[opacity,transform] duration-fast ease-out",
            selected ? "scale-100 bg-primary-800 text-white opacity-100" : "scale-75 opacity-0"
          )}
        >
          <BrandCheckIcon size={14} />
        </span>
      </span>
      <span className="block min-w-0">
        <span className="block text-title text-primary-900">{title}</span>
        {description && <span className="mt-1 block text-meta text-primary-600">{description}</span>}
        {meta && <span className="mt-2 block">{meta}</span>}
      </span>
    </button>
  );
}

/** Review summary row; render inside a <dl>. */
export function ReviewRow({
  label,
  children,
  valueClassName = "text-primary-900",
}: {
  label: string;
  children: React.ReactNode;
  valueClassName?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 text-body first:pt-0 last:pb-0">
      <dt className="text-primary-600">{label}</dt>
      <dd className={cn("text-end font-semibold tabular-nums", valueClassName)}>{children}</dd>
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
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Select
          id={`${idPrefix}-wilaya`}
          label={t("location.wilaya")}
          value={wilaya}
          onChange={(e) => {
            const sel = WILAYAS.find((w) => w.value === e.target.value);
            if (sel) onWilayaChange(sel.value, sel.latlng);
          }}
        >
          {!known && wilaya && <option value={wilaya}>{wilaya}</option>}
          {WILAYAS.map((w) => (
            <option key={w.id} value={w.value}>
              {t(`wilayas.${w.id}`)}
            </option>
          ))}
        </Select>
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

      <div className="space-y-2 pt-1" role="group" aria-labelledby={`${idPrefix}-map-label`}>
        <p id={`${idPrefix}-map-label`} className={showMapLabel ? labelClass : "sr-only"}>
          {showMapLabel ? t("location.mapLabel") : t("location.mapPreview")}
        </p>
        <div className="relative isolate h-56 overflow-hidden rounded-2xl bg-tertiary-100 shadow-e1 sm:h-64">
          <LocationMap center={latlng} />
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Photo gallery editor                                                */
/* ------------------------------------------------------------------ */

/** Pulls an http(s) image link out of a drop (dragging a photo from another tab). */
function droppedUrl(e: React.DragEvent): string | null {
  const raw = e.dataTransfer.getData("text/uri-list") || e.dataTransfer.getData("text/plain");
  const url = raw.split(/\r?\n/).find((line) => /^https?:\/\//i.test(line.trim()));
  return url ? url.trim() : null;
}

export function PhotoGalleryEditor({
  idPrefix,
  photos,
  onRemove,
  onReorder,
  urlValue,
  onUrlChange,
  onAddUrl,
  onAddDroppedUrl,
  presets,
  onAddPreset,
  invalid = false,
}: {
  idPrefix: string;
  photos: string[];
  onRemove: (index: number) => void;
  /** Moves a photo; index 0 is the cover. */
  onReorder?: (from: number, to: number) => void;
  urlValue: string;
  onUrlChange: (value: string) => void;
  onAddUrl: () => void;
  /** Adds an image link dropped on the upload area. */
  onAddDroppedUrl?: (url: string) => void;
  presets: PhotoPreset[];
  onAddPreset: (src: string) => void;
  invalid?: boolean;
}) {
  const t = useTranslations("hostFlow");
  const [dragOver, setDragOver] = useState(false);
  const [dropNote, setDropNote] = useState<string | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const noteId = useId();

  const handleZoneDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (dragIndex !== null) return;
    const url = droppedUrl(e);
    if (url && onAddDroppedUrl) {
      setDropNote(null);
      onAddDroppedUrl(url);
      return;
    }
    // Files cannot be stored yet (no upload service): explain instead of silently failing.
    setDropNote(e.dataTransfer.files.length > 0 ? t("photos.dropFilesNote") : t("photos.dropUnknownNote"));
  };

  const count = photos.length;

  return (
    <div className="space-y-5">
      {/* Drop zone */}
      <div
        onDragOver={(e) => {
          if (dragIndex !== null) return;
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleZoneDrop}
        className={cn(
          "relative rounded-3xl border-2 border-dashed p-5 sm:p-7 transition-[background-color,border-color,transform] duration-base ease-out",
          dragOver ? "scale-[1.01] border-accent-500 bg-accent-50" : "border-primary/15 bg-white",
          invalid && "border-accent-700"
        )}
      >
        <div className="flex flex-col items-center gap-3 text-center">
          <span
            className={cn(
              "flex h-14 w-14 items-center justify-center rounded-2xl transition-colors duration-fast",
              dragOver ? "bg-accent-600 text-white" : "bg-tertiary-100 text-primary-700"
            )}
            aria-hidden="true"
          >
            <BrandUploadIcon size={24} />
          </span>
          <div>
            <p className="text-title text-primary-900">{t("photos.dropTitle")}</p>
            <p className="mt-1 text-meta text-primary-600">{t("photos.dropHint")}</p>
          </div>
          <div className="flex w-full max-w-lg flex-col gap-2 sm:flex-row sm:items-start">
            <Input
              id={`${idPrefix}-photo-url`}
              type="url"
              inputMode="url"
              label={t("photos.urlLabel")}
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
              containerClassName="min-w-0 flex-1"
            />
            <Button type="button" variant="secondary" size="lg" onClick={onAddUrl} className="sm:mt-1 h-12 shrink-0">
              {t("addPhoto")}
            </Button>
          </div>
          {dropNote && (
            <p id={noteId} role="status" className="text-meta font-medium text-accent-800">
              {dropNote}
            </p>
          )}
        </div>
      </div>

      {/* Gallery with reorder */}
      <div className="space-y-2">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-meta font-semibold text-primary-800">{t("photos.galleryLabel", { count })}</p>
          {onReorder && count > 1 && <p className="text-meta text-primary-500">{t("photos.reorderHint")}</p>}
        </div>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {photos.map((src, index) => {
            const isCover = index === 0;
            return (
              <m.li
                layout
                transition={spring.layout}
                key={`${src}-${index}`}
                className={cn(
                  "group relative overflow-hidden rounded-2xl bg-tertiary-100 shadow-e1",
                  isCover && "col-span-2 sm:row-span-2",
                  dragIndex === index && "opacity-50",
                  overIndex === index && dragIndex !== index && "ring-2 ring-accent-600"
                )}
              >
                <div
                  draggable={Boolean(onReorder)}
                  onDragStart={(e) => {
                    if (!onReorder) return;
                    e.dataTransfer.effectAllowed = "move";
                    setDragIndex(index);
                  }}
                  onDragOver={(e) => {
                    if (dragIndex === null) return;
                    e.preventDefault();
                    setOverIndex(index);
                  }}
                  onDrop={(e) => {
                    if (dragIndex === null || !onReorder) return;
                    e.preventDefault();
                    e.stopPropagation();
                    if (dragIndex !== index) onReorder(dragIndex, index);
                    setDragIndex(null);
                    setOverIndex(null);
                  }}
                  onDragEnd={() => {
                    setDragIndex(null);
                    setOverIndex(null);
                  }}
                  className={cn("h-full", onReorder && "cursor-grab active:cursor-grabbing")}
                >
                <div className="relative aspect-[4/3] h-full w-full">
                  <Image
                    src={src}
                    alt={t("photos.photoAlt", { number: index + 1 })}
                    fill
                    draggable={false}
                    sizes={isCover ? "(min-width: 640px) 40vw, 90vw" : "(min-width: 640px) 20vw, 45vw"}
                    className="object-cover transition-transform [transition-duration:700ms] ease-out group-hover:scale-[1.04]"
                  />
                  <div aria-hidden="true" className="absolute inset-x-0 top-0 h-14 bg-gradient-to-b from-primary-900/35 to-transparent" />
                </div>
                </div>
                {isCover && (
                  <span className="absolute start-2.5 top-2.5 rounded-full glass-light px-2.5 py-1 text-[0.6875rem] font-semibold text-primary-900 shadow-e1">
                    {t("coverPhoto")}
                  </span>
                )}
                <div className="absolute end-2 top-2 flex items-center gap-1">
                  {onReorder && index > 0 && (
                    <button
                      type="button"
                      onClick={() => onReorder(index, index - 1)}
                      aria-label={t("photos.moveEarlier", { number: index + 1 })}
                      title={t("photos.moveEarlier", { number: index + 1 })}
                      className={cn(
                        "flex h-9 w-9 items-center justify-center rounded-full glass-light text-primary-900 shadow-e1 transition-opacity duration-fast",
                        "opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100",
                        focusRing
                      )}
                    >
                      <BrandChevronLeftIcon size={16} aria-hidden="true" className="rtl:rotate-180" />
                    </button>
                  )}
                  {onReorder && index < count - 1 && (
                    <button
                      type="button"
                      onClick={() => onReorder(index, index + 1)}
                      aria-label={t("photos.moveLater", { number: index + 1 })}
                      title={t("photos.moveLater", { number: index + 1 })}
                      className={cn(
                        "flex h-9 w-9 items-center justify-center rounded-full glass-light text-primary-900 shadow-e1 transition-opacity duration-fast",
                        "opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100",
                        focusRing
                      )}
                    >
                      <BrandChevronRightIcon size={16} aria-hidden="true" className="rtl:rotate-180" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => onRemove(index)}
                    aria-label={t("photos.removeLabel", { number: index + 1 })}
                    title={t("photos.removeLabel", { number: index + 1 })}
                    className={cn(
                      "flex h-9 w-9 items-center justify-center rounded-full glass-light text-primary-900 shadow-e1 transition-[opacity,background-color] duration-fast hover:bg-accent-700 hover:text-white",
                      "opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100",
                      focusRing
                    )}
                  >
                    <BrandTrashIcon size={15} aria-hidden="true" />
                  </button>
                </div>
              </m.li>
            );
          })}
        </ul>
      </div>

      {/* DARNA photo library */}
      <div className="space-y-2" role="group" aria-labelledby={`${idPrefix}-presets`}>
        <p id={`${idPrefix}-presets`} className="text-meta font-semibold text-primary-800">
          {t("photos.presetsLabel")}
        </p>
        <ul className="flex gap-3 overflow-x-auto pb-1 scrollbar-none">
          {presets.map((preset) => (
            <li key={preset.id} className="shrink-0">
              <button
                type="button"
                onClick={() => onAddPreset(preset.src)}
                aria-label={t("photos.addPreset", { name: t(`photos.presets.${preset.id}`) })}
                className={cn(
                  "group block w-36 overflow-hidden rounded-2xl bg-white text-start shadow-e1 transition-[box-shadow,transform] duration-base ease-out hover:-translate-y-0.5 hover:shadow-e2",
                  focusRing
                )}
              >
                <span className="relative block aspect-[4/3] bg-tertiary-100">
                  <Image src={preset.src} alt="" fill sizes="144px" className="object-cover" />
                  <span
                    aria-hidden="true"
                    className="absolute end-2 top-2 flex h-7 w-7 items-center justify-center rounded-full glass-light text-primary-900 shadow-e1"
                  >
                    <BrandPlusIcon size={14} />
                  </span>
                </span>
                <span className="block truncate px-3 py-2 text-meta font-medium text-primary-800">
                  {t(`photos.presets.${preset.id}`)}
                </span>
              </button>
            </li>
          ))}
        </ul>
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
    <div className="space-y-3 rounded-3xl bg-white p-5 shadow-e1 sm:p-6">
      {invites.map((inv, i) => (
        <div key={i} className="flex flex-col gap-2 sm:flex-row sm:items-start">
          <Input
            id={`${idPrefix}-invite-${i}`}
            type="email"
            autoComplete="off"
            label={t("team.emailLabel", { number: i + 1 })}
            value={inv.email}
            onChange={(e) => {
              const val = e.target.value;
              setInvites((prev) => prev.map((item, idx) => (idx === i ? { ...item, email: val } : item)));
            }}
            placeholder={placeholder}
            containerClassName="min-w-0 flex-1"
          />
          <Select
            id={`${idPrefix}-role-${i}`}
            label={t("team.roleLabel", { number: i + 1 })}
            value={inv.role}
            onChange={(e) => {
              const role = e.target.value as TeamInvite["role"];
              setInvites((prev) => prev.map((item, idx) => (idx === i ? { ...item, role } : item)));
            }}
            containerClassName="sm:w-48"
          >
            <option value="manager">{managerLabel}</option>
            <option value="admin">{adminLabel}</option>
          </Select>
        </div>
      ))}

      <Button
        type="button"
        variant="ghost"
        size="sm"
        leadingIcon={<BrandPlusIcon size={16} aria-hidden="true" />}
        onClick={() => setInvites((prev) => [...prev, { email: "", role: "manager" }])}
      >
        {addLabel}
      </Button>
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
  const options: { mode: BookingMode; title: string; desc: string; badge: string; tone: BadgeTone; Icon: typeof InstantBookingIcon }[] = [
    { mode: "instant", title: instantTitle, desc: instantDesc, badge: t("bookingMode.recommended"), tone: "olive", Icon: InstantBookingIcon },
    { mode: "request", title: t("bookingMode.request"), desc: requestDesc, badge: t("bookingMode.manualReview"), tone: "sand", Icon: RequestReviewIcon },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2" role="group" aria-labelledby={labelledBy}>
      {options.map(({ mode, title, desc, badge, tone, Icon }) => (
        <ChoiceCard
          key={mode}
          selected={value === mode}
          onSelect={() => onChange(mode)}
          icon={<Icon size={22} aria-hidden="true" />}
          title={title}
          description={desc}
          meta={<Badge tone={tone}>{badge}</Badge>}
        />
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Star rating picker (hotel classification)                           */
/* ------------------------------------------------------------------ */

export function StarRow({ count, size = 13 }: { count: number; size?: number }) {
  return (
    <span className="inline-flex items-center gap-0.5 text-accent-600" aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <BrandStarIcon key={i} size={size} className="fill-current" />
      ))}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Info callout                                                        */
/* ------------------------------------------------------------------ */

const noticeTones = {
  ochre: "bg-amber-50 text-amber-900",
  olive: "bg-secondary-50 text-secondary-900",
  sand: "bg-tertiary-100 text-primary-800",
} as const;

export function Notice({
  icon,
  title,
  children,
  tone = "ochre",
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
  tone?: keyof typeof noticeTones;
}) {
  return (
    <div className={cn("flex gap-3 rounded-2xl p-4", noticeTones[tone])}>
      <span className="mt-0.5 shrink-0" aria-hidden="true">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-body font-semibold">{title}</p>
        <p className="mt-0.5 text-meta opacity-90">{children}</p>
      </div>
    </div>
  );
}
