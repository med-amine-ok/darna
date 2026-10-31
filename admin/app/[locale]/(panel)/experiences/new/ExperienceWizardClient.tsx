"use client";

import React, { useState } from "react";
import { useRouter } from "@/navigation";
import {
  ArrowLeft,
  Save,
  Check,
  ChevronRight,
  ChevronLeft,
  Plus,
  Trash2,
} from "lucide-react";
import { Stepper, StepItem } from "@/components/ui/Stepper";
import { LivePreviewCard } from "@/components/ui/LivePreviewCard";
import { ProgressChecklist } from "@/components/ui/ProgressChecklist";
import { TipsCard } from "@/components/ui/TipsCard";
import { ChipInput } from "@/components/ui/ChipInput";
import { RichTextField } from "@/components/ui/RichTextField";
import { FileDropzone } from "@/components/ui/FileDropzone";
import { MapPicker } from "@/components/ui/MapPicker";
import { useToast } from "@/components/ui/Toast";
import { useLocale, useTranslations } from "next-intl";
import { formatDzd, intlLocale } from "@/lib/utils/format";
import { WILAYAS, getWilayaLabel } from "@/lib/utils/wilayas";

// Form values stay stable (French identifiers used by the mock data); labels are translated.
const CATEGORY_OPTIONS = [
  { value: "Aventure", labelKey: "adventure" },
  { value: "Culture", labelKey: "culture" },
  { value: "Nature", labelKey: "nature" },
  { value: "Gastronomie", labelKey: "gastronomy" },
  { value: "Mer", labelKey: "sea" },
] as const;

const DIFFICULTY_OPTIONS = [
  { value: "Facile", labelKey: "easy" },
  { value: "Modéré", labelKey: "moderate" },
  { value: "Difficile", labelKey: "hard" },
  { value: "Expert", labelKey: "expert" },
] as const;

const EXPERIENCE_TYPES = [
  "excursion",
  "sport",
  "workshop",
  "tasting",
  "other",
] as const;

const STEP_KEYS = [
  "general",
  "location",
  "details",
  "pricing",
  "media",
  "rules",
] as const;

const PROGRAMME_KEYS = ["welcome", "walk", "waterfall"] as const;

type FieldName =
  | "title"
  | "duration"
  | "groupSize"
  | "languages"
  | "shortDescription"
  | "fullDescription"
  | "city"
  | "address"
  | "transportMode"
  | "pricePerPerson"
  | "priceChild";

const STEP_FIELDS: Record<number, FieldName[]> = {
  1: [
    "title",
    "duration",
    "groupSize",
    "languages",
    "shortDescription",
    "fullDescription",
  ],
  2: ["city", "address", "transportMode"],
  4: ["pricePerPerson", "priceChild"],
};

const INPUT_CLASS =
  "w-full px-3 py-2 text-xs bg-white border rounded-xl shadow-2xs text-primary-900 placeholder:text-primary-500 hover:border-primary/25 focus:outline-none focus:border-primary-600 focus:ring-4 focus:ring-primary/[0.08] transition duration-fast ease-standard";

