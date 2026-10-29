"use client";

import { isValidPriceDzd, PRICE_MAX_DZD, PRICE_MIN_DZD } from "@/lib/booking/config";
import React, { useId, useState } from "react";
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
} from "@/components/icons";
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

const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2";
const INPUT_BASE = `focus:border-primary ${FOCUS_RING}`;
const ERROR_BORDER = "border-status-error";

export default function TripCreationClient({ organization }: TripCreationClientProps) {
  const t = useTranslations("hostTrips");
  const tTrips = useTranslations("trips");
  const actionErrorText = useActionError();
  const locale = useLocale();
  const router = useRouter();
  const uid = useId();
  const fid = (name: string) => `${uid}-${name}`;

  const [currentStep, setCurrentStep] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<FieldError, string>>>({});

  // Step 1: Basics
  const [title, setTitle] = useState("");
  const [city, setCity] = useState("Djanet");
  const [locationValue, setLocationValue] = useState("Djanet, Illizi");
  const [description, setDescription] = useState("");
  const [coverPhoto, setCoverPhoto] = useState(
    "https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9"
  );
  const [gallery] = useState<string[]>([
    "https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9",
    "https://images.unsplash.com/photo-1518709268805-4e9042af9f23",
    "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800",
  ]);

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

  /** Props wiring an input to its error message. */
  const errorProps = (field: FieldError) =>
    errors[field]
      ? { "aria-invalid": true as const, "aria-describedby": fid(`${field}-error`) }
      : {};

  const errorText = (field: FieldError) =>
    errors[field] ? (
      <p id={fid(`${field}-error`)} className="mt-1.5 text-xs font-semibold text-status-error">
        {errors[field]}
      </p>
    ) : null;

  const stepHeader = (num: number, heading: string, intro: string) => (
    <div>
      <span className="text-xs font-bold text-secondary uppercase tracking-wider">
        {t("create.stepOf", { current: num, total: TOTAL_STEPS })}
      </span>
      <h2 className="text-xl sm:text-2xl font-serif font-bold text-primary mt-1">{heading}</h2>
      <p className="text-xs sm:text-sm text-neutral-600 mt-1">{intro}</p>
    </div>
  );

  const labelLg = "block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-2";
  const labelSm = "block text-[11px] font-bold text-neutral-600 uppercase tracking-wider mb-1";
  const inputLg = `w-full px-4 py-3 bg-neutral-50 border rounded-2xl text-sm font-medium text-primary placeholder:text-neutral-500 ${INPUT_BASE}`;
  const inputSm = `w-full px-3.5 py-2 bg-white border border-tertiary/80 rounded-xl text-xs text-primary placeholder:text-neutral-500 ${INPUT_BASE}`;

  // Same copy the guest sees on the trip page (rules live in lib/booking/cancellation.ts).
  const policyLabel = (p: CancellationPolicy) => tTrips(`policy.${p}.label`);
  const policyDesc = (p: CancellationPolicy) => tTrips(`policy.${p}.summaryTrip`);

  const agencyName = organization?.name || t("create.review.agencyFallback");

  return (
    <div className="min-h-screen bg-bg-light/50 flex flex-col justify-between">
      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-tertiary/60 px-4 sm:px-8 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/host/agency/trips"
              aria-label={t("create.back")}
              title={t("create.back")}
              className={`p-2 rounded-xl text-neutral-600 hover:text-primary hover:bg-neutral-100 transition ${FOCUS_RING}`}
            >
              <BrandChevronLeftIcon size={18} className="rtl:rotate-180" aria-hidden="true" />
            </Link>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-secondary block">
                {organization?.name || t("workspaceFallback")}
              </span>
              <h1 className="text-base sm:text-lg font-serif font-black text-primary">
                {t("create.pageTitle")}
              </h1>
            </div>
          </div>

          {/* Stepper Indicator */}
          <nav aria-label={t("create.stepsNav")} className="hidden sm:block">
            <ol className="flex items-center gap-2">
              {STEP_KEYS.map((key, i) => {
                const num = i + 1;
                return (
                  <li key={key}>
                    <button
                      type="button"
                      onClick={() => setCurrentStep(num)}
                      aria-current={currentStep === num ? "step" : undefined}
                      className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition ${FOCUS_RING} ${
                        currentStep === num
                          ? "bg-primary text-white"
                          : currentStep > num
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-neutral-100 text-neutral-600"
                      }`}
                    >
                      {t("create.stepChip", { num, label: t(`create.steps.${key}`) })}
                    </button>
                  </li>
                );
              })}
            </ol>
          </nav>

          <button
            type="button"
            onClick={() => handlePublish("draft")}
            disabled={isSubmitting}
            className={`text-xs font-bold text-neutral-600 hover:text-primary underline cursor-pointer rounded ${FOCUS_RING}`}
          >
            {t("create.saveDraft")}
          </button>
        </div>
      </header>

      {/* Main Form Body */}
      <main className="max-w-4xl mx-auto w-full px-4 sm:px-8 py-8 flex-1 space-y-4">
        {errorEntries.length > 0 && (
          <div
            role="alert"
            className="rounded-2xl border border-status-error/40 bg-rose-50 p-4 text-sm text-status-error"
          >
            <p className="font-bold">{t("create.errors.summary")}</p>
            <ul className="mt-2 list-disc ps-5 space-y-1">
              {errorEntries.map((field) => (
                <li key={field}>
                  <button
                    type="button"
                    onClick={() => focusField(field)}
                    className={`underline text-start rounded ${FOCUS_RING}`}
                  >
                    {errors[field]}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Step 1: Basics */}
        {currentStep === 1 && (
          <section className="bg-white rounded-3xl border border-tertiary/70 p-6 sm:p-10 shadow-2xs space-y-6 animate-in fade-in">
            {stepHeader(1, t("create.basics.heading"), t("create.basics.intro"))}

            <div className="space-y-4">
              <div>
                <label htmlFor={fid("title")} className={labelLg}>
                  {t("create.basics.title")}
                </label>
                <input
                  id={fid("title")}
                  type="text"
                  value={title}
                  aria-required="true"
                  {...errorProps("title")}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    clearError("title");
                  }}
                  placeholder={t("create.basics.titlePlaceholder")}
                  className={`${inputLg} ${errors.title ? ERROR_BORDER : "border-tertiary/80"}`}
                />
                {errorText("title")}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor={fid("city")} className={labelLg}>
                    {t("create.basics.city")}
                  </label>
                  <input
                    id={fid("city")}
                    type="text"
                    value={city}
                    aria-required="true"
                    onChange={(e) => setCity(e.target.value)}
                    placeholder={t("create.basics.cityPlaceholder")}
                    className={`${inputLg} border-tertiary/80`}
                  />
                </div>
                <div>
                  <label htmlFor={fid("location")} className={labelLg}>
                    {t("create.basics.location")}
                  </label>
                  <input
                    id={fid("location")}
                    type="text"
                    value={locationValue}
                    aria-required="true"
                    onChange={(e) => setLocationValue(e.target.value)}
                    placeholder={t("create.basics.locationPlaceholder")}
                    className={`${inputLg} border-tertiary/80`}
                  />
                </div>
              </div>

              <div>
                <label htmlFor={fid("description")} className={labelLg}>
                  {t("create.basics.description")}
                </label>
                <textarea
                  id={fid("description")}
                  rows={4}
                  value={description}
                  aria-required="true"
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={t("create.basics.descriptionPlaceholder")}
                  className={`${inputLg} border-tertiary/80`}
                />
              </div>

              <div>
                <label htmlFor={fid("cover")} className={labelLg}>
                  {t("create.basics.coverPhoto")}
                </label>
                <input
                  id={fid("cover")}
                  type="url"
                  dir="ltr"
                  value={coverPhoto}
                  aria-required="true"
                  onChange={(e) => setCoverPhoto(e.target.value)}
                  placeholder="https://…"
                  className={`${inputLg} border-tertiary/80`}
                />
                <div className="relative aspect-[16/9] w-full max-w-md mt-3 rounded-2xl overflow-hidden border border-tertiary bg-neutral-100">
                  <Image
                    src={coverPhoto}
                    alt={t("create.basics.coverAlt")}
                    fill
                    sizes="(max-width: 640px) 100vw, 448px"
                    className="object-cover"
                  />
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Step 2: Itinerary Builder */}
        {currentStep === 2 && (
          <section className="bg-white rounded-3xl border border-tertiary/70 p-6 sm:p-10 shadow-2xs space-y-6 animate-in fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              {stepHeader(2, t("create.itinerary.heading"), t("create.itinerary.intro"))}

              <button
                type="button"
                onClick={handleAddDay}
                className={`px-4 py-2 bg-secondary/15 hover:bg-secondary/25 text-secondary rounded-2xl text-xs font-bold transition flex items-center gap-1.5 self-start cursor-pointer ${FOCUS_RING}`}
              >
                <BrandPlusIcon size={16} aria-hidden="true" />
                <span>{t("create.itinerary.addDay")}</span>
              </button>
            </div>

            <ol className="space-y-6">
              {itinerary.map((dayItem, index) => (
                <li
                  key={dayItem.day}
                  className="p-5 bg-neutral-50 rounded-2xl border border-tertiary/70 space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="px-3 py-1 rounded-full bg-primary text-white text-xs font-bold">
                      {t("create.itinerary.dayBadge", { day: dayItem.day })}
                    </h3>
                    {itinerary.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveDay(index)}
                        aria-label={t("create.itinerary.removeDay", { day: dayItem.day })}
                        title={t("create.itinerary.removeDay", { day: dayItem.day })}
                        className={`p-1 rounded-lg text-neutral-600 hover:text-rose-700 transition ${FOCUS_RING}`}
                      >
                        <BrandTrashIcon size={16} aria-hidden="true" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 gap-3">
                    <div>
                      <label htmlFor={fid(`day-${index}-title`)} className={labelSm}>
                        {t("create.itinerary.dayTitle", { day: dayItem.day })}
                      </label>
                      <input
                        id={fid(`day-${index}-title`)}
                        type="text"
                        value={dayItem.title}
                        aria-required="true"
                        onChange={(e) => handleUpdateDay(index, { title: e.target.value })}
                        className={`w-full px-3.5 py-2.5 bg-white border border-tertiary/80 rounded-xl text-xs sm:text-sm font-semibold text-primary ${INPUT_BASE}`}
                      />
                    </div>

                    <div>
                      <label htmlFor={fid(`day-${index}-desc`)} className={labelSm}>
                        {t("create.itinerary.dayDescription", { day: dayItem.day })}
                      </label>
                      <textarea
                        id={fid(`day-${index}-desc`)}
                        rows={2}
                        value={dayItem.description}
                        aria-required="true"
                        onChange={(e) => handleUpdateDay(index, { description: e.target.value })}
                        className={`w-full px-3.5 py-2.5 bg-white border border-tertiary/80 rounded-xl text-xs sm:text-sm text-primary ${INPUT_BASE}`}
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label htmlFor={fid(`day-${index}-meals`)} className={labelSm}>
                          {t("create.itinerary.meals")}
                        </label>
                        <input
                          id={fid(`day-${index}-meals`)}
                          type="text"
                          value={dayItem.meals || ""}
                          onChange={(e) => handleUpdateDay(index, { meals: e.target.value })}
                          placeholder={t("create.itinerary.mealsPlaceholder")}
                          className={inputSm}
                        />
                      </div>
                      <div>
                        <label htmlFor={fid(`day-${index}-stay`)} className={labelSm}>
                          {t("create.itinerary.accommodation")}
                        </label>
                        <input
                          id={fid(`day-${index}-stay`)}
                          type="text"
                          value={dayItem.accommodation || ""}
                          onChange={(e) =>
                            handleUpdateDay(index, { accommodation: e.target.value })
                          }
                          placeholder={t("create.itinerary.accommodationPlaceholder")}
                          className={inputSm}
                        />
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        )}

        {/* Step 3: Logistics & Pricing */}
        {currentStep === 3 && (
          <section className="bg-white rounded-3xl border border-tertiary/70 p-6 sm:p-10 shadow-2xs space-y-6 animate-in fade-in">
            {stepHeader(3, t("create.logistics.heading"), t("create.logistics.intro"))}

            <div className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label htmlFor={fid("duration")} className={labelLg}>
                    {t("create.logistics.duration")}
                  </label>
                  <input
                    id={fid("duration")}
                    type="number"
                    min={1}
                    max={30}
                    value={durationDays}
                    onChange={(e) => setDurationDays(parseInt(e.target.value, 10) || 1)}
                    className={`${inputLg} font-bold border-tertiary/80`}
                  />
                </div>
                <div>
                  <label htmlFor={fid("min-group")} className={labelLg}>
                    {t("create.logistics.minGroup")}
                  </label>
                  <input
                    id={fid("min-group")}
                    type="number"
                    min={1}
                    value={minGroupSize}
                    {...errorProps("groupSize")}
                    onChange={(e) => {
                      setMinGroupSize(parseInt(e.target.value, 10) || 1);
                      clearError("groupSize");
                    }}
                    className={`${inputLg} font-bold ${errors.groupSize ? ERROR_BORDER : "border-tertiary/80"}`}
                  />
                </div>
                <div>
                  <label htmlFor={fid("max-group")} className={labelLg}>
                    {t("create.logistics.maxGroup")}
                  </label>
                  <input
                    id={fid("max-group")}
                    type="number"
                    min={1}
                    value={maxGroupSize}
                    {...errorProps("groupSize")}
                    onChange={(e) => {
                      setMaxGroupSize(parseInt(e.target.value, 10) || 1);
                      clearError("groupSize");
                    }}
                    className={`${inputLg} font-bold ${errors.groupSize ? ERROR_BORDER : "border-tertiary/80"}`}
                  />
                </div>
              </div>
              {errorText("groupSize")}

              <div>
                <label htmlFor={fid("price")} className={labelLg}>
                  {t("create.logistics.price")}
                </label>
                <div className="flex items-center gap-3">
                  <input
                    id={fid("price")}
                    type="number"
                    step={1000}
                    min={5000}
                    value={pricePerPerson}
                    aria-required="true"
                    {...errorProps("price")}
                    onChange={(e) => {
                      setPricePerPerson(parseInt(e.target.value, 10) || 0);
                      clearError("price");
                    }}
                    className={`w-full sm:w-64 px-4 py-3 bg-neutral-50 border rounded-2xl text-lg font-black text-primary ${INPUT_BASE} ${errors.price ? ERROR_BORDER : "border-tertiary/80"}`}
                  />
                  <div className="text-xs text-neutral-600" aria-live="polite">
                    <PriceDisplay price={pricePerPerson} priceClassName="font-bold text-primary text-base" />
                  </div>
                </div>
                {errorText("price")}
              </div>

              <div>
                <label htmlFor={fid("meeting")} className={labelLg}>
                  {t("create.logistics.meetingPoint")}
                </label>
                <input
                  id={fid("meeting")}
                  type="text"
                  value={meetingPoint}
                  aria-required="true"
                  onChange={(e) => setMeetingPoint(e.target.value)}
                  placeholder={t("create.logistics.meetingPointPlaceholder")}
                  className={`${inputLg} border-tertiary/80`}
                />
              </div>

              {/* Scheduled departure dates */}
              <fieldset className="p-5 bg-neutral-50 rounded-2xl border border-tertiary/70 space-y-3">
                <legend className="text-xs font-bold text-neutral-700 uppercase tracking-wider px-1">
                  {t("create.logistics.departures")}
                </legend>
                <div className="flex items-center gap-2">
                  <label htmlFor={fid("new-date")} className="sr-only">
                    {t("create.logistics.newDeparture")}
                  </label>
                  <input
                    id={fid("new-date")}
                    type="date"
                    value={newDateInput}
                    onChange={(e) => setNewDateInput(e.target.value)}
                    className={`px-3.5 py-2 bg-white border border-tertiary/80 rounded-xl text-xs font-semibold text-primary ${INPUT_BASE}`}
                  />
                  <button
                    type="button"
                    onClick={handleAddDate}
                    className={`px-4 py-2 bg-primary text-white rounded-xl text-xs font-bold hover:bg-primary/95 transition flex items-center gap-1 ${FOCUS_RING}`}
                  >
                    <BrandPlusIcon size={14} aria-hidden="true" />
                    <span>{t("create.logistics.addDeparture")}</span>
                  </button>
                </div>

                {departureDates.length === 0 ? (
                  <p className="text-xs text-neutral-600 pt-2">{t("create.logistics.noDates")}</p>
                ) : (
                  <ul className="flex items-center gap-2 flex-wrap pt-2">
                    {departureDates.map((date) => {
                      const label = formatDate(date, locale);
                      return (
                        <li
                          key={date}
                          className="px-3 py-1 rounded-full bg-white border border-tertiary/80 text-xs font-bold text-primary flex items-center gap-2 shadow-2xs"
                        >
                          <time dateTime={date}>{label}</time>
                          <button
                            type="button"
                            onClick={() => handleRemoveDate(date)}
                            aria-label={t("create.logistics.removeDate", { date: label })}
                            className={`rounded-full text-neutral-600 hover:text-rose-700 ${FOCUS_RING}`}
                          >
                            <BrandCloseIcon size={12} aria-hidden="true" />
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </fieldset>
            </div>
          </section>
        )}

        {/* Step 4: Inclusions & Cancellation */}
        {currentStep === 4 && (
          <section className="bg-white rounded-3xl border border-tertiary/70 p-6 sm:p-10 shadow-2xs space-y-6 animate-in fade-in">
            {stepHeader(4, t("create.inclusions.heading"), t("create.inclusions.intro"))}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Inclusions */}
              <div className="p-5 bg-emerald-50/50 rounded-2xl border border-emerald-200 space-y-3">
                <h3 className="text-xs font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
                  <BrandCheckIcon size={15} aria-hidden="true" />
                  <span>{t("create.inclusions.included")}</span>
                </h3>
                <ul className="space-y-2">
                  {inclusions.map((inc, i) => (
                    <li
                      key={i}
                      className="flex items-start justify-between gap-2 text-xs text-neutral-700 bg-white p-2.5 rounded-xl border border-emerald-100"
                    >
                      <span className="leading-snug">{inc}</span>
                      <button
                        type="button"
                        onClick={() => setInclusions(inclusions.filter((_, idx) => idx !== i))}
                        aria-label={t("create.inclusions.removeItem", { item: inc })}
                        className={`rounded text-neutral-600 hover:text-rose-700 ${FOCUS_RING}`}
                      >
                        <BrandCloseIcon size={12} aria-hidden="true" />
                      </button>
                    </li>
                  ))}
                </ul>
                <div className="flex gap-2 pt-2">
                  <label htmlFor={fid("new-inclusion")} className="sr-only">
                    {t("create.inclusions.newIncluded")}
                  </label>
                  <input
                    id={fid("new-inclusion")}
                    type="text"
                    value={newInclusion}
                    onChange={(e) => setNewInclusion(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddInclusion();
                      }
                    }}
                    placeholder={t("create.inclusions.itemPlaceholder")}
                    className={`flex-1 px-3 py-1.5 bg-white border border-emerald-200 rounded-xl text-xs placeholder:text-neutral-500 ${FOCUS_RING}`}
                  />
                  <button
                    type="button"
                    onClick={handleAddInclusion}
                    className={`px-3 py-1.5 bg-emerald-700 text-white rounded-xl text-xs font-bold ${FOCUS_RING}`}
                  >
                    {t("create.inclusions.add")}
                  </button>
                </div>
              </div>

              {/* Exclusions */}
              <div className="p-5 bg-rose-50/50 rounded-2xl border border-rose-200 space-y-3">
                <h3 className="text-xs font-bold text-rose-800 uppercase tracking-wider flex items-center gap-1.5">
                  <BrandCloseIcon size={15} aria-hidden="true" />
                  <span>{t("create.inclusions.excluded")}</span>
                </h3>
                <ul className="space-y-2">
                  {exclusions.map((exc, i) => (
                    <li
                      key={i}
                      className="flex items-start justify-between gap-2 text-xs text-neutral-700 bg-white p-2.5 rounded-xl border border-rose-100"
                    >
                      <span className="leading-snug">{exc}</span>
                      <button
                        type="button"
                        onClick={() => setExclusions(exclusions.filter((_, idx) => idx !== i))}
                        aria-label={t("create.inclusions.removeItem", { item: exc })}
                        className={`rounded text-neutral-600 hover:text-rose-700 ${FOCUS_RING}`}
                      >
                        <BrandCloseIcon size={12} aria-hidden="true" />
                      </button>
                    </li>
                  ))}
                </ul>
                <div className="flex gap-2 pt-2">
                  <label htmlFor={fid("new-exclusion")} className="sr-only">
                    {t("create.inclusions.newExcluded")}
                  </label>
                  <input
                    id={fid("new-exclusion")}
                    type="text"
                    value={newExclusion}
                    onChange={(e) => setNewExclusion(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddExclusion();
                      }
                    }}
                    placeholder={t("create.inclusions.itemPlaceholder")}
                    className={`flex-1 px-3 py-1.5 bg-white border border-rose-200 rounded-xl text-xs placeholder:text-neutral-500 ${FOCUS_RING}`}
                  />
                  <button
                    type="button"
                    onClick={handleAddExclusion}
                    className={`px-3 py-1.5 bg-rose-700 text-white rounded-xl text-xs font-bold ${FOCUS_RING}`}
                  >
                    {t("create.inclusions.add")}
                  </button>
                </div>
              </div>
            </div>

            {/* Cancellation policy selector */}
            <div
              role="group"
              aria-labelledby={fid("policy-label")}
              className="space-y-3 pt-3 border-t border-tertiary/40"
            >
              <h3
                id={fid("policy-label")}
                className="block text-xs font-bold text-neutral-700 uppercase tracking-wider"
              >
                {t("create.inclusions.policy")}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {POLICIES.map((pol) => (
                  <button
                    key={pol}
                    type="button"
                    aria-pressed={cancellationPolicy === pol}
                    onClick={() => setCancellationPolicy(pol)}
                    className={`p-4 rounded-2xl border text-start transition cursor-pointer ${FOCUS_RING} ${
                      cancellationPolicy === pol
                        ? "border-primary bg-primary/5 shadow-2xs"
                        : "border-tertiary bg-neutral-50 hover:bg-white"
                    }`}
                  >
                    <span className="font-bold text-sm text-primary block">{policyLabel(pol)}</span>
                    <span className="text-xs text-neutral-600 mt-1 block">{policyDesc(pol)}</span>
                  </button>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Step 5: Review & Publish */}
        {currentStep === 5 && (
          <section className="bg-white rounded-3xl border border-tertiary/70 p-6 sm:p-10 shadow-2xs space-y-6 animate-in fade-in">
            {stepHeader(5, t("create.review.heading"), t("create.review.intro"))}

            {/* Preview Card */}
            <div className="border border-tertiary/70 rounded-3xl overflow-hidden shadow-sm bg-neutral-50/50">
              <div className="relative aspect-[16/9] w-full bg-neutral-100">
                <Image
                  src={coverPhoto}
                  alt={t("list.coverAlt", { title: title || t("create.review.untitled") })}
                  fill
                  sizes="(max-width: 896px) 100vw, 832px"
                  className="object-cover"
                />
                <div className="absolute top-3 inset-x-3 flex items-center justify-between pointer-events-none">
                  <span className="px-3 py-1 rounded-full bg-white/95 text-xs font-bold text-primary">
                    {t("duration", { days: durationDays, nights: Math.max(1, durationDays - 1) })}
                  </span>
                  <span className="px-3 py-1 rounded-full bg-emerald-700 text-white text-xs font-bold">
                    {t("create.review.ready")}
                  </span>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <span className="text-xs font-bold text-secondary uppercase tracking-wider">
                    {t("cityCountry", { city })}
                  </span>
                  <h3 className="font-serif text-xl font-bold text-primary mt-1">
                    {title || t("create.review.untitled")}
                  </h3>
                  <p className="text-xs sm:text-sm text-neutral-600 mt-2 leading-relaxed">
                    {description || t("create.review.noDescription")}
                  </p>
                </div>

                <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-3 border-y border-tertiary/50 text-xs">
                  <div>
                    <dt className="text-neutral-600 block font-semibold">
                      {t("create.review.groupSize")}
                    </dt>
                    <dd className="font-bold text-primary">
                      {t("create.review.groupRange", { min: minGroupSize, max: maxGroupSize })}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-neutral-600 block font-semibold">
                      {t("create.review.rate")}
                    </dt>
                    <dd className="font-bold text-primary">
                      {t("create.review.ratePerPerson", {
                        price: formatDzd(pricePerPerson, locale),
                      })}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-neutral-600 block font-semibold">
                      {t("create.review.itinerary")}
                    </dt>
                    <dd className="font-bold text-primary">
                      {t("create.review.daysPlanned", { count: itinerary.length })}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-neutral-600 block font-semibold">
                      {t("create.review.policy")}
                    </dt>
                    <dd className="font-bold text-primary">{policyLabel(cancellationPolicy)}</dd>
                  </div>
                </dl>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <span className="text-xs text-neutral-600">
                    {t.rich("create.review.hostAgency", {
                      name: agencyName,
                      strong: (chunks) => <strong>{chunks}</strong>,
                    })}
                  </span>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => handlePublish("draft")}
                      disabled={isSubmitting}
                      className={`px-4 py-2 rounded-xl border border-tertiary bg-white hover:bg-neutral-50 text-xs font-bold text-neutral-700 transition ${FOCUS_RING}`}
                    >
                      {t("create.review.saveAsDraft")}
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePublish("active")}
                      disabled={isSubmitting}
                      aria-busy={isSubmitting}
                      className={`px-6 py-2.5 rounded-xl bg-primary hover:bg-primary/95 text-white text-xs font-bold transition flex items-center gap-2 shadow-sm cursor-pointer ${FOCUS_RING}`}
                    >
                      <BrandSparklesIcon size={15} aria-hidden="true" />
                      <span>
                        {isSubmitting
                          ? t("create.review.publishing")
                          : t("create.review.publishToDarna")}
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}
      </main>

      {/* Sticky Bottom Navigation Footer */}
      <footer className="sticky bottom-0 z-30 bg-white/95 backdrop-blur-md border-t border-tertiary/60 px-4 sm:px-8 py-3.5">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <button
            type="button"
            disabled={currentStep === 1}
            onClick={() => setCurrentStep((prev) => Math.max(1, prev - 1))}
            className={`px-5 py-2.5 rounded-2xl text-xs font-bold transition flex items-center gap-1.5 ${FOCUS_RING} ${
              currentStep === 1
                ? "text-neutral-400 cursor-not-allowed"
                : "text-primary hover:bg-neutral-100 cursor-pointer"
            }`}
          >
            <BrandChevronLeftIcon size={16} className="rtl:rotate-180" aria-hidden="true" />
            <span>{t("create.nav.previous")}</span>
          </button>

          <span className="text-xs text-neutral-600 font-semibold" aria-live="polite">
            {t("create.stepOf", { current: currentStep, total: TOTAL_STEPS })}
          </span>

          {currentStep < TOTAL_STEPS ? (
            <button
              type="button"
              onClick={() => setCurrentStep((prev) => Math.min(TOTAL_STEPS, prev + 1))}
              className={`px-6 py-2.5 bg-primary hover:bg-primary/95 text-white rounded-2xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer ${FOCUS_RING}`}
            >
              <span>{t("create.nav.continue")}</span>
              <BrandChevronRightIcon size={16} className="rtl:rotate-180" aria-hidden="true" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => handlePublish("active")}
              disabled={isSubmitting}
              aria-busy={isSubmitting}
              className={`px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-2xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer ${FOCUS_RING}`}
            >
              <BrandCheckIcon size={16} aria-hidden="true" />
              <span>
                {isSubmitting ? t("create.review.publishing") : t("create.review.publishCircuit")}
              </span>
            </button>
          )}
        </div>
      </footer>
    </div>
  );
}
