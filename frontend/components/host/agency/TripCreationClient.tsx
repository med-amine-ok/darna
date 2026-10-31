"use client";

import { isValidPriceDzd, PRICE_MAX_DZD, PRICE_MIN_DZD } from "@/lib/booking/config";
import React, { useId, useState } from "react";
import { AnimatePresence, m } from "framer-motion";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { Link, useRouter } from "@/navigation";
import { TripItineraryDay, User, Organization } from "@/types";
import { createTripAction } from "@/app/actions/trips";
import PriceDisplay from "@/components/common/PriceDisplay";
import { formatDzd } from "@/lib/currency";
import { formatDate } from "@/lib/i18n/date-locale";
import { toast } from "react-toastify";
import {
  BrandChevronLeftIcon,
  BrandChevronRightIcon,
  BrandCheckIcon,
  BrandPlusIcon,
  BrandTrashIcon,
  BrandSparklesIcon,
  BrandCloseIcon,
  BrandCalendarIcon,
  BrandCameraIcon,
  BrandPinIcon,
  BrandUploadIcon,
  BrandUsersIcon,
} from "@/components/icons";
import {
  Badge,
  Banner,
  Button,
  Card,
  Chip,
  IconButton,
  Input,
  ProgressBar,
  RadioGroup,
  Textarea,
  cn,
  focusRing,
  useIsRtl,
} from "@/components/ui";
import { dur, ease } from "@/lib/motion";
import { imagery } from "@/lib/imagery";
import { useActionError } from "@/hook/useActionError";

interface TripCreationClientProps {
  currentUser?: User | null;
  organization?: Organization | null;
}

type CancellationPolicy = "flexible" | "moderate" | "strict";
type FieldError = "title" | "groupSize" | "price";

const TOTAL_STEPS = 5;
const POLICIES: CancellationPolicy[] = ["flexible", "moderate", "strict"];
const STEP_KEYS = ["basics", "itinerary", "logistics", "inclusions", "review"] as const;

/** Verified Algerian photography offered as trip covers (lib/imagery.ts). */
const COVER_SUGGESTIONS = [
  imagery.tassiliArch,
  imagery.dunesGolden,
  imagery.desertCampNight,
  imagery.hoggar,
  imagery.ghardaia,
  imagery.constantineBridge,
];