export default function ExperienceWizardClient() {
  const locale = useLocale() as "en" | "fr" | "ar";
  const t = useTranslations("experienceWizard");
  const router = useRouter();
  const { addToast } = useToast();

  const [currentStep, setCurrentStep] = useState(1);
  const [draftSavedAt, setDraftSavedAt] = useState<Date>(
    () => new Date(2000, 0, 1, 10, 20),
  );
  const [errors, setErrors] = useState<Partial<Record<FieldName, string>>>({});

  // Form state (Mockups 03 & 10), pre-filled demo content
  const [formData, setFormData] = useState({
    title: "Randonnée dans les gorges de Chiffa & Cascade",
    category: "Aventure",
    subCategory: "Randonnée pédestre",
    duration: "4 heures",
    difficulty: "Modéré",
    groupSize: 12,
    languages: ["Français", "Arabe"],
    shortDescription:
      "Partez à la découverte de la faune préservée et des cascades majestueuses des gorges de Chiffa en compagnie d'un guide local certifié.",
    fullDescription:
      "Une excursion revigorante au cœur du parc national de Chréa. Nous longerons la rivière ombragée et observerons les célèbres macaques de Barbarie dans leur habitat naturel.",
    highlights: [
      "Baignade rafraîchissante dans les vasques naturelles",
      "Observation respectueuse des macaques de Barbarie",
      "Thé à la menthe traditionnel offert en fin de parcours",
    ],
    experienceType: "excursion",
    tags: ["Nature", "Cascade", "Faune", "Atlas"],
    country: "DZ",
    wilayaCode: "09",
    city: "Blida",
    address: "Route des Gorges, Ruisseau des Singes, Chiffa",
    coordinates: { lat: 36.425, lng: 2.765 },
    visibilityMode: "exact",
    transportMode: "Véhicule personnel ou Navette",
    accessInstructions:
      "Point de ralliement sur le parking du restaurant des Singes à 08h30 précises.",
    pois: [
      { name: "Ruisseau des Singes", distance: "200 m", time: "3 min à pied" },
      {
        name: "Cascade de Chiffa",
        distance: "2.5 km",
        time: "45 min de marche",
      },
    ],
    pricePerPerson: 3500,
    priceChild: 2000,
    approvalMode: "instant" as "instant" | "request",
    included: ["Guide diplômé", "Assurance excursion", "Collation & thé"],
    notIncluded: ["Déjeuner complet", "Transport depuis Alger"],
    whatToBring: [
      "Chaussures de marche fermées",
      "Gourde 1.5L",
      "Chapeau / Casquette",
    ],
    images: ["/placeholder-experience.jpg"],
  });

  const formatTime = (d: Date) =>
    new Intl.DateTimeFormat(intlLocale(locale), {
      hour: "2-digit",
      minute: "2-digit",
    }).format(d);

  const categoryLabel = (value: string) => {
    const opt = CATEGORY_OPTIONS.find((o) => o.value === value);
    return opt ? t(`categories.${opt.labelKey}`) : value;
  };
  const difficultyLabel = (value: string) => {
    const opt = DIFFICULTY_OPTIONS.find((o) => o.value === value);
    return opt ? t(`difficultyOptions.${opt.labelKey}`) : value;
  };

  const steps: StepItem[] = STEP_KEYS.map((key, i) => ({
    id: i + 1,
    title: t(`steps.${key}`),
  }));

  const validateField = (field: FieldName): string | undefined => {
    switch (field) {
      case "title":
      case "duration":
      case "shortDescription":
      case "fullDescription":
      case "city":
      case "address":
      case "transportMode":
        return formData[field].trim() ? undefined : t("errors.required");
      case "groupSize":
        return Number.isInteger(formData.groupSize) &&
          formData.groupSize >= 1 &&
          formData.groupSize <= 50
          ? undefined
          : t("errors.groupSize", { min: 1, max: 50 });
      case "languages":
        return formData.languages.length > 0
          ? undefined
          : t("errors.languages");
      case "pricePerPerson":
        return formData.pricePerPerson > 0 ? undefined : t("errors.price");
      case "priceChild":
        return formData.priceChild >= 0 ? undefined : t("errors.priceChild");
    }
  };

  const validateSteps = (stepNumbers: number[]) => {
    const found: Partial<Record<FieldName, string>> = {};
    let firstInvalidStep: number | null = null;
    for (const step of stepNumbers) {
      for (const field of STEP_FIELDS[step] ?? []) {
        const message = validateField(field);
        if (message) {
          found[field] = message;
          if (firstInvalidStep === null) firstInvalidStep = step;
        }
      }
    }
    return { found, firstInvalidStep };
  };

  const errorCount = Object.keys(errors).length;

  // Accessible field wiring: label ↔ input, error text ↔ aria-describedby.
  const fieldId = (field: string) => `exp-wizard-${field}`;
  const errorId = (field: FieldName) => `exp-wizard-${field}-error`;
  const a11yProps = (field: FieldName, hintId?: string) => {
    const describedBy = [errors[field] ? errorId(field) : null, hintId]
      .filter(Boolean)
      .join(" ");
    return {
      id: fieldId(field),
      "aria-invalid": errors[field] ? true : undefined,
      "aria-describedby": describedBy || undefined,
    };
  };
  const borderClass = (field: FieldName) =>
    errors[field] ? "border-accent-700" : "border-primary/[0.12]";
  const FieldError = ({ field }: { field: FieldName }) =>
    errors[field] ? (
      <p id={errorId(field)} className="text-[11px] text-accent-700 mt-1">
        {errors[field]}
      </p>
    ) : null;
  const Required = () => (
    <span aria-hidden="true" className="text-accent-700">
      {" *"}
    </span>
  );

  const updateField = <K extends keyof typeof formData>(
    key: K,
    value: (typeof formData)[K],
  ) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    if (key in errors) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[key as FieldName];
        return next;
      });
    }
  };

  const handleSaveDraft = () => {
    const now = new Date();
    setDraftSavedAt(now);
    addToast({
      title: t("toast.draftSaved"),
      description: t("toast.draftSavedAt", { time: formatTime(now) }),
      variant: "info",
    });
  };

  const handleNext = () => {
    const stepsToCheck = currentStep < 6 ? [currentStep] : [1, 2, 4];
    const { found, firstInvalidStep } = validateSteps(stepsToCheck);
    setErrors(found);
    if (firstInvalidStep !== null) {
      if (firstInvalidStep !== currentStep) setCurrentStep(firstInvalidStep);
      return;
    }
    if (currentStep < 6) {
      setCurrentStep((prev) => prev + 1);
    } else {
      addToast({
        title: t("toast.created"),
        description: t("toast.createdDescription"),
        variant: "success",
      });
      router.push("/experiences");
    }
  };

  const handleBack = () => {
    setErrors({});
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    } else {
      router.push("/experiences");
    }
  };

  const handleStepClick = (step: number) => {
    setErrors({});
    setCurrentStep(step);
  };

  const nextLabel = currentStep === 6 ? t("publish") : t("next");

  return (
    <div className="space-y-6">
      {/* 1. Header (Mockup 10) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-primary/[0.06] pb-5">
        <div>
          <button
            type="button"
            onClick={() => router.push("/experiences")}
            className="inline-flex items-center gap-1.5 text-xs text-primary-600 hover:text-primary-900 mb-2 font-medium rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600"
          >
            <ArrowLeft
              className="w-3.5 h-3.5 rtl:rotate-180"
              aria-hidden="true"
            />
            <span>{t("backToList")}</span>
          </button>
          <h1 className="font-serif text-heading text-primary-900">
            {t("title")}
          </h1>
          <p className="text-xs text-primary-600 mt-0.5">{t("subtitle")}</p>
        </div>

        <div className="flex items-center gap-2.5">
          <span
            className="text-[11px] text-primary-600 hidden sm:inline"
            aria-live="polite"
          >
            {t("draftSavedAt", { time: formatTime(draftSavedAt) })}
          </span>
          <button
            type="button"
            onClick={handleSaveDraft}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-primary-800 bg-white shadow-e1 rounded-xl hover:shadow-e2 transition duration-fast ease-standard active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600"
          >
            <Save className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{t("saveDraft")}</span>
          </button>
          <button
            type="button"
            onClick={handleNext}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-primary-800 rounded-xl shadow-e1 shadow-highlight hover:bg-primary-900 transition duration-fast ease-standard active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2"
          >
            <span>{nextLabel}</span>
            {currentStep < 6 && (
              <ChevronRight
                className="w-3.5 h-3.5 rtl:rotate-180"
                aria-hidden="true"
              />
            )}
          </button>
        </div>
      </div>

      {/* 2. Stepper */}
      <div className="bg-white rounded-2xl p-5 shadow-e1">
        <Stepper
          steps={steps}
          currentStep={currentStep}
          onStepClick={handleStepClick}
        />
      </div>

      {/* 3. Three-Column Body: Form (2 cols) + Right Rail (1 col) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form Body */}
        <div className="lg:col-span-2 space-y-6">
          {errorCount > 0 && (
            <div
              role="alert"
              className="p-3 rounded-xl bg-accent-50 ring-1 ring-inset ring-accent-200 text-xs text-accent-800"
            >
              {t("errors.summary", { count: errorCount })}
            </div>
          )}

          {/* STEP 1: Informations Générales (Mockup 10) */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl p-5 shadow-e1 space-y-4">
                <h2 className="text-sm font-semibold text-primary-900 pb-3 border-b border-primary/[0.06]">
                  {t("general.heading")}
                </h2>

                <div>
                  <label
                    htmlFor={fieldId("title")}
                    className="block text-xs font-semibold text-primary-900 mb-1.5"
                  >
                    {t("general.title")}
                    <Required />
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => updateField("title", e.target.value)}
                    className={`${INPUT_CLASS} px-3.5 ${borderClass("title")}`}
                    {...a11yProps("title")}
                  />
                  <FieldError field="title" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor={fieldId("category")}
                      className="block text-xs font-semibold text-primary-900 mb-1.5"
                    >
                      {t("general.category")}
                      <Required />
                    </label>
                    <select
                      id={fieldId("category")}
                      required
                      value={formData.category}
                      onChange={(e) => updateField("category", e.target.value)}
                      className={`${INPUT_CLASS} px-3.5 border-primary/[0.12]`}
                    >
                      {CATEGORY_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {t(`categories.${opt.labelKey}`)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label
                      htmlFor={fieldId("subCategory")}
                      className="block text-xs font-semibold text-primary-900 mb-1.5"
                    >
                      {t("general.subCategory")}
                    </label>
                    <input
                      id={fieldId("subCategory")}
                      type="text"
                      value={formData.subCategory}
                      onChange={(e) =>
                        updateField("subCategory", e.target.value)
                      }
                      className={`${INPUT_CLASS} px-3.5 border-primary/[0.12]`}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label
                      htmlFor={fieldId("duration")}
                      className="block text-xs font-semibold text-primary-900 mb-1.5"
                    >
                      {t("general.duration")}
                      <Required />
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.duration}
                      onChange={(e) => updateField("duration", e.target.value)}
                      className={`${INPUT_CLASS} ${borderClass("duration")}`}
                      placeholder={t("general.durationPlaceholder")}
                      {...a11yProps("duration")}
                    />
                    <FieldError field="duration" />
                  </div>
                  <div>
                    <label
                      htmlFor={fieldId("difficulty")}
                      className="block text-xs font-semibold text-primary-900 mb-1.5"
                    >
                      {t("general.difficulty")}
                      <Required />
                    </label>
                    <select
                      id={fieldId("difficulty")}
                      required
                      value={formData.difficulty}
                      onChange={(e) =>
                        updateField("difficulty", e.target.value)
                      }
                      className={`${INPUT_CLASS} border-primary/[0.12]`}
                    >
                      {DIFFICULTY_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {t(`difficultyOptions.${opt.labelKey}`)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label
                      htmlFor={fieldId("groupSize")}
                      className="block text-xs font-semibold text-primary-900 mb-1.5"
                    >
                      {t("general.groupSize")}
                      <Required />
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      max="50"
                      value={formData.groupSize}
                      onChange={(e) =>
                        updateField("groupSize", Number(e.target.value))
                      }
                      className={`${INPUT_CLASS} ${borderClass("groupSize")}`}
                      {...a11yProps("groupSize")}
                    />
                    <FieldError field="groupSize" />
                  </div>
                </div>

                <div
                  role="group"
                  aria-labelledby={fieldId("languages-label")}
                  aria-describedby={
                    errors.languages ? errorId("languages") : undefined
                  }
                >
                  <span
                    id={fieldId("languages-label")}
                    className="block text-xs font-semibold text-primary-900 mb-1.5"
                  >
                    {t("general.languages")}
                    <Required />
                  </span>
                  <ChipInput
                    tags={formData.languages}
                    onChange={(tags) => updateField("languages", tags)}
                    placeholder={t("general.languagesPlaceholder")}
                  />
                  <FieldError field="languages" />
                </div>

                <div>
                  <label
                    htmlFor={fieldId("shortDescription")}
                    className="block text-xs font-semibold text-primary-900 mb-1.5"
                  >
                    {t("general.shortDescription")}
                    <Required />
                  </label>
                  <textarea
                    rows={2}
                    required
                    maxLength={300}
                    value={formData.shortDescription}
                    onChange={(e) =>
                      updateField("shortDescription", e.target.value)
                    }
                    className={`${INPUT_CLASS} px-3.5 ${borderClass("shortDescription")}`}
                    {...a11yProps(
                      "shortDescription",
                      fieldId("shortDescription-count"),
                    )}
                  />
                  <p
                    id={fieldId("shortDescription-count")}
                    className="text-[11px] text-primary-600 mt-1"
                  >
                    {t("general.charCount", {
                      count: formData.shortDescription.length,
                      max: 300,
                    })}
                  </p>
                  <FieldError field="shortDescription" />
                </div>

                <div
                  role="group"
                  aria-labelledby={fieldId("fullDescription-label")}
                  aria-describedby={
                    errors.fullDescription
                      ? errorId("fullDescription")
                      : undefined
                  }
                >
                  <span
                    id={fieldId("fullDescription-label")}
                    className="block text-xs font-semibold text-primary-900 mb-1.5"
                  >
                    {t("general.fullDescription")}
                    <Required />
                  </span>
                  <RichTextField
                    value={formData.fullDescription}
                    onChange={(val) => updateField("fullDescription", val)}
                    placeholder={t("general.fullDescriptionPlaceholder")}
                    maxLength={2000}
                  />
                  <FieldError field="fullDescription" />
                </div>

                {/* Highlights */}
                <div>
                  <h3 className="block text-xs font-semibold text-primary-900 mb-1.5">
                    {t("general.highlights")}
                  </h3>
                  <ul className="space-y-2">
                    {formData.highlights.map((h, i) => (
                      <li
                        key={i}
                        className="flex items-center justify-between p-2.5 bg-darnaBg-100 rounded-xl text-xs text-primary-900"
                      >
                        <span className="flex items-center gap-2">
                          <Check
                            className="w-3.5 h-3.5 text-secondary"
                            aria-hidden="true"
                          />
                          <span>{h}</span>
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            updateField(
                              "highlights",
                              formData.highlights.filter((_, idx) => idx !== i),
                            )
                          }
                          aria-label={t("general.removeHighlight", { item: h })}
                          title={t("general.removeHighlight", { item: h })}
                          className="p-1 rounded text-accent-700 hover:text-accent-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600"
                        >
                          <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Card 2: Type & keywords (Mockup 10) */}
              <div className="bg-white rounded-2xl p-5 shadow-e1 space-y-4">
                <h2 className="text-sm font-semibold text-primary-900 pb-3 border-b border-primary/[0.06]">
                  {t("type.heading")}
                </h2>

                <fieldset>
                  <legend className="sr-only">{t("type.legend")}</legend>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                    {EXPERIENCE_TYPES.map((type) => (
                      <label
                        key={type}
                        className={`p-3 rounded-xl border transition-colors duration-fast ease-standard cursor-pointer focus-within:ring-2 focus-within:ring-accent-600 ${
                          formData.experienceType === type
                            ? "bg-secondary-50 border-secondary-600 font-semibold text-primary-900"
                            : "bg-white border-primary/[0.12] text-primary-800 hover:border-primary/25"
                        }`}
                      >
                        <input
                          type="radio"
                          name="expType"
                          value={type}
                          checked={formData.experienceType === type}
                          onChange={() => updateField("experienceType", type)}
                          className="accent-secondary me-2"
                        />
                        <span>{t(`type.options.${type}`)}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>

                <div role="group" aria-labelledby={fieldId("tags-label")}>
                  <span
                    id={fieldId("tags-label")}
                    className="block text-xs font-semibold text-primary-900 mb-1.5"
                  >
                    {t("type.tags")}
                  </span>
                  <ChipInput
                    tags={formData.tags}
                    onChange={(tags) => updateField("tags", tags)}
                    placeholder={t("type.tagsPlaceholder")}
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Location (Mockup 03) */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl p-5 shadow-e1 space-y-4">
                <h2 className="text-sm font-semibold text-primary-900 pb-3 border-b border-primary/[0.06]">
                  {t("location.heading")}
                </h2>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label
                      htmlFor={fieldId("country")}
                      className="block text-xs font-semibold text-primary-900 mb-1.5"
                    >
                      {t("location.country")}
                    </label>
                    <input
                      id={fieldId("country")}
                      type="text"
                      disabled
                      value={t("location.countryAlgeria")}
                      className="w-full px-3 py-2 text-xs bg-darnaBg-100 border border-primary/[0.12] rounded-lg text-primary-900"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor={fieldId("wilaya")}
                      className="block text-xs font-semibold text-primary-900 mb-1.5"
                    >
                      {t("location.wilaya")}
                      <Required />
                    </label>
                    <select
                      id={fieldId("wilaya")}
                      required
                      value={formData.wilayaCode}
                      onChange={(e) =>
                        updateField("wilayaCode", e.target.value)
                      }
                      className={`${INPUT_CLASS} border-primary/[0.12]`}
                    >
                      {WILAYAS.map((w) => (
                        <option key={w.code} value={w.code}>
                          {w.code} - {getWilayaLabel(w, locale)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label
                      htmlFor={fieldId("city")}
                      className="block text-xs font-semibold text-primary-900 mb-1.5"
                    >
                      {t("location.city")}
                      <Required />
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.city}
                      onChange={(e) => updateField("city", e.target.value)}
                      className={`${INPUT_CLASS} ${borderClass("city")}`}
                      {...a11yProps("city")}
                    />
                    <FieldError field="city" />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor={fieldId("address")}
                    className="block text-xs font-semibold text-primary-900 mb-1.5"
                  >
                    {t("location.address")}
                    <Required />
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.address}
                    onChange={(e) => updateField("address", e.target.value)}
                    className={`${INPUT_CLASS} px-3.5 ${borderClass("address")}`}
                    {...a11yProps("address", fieldId("address-hint"))}
                  />
                  <FieldError field="address" />
                  <p
                    id={fieldId("address-hint")}
                    className="text-[11px] text-primary-600 mt-1"
                  >
                    {t("location.addressHint")}
                  </p>
                </div>

                <MapPicker
                  lat={formData.coordinates.lat}
                  lng={formData.coordinates.lng}
                  onChange={(lat, lng) =>
                    updateField("coordinates", { lat, lng })
                  }
                />
              </div>

              {/* Nearby points of interest (Mockup 03) */}
              <div className="bg-white rounded-2xl p-5 shadow-e1 space-y-3">
                <div className="flex items-center justify-between pb-3 border-b border-primary/[0.06]">
                  <h2 className="text-sm font-semibold text-primary-900">
                    {t("poi.heading", { max: 5 })}
                  </h2>
                  <button
                    type="button"
                    disabled={formData.pois.length >= 5}
                    onClick={() => {
                      if (formData.pois.length < 5) {
                        updateField("pois", [
                          ...formData.pois,
                          {
                            name: t("poi.newName"),
                            distance: t("poi.newDistance"),
                            time: t("poi.newTime"),
                          },
                        ]);
                      }
                    }}
                    className="text-xs font-medium text-secondary-700 hover:underline flex items-center gap-1 rounded disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600"
                  >
                    <Plus className="w-3.5 h-3.5" aria-hidden="true" />{" "}
                    {t("poi.add")}
                  </button>
                </div>

                <ul className="space-y-2">
                  {formData.pois.map((poi, idx) => (
                    <li
                      key={idx}
                      className="flex items-center justify-between p-2.5 bg-darnaBg-100 rounded-xl text-xs"
                    >
                      <div>
                        <span className="font-semibold text-primary-900">
                          {poi.name}
                        </span>
                        <span className="text-primary-600 ms-2">
                          • {poi.distance} ({poi.time})
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          updateField(
                            "pois",
                            formData.pois.filter((_, i) => i !== idx),
                          )
                        }
                        aria-label={t("poi.remove", { name: poi.name })}
                        title={t("poi.remove", { name: poi.name })}
                        className="p-1 rounded text-accent-700 hover:text-accent-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600"
                      >
                        <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Access & transport (Mockup 03) */}
              <div className="bg-white rounded-2xl p-5 shadow-e1 space-y-3">
                <h2 className="text-sm font-semibold text-primary-900 pb-3 border-b border-primary/[0.06]">
                  {t("access.heading")}
                </h2>
                <div>
                  <label
                    htmlFor={fieldId("transportMode")}
                    className="block text-xs font-semibold text-primary-900 mb-1.5"
                  >
                    {t("access.transportMode")}
                    <Required />
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.transportMode}
                    onChange={(e) =>
                      updateField("transportMode", e.target.value)
                    }
                    className={`${INPUT_CLASS} ${borderClass("transportMode")}`}
                    {...a11yProps("transportMode")}
                  />
                  <FieldError field="transportMode" />
                </div>
                <div>
                  <label
                    htmlFor={fieldId("accessInstructions")}
                    className="block text-xs font-semibold text-primary-900 mb-1.5"
                  >
                    {t("access.instructions")}
                  </label>
                  <textarea
                    id={fieldId("accessInstructions")}
                    rows={2}
                    value={formData.accessInstructions}
                    onChange={(e) =>
                      updateField("accessInstructions", e.target.value)
                    }
                    className={`${INPUT_CLASS} border-primary/[0.12]`}
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Programme */}
          {currentStep === 3 && (
            <div className="bg-white rounded-2xl p-5 shadow-e1 space-y-4">
              <h2 className="text-sm font-semibold text-primary-900 pb-3 border-b border-primary/[0.06]">
                {t("programme.heading")}
              </h2>
              <ol className="space-y-3 text-xs">
                {PROGRAMME_KEYS.map((key, i) => (
                  <li key={key} className="p-3 bg-darnaBg-100 rounded-xl">
                    <div className="font-semibold text-primary-900">
                      {t("programme.stepTitle", {
                        n: i + 1,
                        title: t(`programme.items.${key}.title`),
                      })}
                    </div>
                    <p className="text-[11px] text-primary-600 mt-0.5">
                      {t(`programme.items.${key}.description`)}
                    </p>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* STEP 4: Pricing */}
          {currentStep === 4 && (
            <div className="bg-white rounded-2xl p-5 shadow-e1 space-y-4">
              <h2 className="text-sm font-semibold text-primary-900 pb-3 border-b border-primary/[0.06]">
                {t("pricing.heading")}
              </h2>
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <label
                    htmlFor={fieldId("pricePerPerson")}
                    className="block font-semibold text-primary-900 mb-1"
                  >
                    {t("pricing.adult")}
                    <Required />
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={formData.pricePerPerson}
                    onChange={(e) =>
                      updateField("pricePerPerson", Number(e.target.value))
                    }
                    className={`${INPUT_CLASS} ${borderClass("pricePerPerson")}`}
                    {...a11yProps("pricePerPerson")}
                  />
                  <FieldError field="pricePerPerson" />
                </div>
                <div>
                  <label
                    htmlFor={fieldId("priceChild")}
                    className="block font-semibold text-primary-900 mb-1"
                  >
                    {t("pricing.child")}
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.priceChild}
                    onChange={(e) =>
                      updateField("priceChild", Number(e.target.value))
                    }
                    className={`${INPUT_CLASS} ${borderClass("priceChild")}`}
                    {...a11yProps("priceChild")}
                  />
                  <FieldError field="priceChild" />
                </div>
              </div>
            </div>
          )}

          {/* STEP 5: Media */}
          {currentStep === 5 && (
            <div className="bg-white rounded-2xl p-5 shadow-e1 space-y-4">
              <h2 className="text-sm font-semibold text-primary-900 pb-3 border-b border-primary/[0.06]">
                {t("media.heading")}
              </h2>
              <FileDropzone
                label={t("media.dropLabel")}
                hint={t("media.hint", { size: 20 })}
              />
            </div>
          )}

          {/* STEP 6: Review */}
          {currentStep === 6 && (
            <div className="bg-white rounded-2xl p-5 shadow-e1 space-y-4">
              <h2 className="text-sm font-semibold text-primary-900 pb-3 border-b border-primary/[0.06]">
                {t("review.heading")}
              </h2>
              <dl className="p-4 bg-darnaBg-100 rounded-xl text-xs space-y-2">
                <div className="flex justify-between gap-4">
                  <dt className="text-primary-600">{t("review.activity")}</dt>
                  <dd className="font-semibold text-primary-900 text-end">
                    {formData.title}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-primary-600">{t("review.category")}</dt>
                  <dd className="font-semibold text-primary-900 text-end">
                    {t("review.categoryValue", {
                      category: categoryLabel(formData.category),
                      difficulty: difficultyLabel(formData.difficulty),
                    })}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-primary-600">{t("review.location")}</dt>
                  <dd className="font-semibold text-primary-900 text-end">
                    {t("locationValue", {
                      city: formData.city,
                      code: formData.wilayaCode,
                    })}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-primary-600">
                    {t("review.pricePerPerson")}
                  </dt>
                  <dd className="font-semibold text-secondary-700 text-end">
                    {formatDzd(formData.pricePerPerson, locale)}
                  </dd>
                </div>
              </dl>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-primary/[0.06]">
            <button
              type="button"
              onClick={handleBack}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-primary-800 bg-white shadow-e1 rounded-xl hover:shadow-e2 transition duration-fast ease-standard active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600"
            >
              <ChevronLeft
                className="w-3.5 h-3.5 rtl:rotate-180"
                aria-hidden="true"
              />
              <span>{currentStep === 1 ? t("cancel") : t("previous")}</span>
            </button>
            <button
              type="button"
              onClick={handleNext}
              className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-primary-800 rounded-xl shadow-e1 shadow-highlight hover:bg-primary-900 transition duration-fast ease-standard active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2"
            >
              <span>{nextLabel}</span>
              {currentStep < 6 && (
                <ChevronRight
                  className="w-3.5 h-3.5 rtl:rotate-180"
                  aria-hidden="true"
                />
              )}
            </button>
          </div>
        </div>

        {/* Right Rail: Live Preview + Checklist + Tips (Mockups 03 & 10) */}
        <div className="space-y-6 lg:sticky lg:top-[88px] lg:self-start">
          <LivePreviewCard
            placeholderKind="experience"
            title={formData.title}
            propertyType={categoryLabel(formData.category)}
            location={t("locationValue", {
              city: formData.city,
              code: formData.wilayaCode,
            })}
            priceDzd={formData.pricePerPerson}
            imageSrc={formData.images[0]}
          />

          <ProgressChecklist
            currentStep={currentStep}
            totalSteps={6}
            items={STEP_KEYS.map((key, i) => ({
              stepNumber: i + 1,
              label: t(`steps.${key}`),
              completed: currentStep > i + 1,
            }))}
          />

          <TipsCard
            title={t("tips.title")}
            tips={[t("tips.unique"), t("tips.equipment"), t("tips.photos")]}
          />
        </div>
      </div>
    </div>
  );
}