export default function TripCreationClient({ organization }: TripCreationClientProps) {
  const t = useTranslations("hostTrips");
  const tTrips = useTranslations("trips");
  const actionErrorText = useActionError();
  const locale = useLocale();
  const router = useRouter();
  const uid = useId();
  const fid = (name: string) => `${uid}-${name}`;

  const isRtl = useIsRtl();
  // Step + direction of travel (1 forward, -1 back) for the mirrored slide transition.
  const [[currentStep, direction], setStepState] = useState<[number, number]>([1, 0]);
  const setCurrentStep = (next: number | ((prev: number) => number)) =>
    setStepState(([prev]) => {
      const n = typeof next === "function" ? next(prev) : next;
      return [n, n > prev ? 1 : n < prev ? -1 : 0];
    });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<FieldError, string>>>({});

  // Step 1: Basics
  const [title, setTitle] = useState("");
  const [city, setCity] = useState("Djanet");
  const [locationValue, setLocationValue] = useState("Djanet, Illizi");
  const [description, setDescription] = useState("");
  const [coverPhoto, setCoverPhoto] = useState<string>(imagery.tassiliArch);
  const [gallery] = useState<string[]>([imagery.tassiliArch, imagery.tassiliRock, imagery.desertCampNight]);

  // Step 2: Itinerary Builder (pre-filled example content, in the host's language)
  const [itinerary, setItinerary] = useState<TripItineraryDay[]>(() => [
    {
      day: 1,
      title: t("create.defaults.day1Title"),
      description: t("create.defaults.day1Description"),
      activities: [
        t("create.defaults.activityPickup"),
        t("create.defaults.activityTransfer"),
        t("create.defaults.activityCampfire"),
      ],
      meals: t("create.defaults.day1Meals"),
      accommodation: t("create.defaults.day1Accommodation"),
    },
    {
      day: 2,
      title: t("create.defaults.day2Title"),
      description: t("create.defaults.day2Description"),
      activities: [
        t("create.defaults.activityTrek"),
        t("create.defaults.activityRockArt"),
        t("create.defaults.activitySunset"),
      ],
      meals: t("create.defaults.day2Meals"),
      accommodation: t("create.defaults.day2Accommodation"),
    },
  ]);

  // Step 3: Logistics & Pricing
  const [durationDays, setDurationDays] = useState<number>(3);
  const [minGroupSize, setMinGroupSize] = useState<number>(2);
  const [maxGroupSize, setMaxGroupSize] = useState<number>(8);
  const [meetingPoint, setMeetingPoint] = useState(() => t("create.defaults.meetingPoint"));
  const [pricePerPerson, setPricePerPerson] = useState<number>(55000);
  const [departureDates, setDepartureDates] = useState<string[]>([
    "2026-11-05",
    "2026-11-20",
    "2026-12-05",
  ]);
  const [newDateInput, setNewDateInput] = useState("");

  // Step 4: Inclusions, Exclusions & Policy
  const [inclusions, setInclusions] = useState<string[]>(() => [
    t("create.defaults.inclusion1"),
    t("create.defaults.inclusion2"),
    t("create.defaults.inclusion3"),
    t("create.defaults.inclusion4"),
    t("create.defaults.inclusion5"),
  ]);
  const [newInclusion, setNewInclusion] = useState("");

  const [exclusions, setExclusions] = useState<string[]>(() => [
    t("create.defaults.exclusion1"),
    t("create.defaults.exclusion2"),
    t("create.defaults.exclusion3"),
    t("create.defaults.exclusion4"),
  ]);
  const [newExclusion, setNewExclusion] = useState("");

  const [cancellationPolicy, setCancellationPolicy] = useState<CancellationPolicy>("moderate");

  const clearError = (field: FieldError) =>
    setErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });

  // Itinerary helpers
  const handleAddDay = () => {
    const nextDayNum = itinerary.length + 1;
    setItinerary([
      ...itinerary,
      {
        day: nextDayNum,
        title: t("create.defaults.newDayTitle", { day: nextDayNum }),
        description: t("create.defaults.newDayDescription"),
        activities: [t("create.defaults.activityTrek"), t("create.defaults.activityCulture")],
        meals: t("create.defaults.newDayMeals"),
        accommodation: t("create.defaults.newDayAccommodation"),
      },
    ]);
    setDurationDays(nextDayNum);
  };

  const handleRemoveDay = (index: number) => {
    if (itinerary.length <= 1) return;
    const updated = itinerary
      .filter((_, i) => i !== index)
      .map((item, idx) => ({ ...item, day: idx + 1 }));
    setItinerary(updated);
    setDurationDays(updated.length);
  };

  const handleUpdateDay = (index: number, updates: Partial<TripItineraryDay>) => {
    setItinerary(itinerary.map((item, i) => (i === index ? { ...item, ...updates } : item)));
  };

  // Departure date helpers
  const handleAddDate = () => {
    if (!newDateInput.trim()) return;
    if (!departureDates.includes(newDateInput.trim())) {
      setDepartureDates([...departureDates, newDateInput.trim()]);
    }
    setNewDateInput("");
  };

  const handleRemoveDate = (dateToRemove: string) => {
    setDepartureDates(departureDates.filter((d) => d !== dateToRemove));
  };

  // Inclusion / Exclusion helpers
  const handleAddInclusion = () => {
    if (newInclusion.trim()) {
      setInclusions([...inclusions, newInclusion.trim()]);
      setNewInclusion("");
    }
  };

  const handleAddExclusion = () => {
    if (newExclusion.trim()) {
      setExclusions([...exclusions, newExclusion.trim()]);
      setNewExclusion("");
    }
  };

  const validate = (): boolean => {
    const next: Partial<Record<FieldError, string>> = {};
    if (!title.trim()) next.title = t("create.errors.titleRequired");
    if (!(minGroupSize >= 1) || minGroupSize > maxGroupSize) {
      next.groupSize = t("create.errors.groupSize");
    }
    if (!isValidPriceDzd(pricePerPerson)) {
      next.price = t("create.errors.price", {
        min: formatDzd(PRICE_MIN_DZD, locale),
        max: formatDzd(PRICE_MAX_DZD, locale),
      });
    }
    setErrors(next);
    if (next.title) {
      setCurrentStep(1);
      return false;
    }
    if (next.groupSize || next.price) {
      setCurrentStep(3);
      return false;
    }
    return true;
  };

  // Publish handler
  const handlePublish = async (status: "active" | "draft" = "active") => {
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      // The organization is taken from the session on the server.
      const result = await createTripAction({
        title,
        description,
        coverPhoto,
        gallery,
        itinerary,
        durationDays,
        minGroupSize,
        maxGroupSize,
        pricePerPerson,
        meetingPoint,
        city,
        locationValue,
        inclusions,
        exclusions,
        cancellationPolicy,
        status,
        departureDates,
      });
      if (!result.ok) {
        toast.error(actionErrorText(result));
        return;
      }

      toast.success(status === "active" ? t("create.toast.published") : t("create.toast.drafted"));

      router.push("/host/agency/trips");
      router.refresh();
    } catch {
      toast.error(t("create.toast.failed"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const errorEntries = (Object.keys(errors) as FieldError[]).filter((k) => errors[k]);
  const errorTarget: Record<FieldError, { id: string; step: number }> = {
    title: { id: fid("title"), step: 1 },
    groupSize: { id: fid("min-group"), step: 3 },
    price: { id: fid("price"), step: 3 },
  };

  const focusField = (field: FieldError) => {
    const { id, step } = errorTarget[field];
    setCurrentStep(step);
    // Wait for the step to render before moving focus to the field.
    window.requestAnimationFrame(() => document.getElementById(id)?.focus());
  };

  // Same copy the guest sees on the trip page (rules live in lib/booking/cancellation.ts).
  const policyLabel = (p: CancellationPolicy) => tTrips(`policy.${p}.label`);
  const policyDesc = (p: CancellationPolicy) => tTrips(`policy.${p}.summaryTrip`);

  const agencyName = organization?.name || t("create.review.agencyFallback");
  const nights = Math.max(1, durationDays - 1);
  const progress = Math.round((currentStep / TOTAL_STEPS) * 100);

  // Direction-aware step transition, mirrored in RTL (forward = from the reading end).
  const sign = isRtl ? -1 : 1;
  const stepVariants = {
    enter: (d: number) => ({ opacity: 0, x: d === 0 ? 0 : d * sign * 40 }),
    center: { opacity: 1, x: 0, transition: { duration: dur.slow, ease: ease.out } },
    exit: (d: number) => ({ opacity: 0, x: d === 0 ? 0 : -d * sign * 24, transition: { duration: dur.fast, ease: ease.standard } }),
  };

  const stepHeader = (num: number, heading: string, intro: string) => (
    <div className="min-w-0">
      <p className="text-eyebrow uppercase text-secondary-700">
        {t("create.stepOf", { current: num, total: TOTAL_STEPS })}
      </p>
      <h2 className="mt-2 font-serif text-display-md text-primary-900 [text-wrap:balance]">{heading}</h2>
      <p className="mt-2 max-w-xl text-body text-primary-600 [text-wrap:pretty]">{intro}</p>
    </div>
  );

  const coverChoices = Array.from(new Set([...gallery, ...COVER_SUGGESTIONS]));

  /** Trip card preview in the pilot TripCard language (live, from the wizard state). */
  const previewCard = (
    <div aria-label={t("create.previewLabel")} role="group">
      <div className="relative aspect-[4/5] w-full overflow-hidden rounded-3xl bg-tertiary-100 shadow-e3">
        {coverPhoto && (
          <Image
            src={coverPhoto}
            alt=""
            fill
            sizes="(max-width: 1024px) 90vw, 340px"
            className="object-cover"
          />
        )}
        <div aria-hidden="true" className="absolute inset-0 scrim-bottom" />
        <div className="absolute inset-x-3.5 top-3.5 flex items-center justify-between gap-2">
          <span className="glass-light flex min-w-0 items-center gap-1.5 rounded-full py-1 pe-3 ps-2 text-[0.6875rem] font-semibold text-primary-900 shadow-e1">
            <BrandCalendarIcon size={13} className="shrink-0 text-secondary-700" aria-hidden="true" />
            <span className="truncate">{t("duration", { days: durationDays, nights })}</span>
          </span>
          <Badge tone="terracotta" className="shrink-0">
            {t("create.previewBadge")}
          </Badge>
        </div>
        <div className="absolute inset-x-0 bottom-0 p-5 text-white">
          <p className="text-eyebrow uppercase text-tertiary-200">{t("cityCountry", { city: city || "…" })}</p>
          <p className="mt-2 line-clamp-2 font-serif text-[1.375rem] leading-tight">
            {title || t("create.review.untitled")}
          </p>
          <p className="mt-3 flex items-center gap-1.5 text-meta text-white/85">
            <BrandUsersIcon size={13} aria-hidden="true" />
            {t("create.review.groupRange", { min: minGroupSize, max: maxGroupSize })}
          </p>
        </div>
      </div>
      <div className="flex items-end justify-between gap-3 px-1 pt-3.5">
        <div>
          <span className="block text-meta text-primary-500">{t("list.pricePerTraveler")}</span>
          <PriceDisplay
            price={pricePerPerson}
            priceClassName="text-[1.0625rem] font-semibold text-primary-900 tabular-nums"
            eurClassName="text-meta text-primary-500 tabular-nums"
          />
        </div>
        <span className="text-meta text-primary-600">{agencyName}</span>
      </div>
    </div>
  );

  const listEditor = (
    kind: "included" | "excluded",
    items: string[],
    setItems: (next: string[]) => void,
    value: string,
    setValue: (v: string) => void,
    onAdd: () => void
  ) => {
    const included = kind === "included";
    return (
      <Card variant="surface" padding="md" className="space-y-4">
        <h3 className="flex items-center gap-2 text-title text-primary-900">
          <span
            aria-hidden="true"
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-full",
              included ? "bg-secondary-100 text-secondary-800" : "bg-accent-100 text-accent-800"
            )}
          >
            {included ? <BrandCheckIcon size={16} /> : <BrandCloseIcon size={16} />}
          </span>
          {included ? t("create.inclusions.included") : t("create.inclusions.excluded")}
        </h3>
        <ul className="divide-y divide-primary/[0.06]">
          {items.map((item, i) => (
            <li key={`${item}-${i}`} className="flex items-start justify-between gap-2 py-1.5">
              <span className="pt-2.5 text-meta leading-snug text-primary-800">{item}</span>
              <IconButton
                label={t("create.inclusions.removeItem", { item })}
                size="sm"
                variant="ghost"
                icon={<BrandCloseIcon size={14} aria-hidden="true" />}
                onClick={() => setItems(items.filter((_, idx) => idx !== i))}
              />
            </li>
          ))}
        </ul>
        <div className="flex items-start gap-2">
          <Input
            id={fid(included ? "new-inclusion" : "new-exclusion")}
            label={included ? t("create.inclusions.newIncluded") : t("create.inclusions.newExcluded")}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                onAdd();
              }
            }}
            containerClassName="flex-1"
          />
          <Button type="button" variant="tertiary" size="lg" onClick={onAdd} leadingIcon={<BrandPlusIcon size={16} aria-hidden="true" />}>
            {t("create.inclusions.add")}
          </Button>
        </div>
      </Card>
    );
  };

  return (
    <div className="flex min-h-[calc(100dvh-4rem)] flex-col">
      {/* Wizard header: title, step chips, animated progress */}
      <header className="glass sticky top-16 z-sticky border-b border-primary/[0.08]">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-2">
            <Link
              href="/host/agency/trips"
              aria-label={t("create.back")}
              title={t("create.back")}
              className={cn(
                "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-primary-700 transition-colors duration-fast ease-standard hover:bg-primary/[0.06]",
                focusRing
              )}
            >
              <BrandChevronLeftIcon size={18} className="rtl:rotate-180" aria-hidden="true" />
            </Link>
            <div className="min-w-0">
              <p className="truncate text-meta text-secondary-700">{organization?.name || t("workspaceFallback")}</p>
              <h1 className="truncate font-serif text-title font-normal text-primary-900">{t("create.pageTitle")}</h1>
            </div>
          </div>

          <nav aria-label={t("create.stepsNav")} className="hidden lg:block">
            <ol className="flex items-center gap-1">
              {STEP_KEYS.map((key, i) => {
                const num = i + 1;
                const active = currentStep === num;
                const done = currentStep > num;
                return (
                  <li key={key} className="flex items-center gap-1">
                    {i > 0 && <span aria-hidden="true" className={cn("h-px w-4", done || active ? "bg-secondary-400" : "bg-primary/15")} />}
                    <button
                      type="button"
                      onClick={() => setCurrentStep(num)}
                      aria-current={active ? "step" : undefined}
                      className={cn(
                        "flex h-9 items-center gap-2 rounded-full pe-3 ps-1.5 text-meta font-semibold transition-colors duration-fast ease-standard",
                        focusRing,
                        active ? "bg-white text-primary-900 shadow-e1" : "text-primary-600 hover:text-primary-900"
                      )}
                    >
                      <span
                        aria-hidden="true"
                        className={cn(
                          "flex h-6 w-6 items-center justify-center rounded-full text-[0.6875rem] tabular-nums",
                          active ? "bg-primary-800 text-white" : done ? "bg-secondary-100 text-secondary-800" : "bg-primary/[0.06] text-primary-600"
                        )}
                      >
                        {done ? <BrandCheckIcon size={13} /> : num}
                      </span>
                      <span className="sr-only">{t("create.stepChip", { num, label: t(`create.steps.${key}`) })}</span>
                      <span aria-hidden="true">{t(`create.steps.${key}`)}</span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </nav>

          <Button variant="ghost" size="sm" onClick={() => handlePublish("draft")} disabled={isSubmitting}>
            {t("create.saveDraft")}
          </Button>
        </div>
        <ProgressBar value={progress} label={t("create.progressLabel")} size="sm" tone="accent" className="rounded-none" />
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-10 pt-8 sm:px-6 lg:px-8">
        {errorEntries.length > 0 && (
          <Banner tone="danger" title={t("create.errors.summary")} className="mb-6">
            <ul className="mt-1 list-disc space-y-1 ps-5">
              {errorEntries.map((field) => (
                <li key={field}>
                  <button type="button" onClick={() => focusField(field)} className={cn("rounded text-start underline", focusRing)}>
                    {errors[field]}
                  </button>
                </li>
              ))}
            </ul>
          </Banner>
        )}

        <div className={cn("grid grid-cols-1 gap-8", currentStep < TOTAL_STEPS && "lg:grid-cols-[minmax(0,1fr)_340px] xl:gap-12")}>
          <div className="min-w-0 overflow-x-clip">
            <AnimatePresence mode="wait" initial={false} custom={direction}>
              <m.section
                key={currentStep}
                custom={direction}
                variants={stepVariants}
                initial="enter"
                animate="center"
                exit="exit"
                className="space-y-8"
              >
                {/* Step 1: Basics */}
                {currentStep === 1 && (
                  <>
                    {stepHeader(1, t("create.basics.heading"), t("create.basics.intro"))}
                    <div className="space-y-4">
                      <Input
                        id={fid("title")}
                        label={t("create.basics.title")}
                        value={title}
                        aria-required="true"
                        error={errors.title}
                        helper={t("create.basics.titlePlaceholder")}
                        onChange={(e) => {
                          setTitle(e.target.value);
                          clearError("title");
                        }}
                      />
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <Input
                          id={fid("city")}
                          label={t("create.basics.city")}
                          value={city}
                          aria-required="true"
                          onChange={(e) => setCity(e.target.value)}
                          prefix={<BrandPinIcon size={16} aria-hidden="true" />}
                        />
                        <Input
                          id={fid("location")}
                          label={t("create.basics.location")}
                          value={locationValue}
                          aria-required="true"
                          onChange={(e) => setLocationValue(e.target.value)}
                        />
                      </div>
                      <Textarea
                        id={fid("description")}
                        label={t("create.basics.description")}
                        rows={4}
                        value={description}
                        aria-required="true"
                        helper={t("create.basics.descriptionPlaceholder")}
                        onChange={(e) => setDescription(e.target.value)}
                      />
                    </div>

                    {/* Cover photo: library picker + URL, over the existing coverPhoto state */}
                    <fieldset className="space-y-4">
                      <legend className="mb-1 text-title text-primary-900">{t("create.basics.coverPhoto")}</legend>
                      <p className="text-meta text-primary-600">{t("create.basics.coverHint")}</p>
                      <div className="relative aspect-[16/10] w-full overflow-hidden rounded-2xl bg-tertiary-100 shadow-e1">
                        {coverPhoto ? (
                          <Image
                            src={coverPhoto}
                            alt={t("create.basics.coverAlt")}
                            fill
                            sizes="(max-width: 1024px) 92vw, 680px"
                            className="object-cover"
                          />
                        ) : (
                          <div className="flex h-full flex-col items-center justify-center gap-2 text-primary-600">
                            <BrandCameraIcon size={28} aria-hidden="true" />
                            <span className="text-meta">{t("create.basics.coverEmpty")}</span>
                          </div>
                        )}
                        <span className="glass-light absolute bottom-3 start-3 rounded-full px-3 py-1 text-meta font-semibold text-primary-900 shadow-e1">
                          {t("create.basics.coverBadge")}
                        </span>
                      </div>
                      <ul className="grid grid-cols-3 gap-2 sm:grid-cols-6" aria-label={t("create.basics.coverLibrary")}>
                        {coverChoices.map((src, i) => {
                          const selected = src === coverPhoto;
                          return (
                            <li key={src}>
                              <button
                                type="button"
                                onClick={() => setCoverPhoto(src)}
                                aria-pressed={selected}
                                aria-label={t("create.basics.coverChoice", { number: i + 1 })}
                                className={cn(
                                  "group relative block aspect-square w-full overflow-hidden rounded-xl bg-tertiary-100 transition-shadow duration-fast ease-standard",
                                  focusRing,
                                  selected ? "ring-2 ring-accent-600 ring-offset-2 ring-offset-darnaBg" : "shadow-e1 hover:shadow-e2"
                                )}
                              >
                                <Image
                                  src={src}
                                  alt=""
                                  fill
                                  sizes="120px"
                                  className="object-cover transition-transform [transition-duration:700ms] ease-out group-hover:scale-[1.04]"
                                />
                                {selected && (
                                  <span className="absolute end-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-accent-600 text-white shadow-e2">
                                    <BrandCheckIcon size={13} aria-hidden="true" />
                                  </span>
                                )}
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                      <Input
                        id={fid("cover")}
                        type="url"
                        dir="ltr"
                        label={t("create.basics.coverUrl")}
                        value={coverPhoto}
                        aria-required="true"
                        onChange={(e) => setCoverPhoto(e.target.value)}
                        prefix={<BrandUploadIcon size={16} aria-hidden="true" />}
                      />
                    </fieldset>
                  </>
                )}

                {/* Step 2: Itinerary */}
                {currentStep === 2 && (
                  <>
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                      {stepHeader(2, t("create.itinerary.heading"), t("create.itinerary.intro"))}
                      <Button
                        type="button"
                        variant="tertiary"
                        size="md"
                        onClick={handleAddDay}
                        leadingIcon={<BrandPlusIcon size={16} aria-hidden="true" />}
                        className="self-start sm:self-auto"
                      >
                        {t("create.itinerary.addDay")}
                      </Button>
                    </div>
                    <ol className="relative space-y-5 before:absolute before:bottom-6 before:start-[1.125rem] before:top-6 before:w-px before:bg-primary/10">
                      {itinerary.map((dayItem, index) => (
                        <li key={dayItem.day} className="relative flex gap-4">
                          <span
                            aria-hidden="true"
                            className="relative z-[1] mt-5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-800 text-meta font-semibold tabular-nums text-white shadow-e2"
                          >
                            {dayItem.day}
                          </span>
                          <Card padding="md" className="min-w-0 flex-1 space-y-3">
                            <div className="flex items-center justify-between gap-2">
                              <h3 className="text-title text-primary-900">{t("create.itinerary.dayBadge", { day: dayItem.day })}</h3>
                              {itinerary.length > 1 && (
                                <IconButton
                                  label={t("create.itinerary.removeDay", { day: dayItem.day })}
                                  size="sm"
                                  variant="ghost"
                                  icon={<BrandTrashIcon size={16} aria-hidden="true" />}
                                  onClick={() => handleRemoveDay(index)}
                                />
                              )}
                            </div>
                            <Input
                              id={fid(`day-${index}-title`)}
                              label={t("create.itinerary.dayTitle", { day: dayItem.day })}
                              value={dayItem.title}
                              aria-required="true"
                              onChange={(e) => handleUpdateDay(index, { title: e.target.value })}
                            />
                            <Textarea
                              id={fid(`day-${index}-desc`)}
                              label={t("create.itinerary.dayDescription", { day: dayItem.day })}
                              rows={2}
                              value={dayItem.description}
                              aria-required="true"
                              onChange={(e) => handleUpdateDay(index, { description: e.target.value })}
                            />
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                              <Input
                                id={fid(`day-${index}-meals`)}
                                label={t("create.itinerary.meals")}
                                value={dayItem.meals || ""}
                                helper={t("create.itinerary.mealsPlaceholder")}
                                onChange={(e) => handleUpdateDay(index, { meals: e.target.value })}
                              />
                              <Input
                                id={fid(`day-${index}-stay`)}
                                label={t("create.itinerary.accommodation")}
                                value={dayItem.accommodation || ""}
                                helper={t("create.itinerary.accommodationPlaceholder")}
                                onChange={(e) => handleUpdateDay(index, { accommodation: e.target.value })}
                              />
                            </div>
                          </Card>
                        </li>
                      ))}
                    </ol>
                  </>
                )}

                {/* Step 3: Logistics & pricing */}
                {currentStep === 3 && (
                  <>
                    {stepHeader(3, t("create.logistics.heading"), t("create.logistics.intro"))}
                    <div className="space-y-5">
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                        <Input
                          id={fid("duration")}
                          type="number"
                          min={1}
                          max={30}
                          label={t("create.logistics.duration")}
                          value={durationDays}
                          onChange={(e) => setDurationDays(parseInt(e.target.value, 10) || 1)}
                          className="tabular-nums"
                        />
                        <Input
                          id={fid("min-group")}
                          type="number"
                          min={1}
                          label={t("create.logistics.minGroup")}
                          value={minGroupSize}
                          aria-invalid={errors.groupSize ? true : undefined}
                          onChange={(e) => {
                            setMinGroupSize(parseInt(e.target.value, 10) || 1);
                            clearError("groupSize");
                          }}
                          className="tabular-nums"
                        />
                        <Input
                          id={fid("max-group")}
                          type="number"
                          min={1}
                          label={t("create.logistics.maxGroup")}
                          value={maxGroupSize}
                          error={errors.groupSize}
                          onChange={(e) => {
                            setMaxGroupSize(parseInt(e.target.value, 10) || 1);
                            clearError("groupSize");
                          }}
                          className="tabular-nums"
                        />
                      </div>

                      <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-[minmax(0,18rem)_1fr]">
                        <Input
                          id={fid("price")}
                          type="number"
                          step={1000}
                          min={5000}
                          label={t("create.logistics.price")}
                          value={pricePerPerson}
                          aria-required="true"
                          error={errors.price}
                          suffix={<span className="text-meta font-semibold">DZD</span>}
                          onChange={(e) => {
                            setPricePerPerson(parseInt(e.target.value, 10) || 0);
                            clearError("price");
                          }}
                          className="tabular-nums"
                        />
                        <div className="rounded-2xl bg-darnaBg-300/60 px-4 py-3" aria-live="polite">
                          <PriceDisplay
                            price={pricePerPerson}
                            period={tTrips("card.perPerson")}
                            priceClassName="font-serif text-heading text-primary-900 tabular-nums"
                            eurClassName="text-meta text-primary-600 tabular-nums"
                          />
                        </div>
                      </div>

                      <Input
                        id={fid("meeting")}
                        label={t("create.logistics.meetingPoint")}
                        value={meetingPoint}
                        aria-required="true"
                        helper={t("create.logistics.meetingPointPlaceholder")}
                        onChange={(e) => setMeetingPoint(e.target.value)}
                        prefix={<BrandPinIcon size={16} aria-hidden="true" />}
                      />

                      <Card as="section" variant="sunken" padding="md" className="space-y-4">
                        <h3 className="text-title text-primary-900">{t("create.logistics.departures")}</h3>
                        <div className="flex items-start gap-2">
                          <Input
                            id={fid("new-date")}
                            type="date"
                            label={t("create.logistics.newDeparture")}
                            value={newDateInput}
                            onChange={(e) => setNewDateInput(e.target.value)}
                            containerClassName="flex-1 sm:max-w-xs"
                          />
                          <Button
                            type="button"
                            variant="secondary"
                            size="lg"
                            onClick={handleAddDate}
                            leadingIcon={<BrandPlusIcon size={16} aria-hidden="true" />}
                          >
                            {t("create.logistics.addDeparture")}
                          </Button>
                        </div>
                        {departureDates.length === 0 ? (
                          <p className="text-meta text-primary-600">{t("create.logistics.noDates")}</p>
                        ) : (
                          <ul className="flex flex-wrap items-center gap-2">
                            {departureDates.map((date) => {
                              const label = formatDate(date, locale);
                              return (
                                <li key={date}>
                                  <Chip
                                    onRemove={() => handleRemoveDate(date)}
                                    removeLabel={t("create.logistics.removeDate", { date: label })}
                                    icon={<BrandCalendarIcon size={14} aria-hidden="true" />}
                                  >
                                    <time dateTime={date} className="tabular-nums">
                                      {label}
                                    </time>
                                  </Chip>
                                </li>
                              );
                            })}
                          </ul>
                        )}
                      </Card>
                    </div>
                  </>
                )}

                {/* Step 4: Inclusions & cancellation */}
                {currentStep === 4 && (
                  <>
                    {stepHeader(4, t("create.inclusions.heading"), t("create.inclusions.intro"))}
                    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                      {listEditor("included", inclusions, setInclusions, newInclusion, setNewInclusion, handleAddInclusion)}
                      {listEditor("excluded", exclusions, setExclusions, newExclusion, setNewExclusion, handleAddExclusion)}
                    </div>
                    <RadioGroup
                      legend={t("create.inclusions.policy")}
                      name={fid("policy")}
                      value={cancellationPolicy}
                      onChange={(v) => setCancellationPolicy(v as CancellationPolicy)}
                      appearance="card"
                      options={POLICIES.map((pol) => ({ value: pol, label: policyLabel(pol), description: policyDesc(pol) }))}
                    />
                  </>
                )}

                {/* Step 5: Review & publish */}
                {currentStep === 5 && (
                  <>
                    {stepHeader(5, t("create.review.heading"), t("create.review.intro"))}
                    <div className="grid grid-cols-1 items-start gap-8 md:grid-cols-[minmax(0,320px)_1fr]">
                      <div className="mx-auto w-full max-w-[320px]">{previewCard}</div>
                      <Card padding="lg" radius="3xl" className="space-y-5">
                        <div>
                          <Badge tone="success" dot>
                            {t("create.review.ready")}
                          </Badge>
                          <h3 className="mt-3 font-serif text-heading text-primary-900">{title || t("create.review.untitled")}</h3>
                          <p className="mt-2 text-body text-primary-700 [text-wrap:pretty]">
                            {description || t("create.review.noDescription")}
                          </p>
                        </div>
                        <dl className="grid grid-cols-2 gap-4 border-y border-primary/[0.08] py-4">
                          {[
                            [t("create.review.groupSize"), t("create.review.groupRange", { min: minGroupSize, max: maxGroupSize })],
                            [t("create.review.rate"), t("create.review.ratePerPerson", { price: formatDzd(pricePerPerson, locale) })],
                            [t("create.review.itinerary"), t("create.review.daysPlanned", { count: itinerary.length })],
                            [t("create.review.policy"), policyLabel(cancellationPolicy)],
                          ].map(([label, value]) => (
                            <div key={label}>
                              <dt className="text-meta text-primary-600">{label}</dt>
                              <dd className="mt-0.5 font-semibold tabular-nums text-primary-900">{value}</dd>
                            </div>
                          ))}
                        </dl>
                        <p className="text-meta text-primary-600">
                          {t.rich("create.review.hostAgency", {
                            name: agencyName,
                            strong: (chunks) => <strong className="font-semibold text-primary-800">{chunks}</strong>,
                          })}
                        </p>
                        <div className="flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
                          <Button variant="tertiary" size="md" onClick={() => handlePublish("draft")} disabled={isSubmitting}>
                            {t("create.review.saveAsDraft")}
                          </Button>
                          <Button
                            variant="primary"
                            size="md"
                            onClick={() => handlePublish("active")}
                            loading={isSubmitting}
                            leadingIcon={<BrandSparklesIcon size={16} aria-hidden="true" />}
                          >
                            {isSubmitting ? t("create.review.publishing") : t("create.review.publishToDarna")}
                          </Button>
                        </div>
                      </Card>
                    </div>
                  </>
                )}
              </m.section>
            </AnimatePresence>
          </div>

          {currentStep < TOTAL_STEPS && (
            <aside className="hidden lg:block">
              <div className="sticky top-40 space-y-3">
                <p className="text-eyebrow uppercase text-primary-500">{t("create.previewLabel")}</p>
                {previewCard}
              </div>
            </aside>
          )}
        </div>
      </main>

      {/* Sticky footer actions (sits above the phone tab bar) */}
      <footer className="glass sticky bottom-[calc(4rem+env(safe-area-inset-bottom))] z-sticky border-t border-primary/[0.08] md:bottom-0">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <Button
            variant="ghost"
            size="md"
            disabled={currentStep === 1}
            onClick={() => setCurrentStep((prev) => Math.max(1, prev - 1))}
            leadingIcon={<BrandChevronLeftIcon size={16} className="rtl:rotate-180" aria-hidden="true" />}
          >
            {t("create.nav.previous")}
          </Button>

          <span className="text-meta font-semibold tabular-nums text-primary-600" aria-live="polite">
            {t("create.stepOf", { current: currentStep, total: TOTAL_STEPS })}
          </span>

          {currentStep < TOTAL_STEPS ? (
            <Button
              variant="secondary"
              size="md"
              onClick={() => setCurrentStep((prev) => Math.min(TOTAL_STEPS, prev + 1))}
              trailingIcon={<BrandChevronRightIcon size={16} className="rtl:rotate-180" aria-hidden="true" />}
            >
              {t("create.nav.continue")}
            </Button>
          ) : (
            <Button
              variant="primary"
              size="md"
              onClick={() => handlePublish("active")}
              loading={isSubmitting}
              leadingIcon={<BrandCheckIcon size={16} aria-hidden="true" />}
            >
              {isSubmitting ? t("create.review.publishing") : t("create.review.publishCircuit")}
            </Button>
          )}
        </div>
      </footer>
    </div>
  );
}
