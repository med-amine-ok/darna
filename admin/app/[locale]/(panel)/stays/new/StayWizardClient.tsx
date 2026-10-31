"use client";

import React, { useId, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "@/navigation";
import { ArrowLeft, ArrowRight, Save, ChevronRight, ChevronLeft } from "lucide-react";
import { Stepper, StepItem } from "@/components/ui/Stepper";
import { LivePreviewCard } from "@/components/ui/LivePreviewCard";
import { placeholderFor } from "@/lib/placeholders";
import { ProgressChecklist } from "@/components/ui/ProgressChecklist";
import { TipsCard } from "@/components/ui/TipsCard";
import { PhoneInput } from "@/components/ui/PhoneInput";
import { RichTextField } from "@/components/ui/RichTextField";
import { FileDropzone } from "@/components/ui/FileDropzone";
import { MapPicker } from "@/components/ui/MapPicker";
import { useToast } from "@/components/ui/Toast";
import { useLocale, useTranslations } from "next-intl";
import { formatDzd, intlLocale } from "@/lib/utils/format";
import { WILAYAS, getWilayaLabel } from "@/lib/utils/wilayas";

/** Stored values (kept as before) → translation key under `stayWizard.propertyTypes`. */
const PROPERTY_TYPES: { value: string; key: string }[] = [
  { value: "Villa avec piscine", key: "villaPool" },
  { value: "Appartement haut standing", key: "luxuryApartment" },
  { value: "Maison traditionnelle / Casbah", key: "traditionalHouse" },
  { value: "Bungalow bord de mer", key: "beachBungalow" },
  { value: "Chalet de montagne", key: "mountainChalet" },
  { value: "Studio moderne", key: "modernStudio" },
  { value: "Hôtel / Suite", key: "hotelSuite" },
  { value: "Auberge de jeunesse (Hostel)", key: "hostel" },
];

/** Stored values (kept as before) → translation key under `stayWizard.amenities`. */
const AMENITIES_CATALOG: { value: string; key: string }[] = [
  { value: "Wifi haute vitesse", key: "wifi" },
  { value: "Piscine privée", key: "privatePool" },
  { value: "Climatisation réversible", key: "airConditioning" },
  { value: "Cuisine équipée", key: "kitchen" },
  { value: "Parking sécurisé", key: "parking" },
  { value: "Télévision 4K", key: "tv" },
  { value: "Lave-linge", key: "washer" },
  { value: "Vue sur mer", key: "seaView" },
  { value: "Chauffage central", key: "heating" },
  { value: "Espace de travail", key: "workspace" },
  { value: "Jacuzzi / Spa", key: "jacuzzi" },
  { value: "Barbecue extérieur", key: "barbecue" },
];

/** Mock host directory (names are data, the type is translated). */
const HOSTS: { name: string; key: "individualAlgiers" | "agency" | "establishment" }[] = [
  { name: "Ahmed Benali", key: "individualAlgiers" },
  { name: "Immobilier Casbah SAS", key: "agency" },
  { name: "Hôtel El Aurassi", key: "establishment" },
];

const STEP_KEYS = ["general", "location", "amenities", "photos", "pricing", "rules"] as const;
const PROGRESS_KEYS = ["general", "locationContact", "amenities", "media", "pricing", "rules"] as const;
const TIP_COUNTS: Record<number, number> = { 1: 3, 2: 3, 3: 2, 4: 2, 5: 2, 6: 2 };

type FieldName =
  | "title"
  | "guestCapacity"
  | "bedroomCount"
  | "bathroomCount"
  | "surfaceM2"
  | "shortDescription"
  | "city"
  | "address"
  | "email"
  | "price";

const inputBase =
  "w-full text-xs bg-white border rounded-xl shadow-2xs text-primary-900 placeholder:text-primary-500 hover:border-primary/25 focus:outline-none focus:border-primary-600 focus:ring-4 focus:ring-primary/[0.08] transition duration-fast ease-standard";
const focusRing = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2";

export default function StayWizardClient() {
  const locale = useLocale() as "en" | "fr" | "ar";
  const t = useTranslations("stayWizard");
  const router = useRouter();
  const { addToast } = useToast();
  const uid = useId();
  const summaryRef = useRef<HTMLDivElement>(null);

  const [currentStep, setCurrentStep] = useState(1);
  const [draftSavedAt, setDraftSavedAt] = useState<string>("10:15");
  const [errors, setErrors] = useState<Partial<Record<FieldName, string>>>({});

  // Form state
  const [formData, setFormData] = useState({
    title: "Villa panoramique avec piscine – Hydra",
    propertyType: "Villa avec piscine",
    category: "home",
    guestCapacity: 8,
    bedroomCount: 4,
    bathroomCount: 3,
    surfaceM2: 280,
    constructionYear: 2022,
    hostName: "Ahmed Benali",
    hostType: "individual",
    price: 35000,
    cleaningFee: 5000,
    deposit: 20000,
    minStayDays: 2,
    bookingApprovalMode: "instant" as "instant" | "request",
    shortDescription: "Superbe villa contemporaine sur les hauteurs d'Hydra avec piscine à débordement et vue dégagée sur la baie.",
    fullDescription: "Cette élégante demeure allie le confort moderne aux touches architecturales algéroises. Idéale pour les séjours en famille ou professionnels.",
    address: "12 Chemin des Crêtes, Hydra",
    wilayaCode: "16",
    city: "Alger",
    phone: "555123456",
    email: "contact@ahmed-benali.dz",
    showContactOnListing: true,
    petsAllowed: false,
    partiesAllowed: false,
    smokingAllowed: false,
    childrenAllowed: true,
    checkInTime: "15:00",
    checkOutTime: "11:00",
    amenities: ["Wifi haute vitesse", "Piscine privée", "Climatisation réversible", "Cuisine équipée", "Parking sécurisé"],
    images: ["/placeholder-stay.jpg"],
    coordinates: { lat: 36.7525, lng: 3.042 },
  });

  const fieldId = (name: string) => `${uid}-${name}`;
  const errorId = (name: FieldName) => `${uid}-${name}-error`;
  /** id + aria wiring for an input that may have a validation error. */
  const a11y = (name: FieldName) => ({
    id: fieldId(name),
    "aria-invalid": errors[name] ? true : undefined,
    "aria-describedby": errors[name] ? errorId(name) : undefined,
  });
  const inputClass = (name?: FieldName) =>
    `${inputBase} ${name && errors[name] ? "border-accent-600" : "border-primary/[0.12]"}`;
  const fieldError = (name: FieldName) =>
    errors[name] ? (
      <p id={errorId(name)} className="mt-1 text-[11px] font-medium text-accent-700">
        {errors[name]}
      </p>
    ) : null;
  const required = (
    <>
      <span aria-hidden="true"> *</span>
      <span className="sr-only">{t("required")}</span>
    </>
  );

  // 6 numbered steps (Mockup 08)
  const steps: StepItem[] = STEP_KEYS.map((key, i) => ({ id: i + 1, title: t(`steps.${key}`) }));

  const propertyTypeLabel = (value: string) => {
    const pt = PROPERTY_TYPES.find((p) => p.value === value);
    return pt ? t(`propertyTypes.${pt.key}`) : value;
  };
  const wilayaName = (() => {
    const w = WILAYAS.find((x) => x.code === formData.wilayaCode);
    return w ? getWilayaLabel(w, locale) : formData.wilayaCode;
  })();
  const locationText = t("locationValue", { city: formData.city, wilaya: wilayaName });

  const validateStep = (step: number): Partial<Record<FieldName, string>> => {
    const e: Partial<Record<FieldName, string>> = {};
    if (step === 1) {
      if (!formData.title.trim()) e.title = t("errors.titleRequired");
      if (!formData.shortDescription.trim()) e.shortDescription = t("errors.shortDescriptionRequired");
      if (!(formData.guestCapacity >= 1)) e.guestCapacity = t("errors.min", { min: 1 });
      if (!(formData.bedroomCount >= 1)) e.bedroomCount = t("errors.min", { min: 1 });
      if (!(formData.bathroomCount >= 1)) e.bathroomCount = t("errors.min", { min: 1 });
      if (!(formData.surfaceM2 >= 10)) e.surfaceM2 = t("errors.min", { min: 10 });
    } else if (step === 2) {
      if (!formData.city.trim()) e.city = t("errors.cityRequired");
      if (!formData.address.trim()) e.address = t("errors.addressRequired");
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) e.email = t("errors.emailInvalid");
    } else if (step === 5) {
      if (!(formData.price > 0)) e.price = t("errors.priceRequired");
    }
    return e;
  };

  const handleSaveDraft = () => {
    const time = new Intl.DateTimeFormat(intlLocale(locale), { hour: "2-digit", minute: "2-digit" }).format(new Date());
    setDraftSavedAt(time);
    addToast({
      title: t("toasts.draftSaved"),
      description: t("toasts.draftSavedDescription", { time }),
      variant: "info",
    });
  };

  const handleNext = () => {
    const stepErrors = validateStep(currentStep);
    setErrors(stepErrors);
    if (Object.keys(stepErrors).length > 0) {
      // Let the summary render, then move focus to it.
      requestAnimationFrame(() => summaryRef.current?.focus());
      return;
    }
    if (currentStep < 6) {
      setCurrentStep((prev) => prev + 1);
    } else {
      addToast({
        title: t("toasts.created"),
        description: t("toasts.createdDescription"),
        variant: "success",
      });
      router.push("/stays");
    }
  };

  const handleBack = () => {
    setErrors({});
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    } else {
      router.push("/stays");
    }
  };

  const goToStep = (step: number) => {
    setErrors({});
    setCurrentStep(step);
  };

  const tipCount = TIP_COUNTS[currentStep] ?? 0;
  const tips = Array.from({ length: tipCount }, (_, i) => t(`tips.step${currentStep}.tip${i + 1}`));
  const errorEntries = Object.entries(errors) as [FieldName, string][];

  const setNumber = (name: "guestCapacity" | "bedroomCount" | "bathroomCount" | "surfaceM2" | "price" | "cleaningFee" | "deposit" | "minStayDays") =>
    (e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, [name]: Number(e.target.value) });

  const nextLabel = currentStep === 6 ? t("publish") : t("next");

  return (
    <div className="space-y-6">
      {/* 1. Wizard Header (Mockup 08) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-primary/[0.06] pb-5">
        <div>
          <button
            type="button"
            onClick={() => router.push("/stays")}
            className={`inline-flex items-center gap-1.5 text-xs text-primary-600 hover:text-primary-900 mb-2 font-medium rounded ${focusRing}`}
          >
            <ArrowLeft className="w-3.5 h-3.5 rtl:rotate-180" aria-hidden="true" />
            <span>{t("back")}</span>
          </button>
          <h1 className="font-serif text-heading text-primary-900">{t("title")}</h1>
          <p className="text-xs text-primary-600 mt-0.5">{t("subtitle")}</p>
        </div>

        <div className="flex items-center gap-2.5">
          <span className="text-[11px] text-primary-600 hidden sm:inline" aria-live="polite">
            {t("draftSavedAt", { time: draftSavedAt })}
          </span>
          <button
            type="button"
            onClick={handleSaveDraft}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-primary-800 bg-white shadow-e1 rounded-xl hover:shadow-e2 transition duration-fast ease-standard active:scale-[0.98] ${focusRing}`}
          >
            <Save className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{t("saveDraft")}</span>
          </button>
          <button
            type="button"
            onClick={handleNext}
            className={`inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-primary-800 rounded-xl shadow-e1 shadow-highlight hover:bg-primary-900 transition duration-fast ease-standard active:scale-[0.98] ${focusRing}`}
          >
            <span>{nextLabel}</span>
            {currentStep < 6 && <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" aria-hidden="true" />}
          </button>
        </div>
      </div>

      {/* 2. Stepper (Mockup 08: 6 steps) */}
      <div className="bg-white rounded-2xl p-5 shadow-e1">
        <Stepper steps={steps} currentStep={currentStep} onStepClick={goToStep} />
      </div>

      {/* 3. Three-Column Body: Form Cards (Left/Center) + Right Rail (Mockup 08) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form Body (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Error summary */}
          {errorEntries.length > 0 && (
            <div
              ref={summaryRef}
              tabIndex={-1}
              role="alert"
              className="p-4 rounded-2xl bg-accent-50 ring-1 ring-inset ring-accent-200 text-xs text-primary-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-600"
            >
              <p className="font-semibold text-accent-800">{t("errors.summary", { count: errorEntries.length })}</p>
              <ul className="mt-1.5 list-disc ps-5 space-y-0.5">
                {errorEntries.map(([name, message]) => (
                  <li key={name}>
                    <a href={`#${fieldId(name)}`} className="underline hover:no-underline text-accent-800">
                      {message}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* STEP 1: General information */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <section aria-labelledby={`${uid}-general`} className="bg-white rounded-2xl p-5 shadow-e1 space-y-4">
                <h2 id={`${uid}-general`} className="text-sm font-semibold text-primary-900 pb-3 border-b border-primary/[0.06]">
                  {t("steps.general")}
                </h2>

                <div>
                  <label htmlFor={fieldId("title")} className="block text-xs font-semibold text-primary-900 mb-1.5">
                    {t("fields.title")}
                    {required}
                  </label>
                  <input
                    type="text"
                    {...a11y("title")}
                    aria-required="true"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className={`${inputClass("title")} px-3.5 py-2`}
                    placeholder={t("fields.titlePlaceholder")}
                  />
                  {fieldError("title")}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor={fieldId("propertyType")} className="block text-xs font-semibold text-primary-900 mb-1.5">
                      {t("fields.propertyType")}
                      {required}
                    </label>
                    <select
                      id={fieldId("propertyType")}
                      aria-required="true"
                      value={formData.propertyType}
                      onChange={(e) => setFormData({ ...formData, propertyType: e.target.value })}
                      className={`${inputClass()} px-3.5 py-2`}
                    >
                      {PROPERTY_TYPES.map((p) => (
                        <option key={p.value} value={p.value}>{t(`propertyTypes.${p.key}`)}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor={fieldId("category")} className="block text-xs font-semibold text-primary-900 mb-1.5">
                      {t("fields.category")}
                      {required}
                    </label>
                    <select
                      id={fieldId("category")}
                      aria-required="true"
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className={`${inputClass()} px-3.5 py-2`}
                    >
                      <option value="home">{t("categories.home")}</option>
                      <option value="hotel">{t("categories.hotel")}</option>
                      <option value="hostel">{t("categories.hostel")}</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {(
                    [
                      { name: "guestCapacity", label: t("fields.capacity"), min: 1 },
                      { name: "bedroomCount", label: t("fields.bedrooms"), min: 1 },
                      { name: "bathroomCount", label: t("fields.bathrooms"), min: 1 },
                      { name: "surfaceM2", label: t("fields.surface"), min: 10 },
                    ] as const
                  ).map((f) => (
                    <div key={f.name}>
                      <label htmlFor={fieldId(f.name)} className="block text-xs font-semibold text-primary-900 mb-1.5">
                        {f.label}
                        {required}
                      </label>
                      <input
                        type="number"
                        min={f.min}
                        {...a11y(f.name)}
                        aria-required="true"
                        value={formData[f.name]}
                        onChange={setNumber(f.name)}
                        className={`${inputClass(f.name)} px-3 py-2`}
                      />
                      {fieldError(f.name)}
                    </div>
                  ))}
                </div>

                <div>
                  <label htmlFor={fieldId("host")} className="block text-xs font-semibold text-primary-900 mb-1.5">
                    {t("fields.host")}
                    {required}
                  </label>
                  <select
                    id={fieldId("host")}
                    aria-required="true"
                    value={formData.hostName}
                    onChange={(e) => setFormData({ ...formData, hostName: e.target.value })}
                    className={`${inputClass()} px-3.5 py-2`}
                  >
                    {HOSTS.map((h) => (
                      <option key={h.name} value={h.name}>
                        {t(`hostOptions.${h.key}`, { name: h.name })}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor={fieldId("shortDescription")} className="block text-xs font-semibold text-primary-900 mb-1.5">
                    {t("fields.shortDescription")}
                    {required}{" "}
                    <span className="font-normal text-primary-600" dir="ltr">
                      {t("charCount", { count: formData.shortDescription.length, max: 300 })}
                    </span>
                  </label>
                  <textarea
                    rows={2}
                    maxLength={300}
                    {...a11y("shortDescription")}
                    aria-required="true"
                    value={formData.shortDescription}
                    onChange={(e) => setFormData({ ...formData, shortDescription: e.target.value })}
                    className={`${inputClass("shortDescription")} px-3.5 py-2`}
                  />
                  {fieldError("shortDescription")}
                </div>

                <div role="group" aria-labelledby={`${uid}-fullDescription-label`}>
                  <span id={`${uid}-fullDescription-label`} className="block text-xs font-semibold text-primary-900 mb-1.5">
                    {t("fields.fullDescription")}
                    {required}
                  </span>
                  <RichTextField
                    value={formData.fullDescription}
                    onChange={(val) => setFormData({ ...formData, fullDescription: val })}
                    maxLength={2000}
                    placeholder={t("fields.fullDescriptionPlaceholder")}
                  />
                </div>
              </section>

              {/* Card 2: Main rules (toggles + times) */}
              <section aria-labelledby={`${uid}-rules`} className="bg-white rounded-2xl p-5 shadow-e1 space-y-4">
                <h2 id={`${uid}-rules`} className="text-sm font-semibold text-primary-900 pb-3 border-b border-primary/[0.06]">
                  {t("rules.title")}
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                  {(
                    [
                      { name: "petsAllowed", label: t("rules.pets") },
                      { name: "partiesAllowed", label: t("rules.parties") },
                      { name: "smokingAllowed", label: t("rules.smoking") },
                      { name: "childrenAllowed", label: t("rules.children") },
                    ] as const
                  ).map((r) => (
                    <label key={r.name} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData[r.name]}
                        onChange={(e) => setFormData({ ...formData, [r.name]: e.target.checked })}
                        className="accent-primary rounded"
                      />
                      <span>{r.label}</span>
                    </label>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-primary/[0.08] text-xs">
                  <div>
                    <label htmlFor={fieldId("checkIn")} className="block font-semibold text-primary-900 mb-1">{t("rules.checkInTime")}</label>
                    <input
                      id={fieldId("checkIn")}
                      type="time"
                      dir="ltr"
                      value={formData.checkInTime}
                      onChange={(e) => setFormData({ ...formData, checkInTime: e.target.value })}
                      className={`${inputClass()} px-3 py-1.5`}
                    />
                  </div>
                  <div>
                    <label htmlFor={fieldId("checkOut")} className="block font-semibold text-primary-900 mb-1">{t("rules.checkOutTime")}</label>
                    <input
                      id={fieldId("checkOut")}
                      type="time"
                      dir="ltr"
                      value={formData.checkOutTime}
                      onChange={(e) => setFormData({ ...formData, checkOutTime: e.target.value })}
                      className={`${inputClass()} px-3 py-1.5`}
                    />
                  </div>
                </div>
              </section>
            </div>
          )}

          {/* STEP 2: Location & contact */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <section aria-labelledby={`${uid}-address`} className="bg-white rounded-2xl p-5 shadow-e1 space-y-4">
                <h2 id={`${uid}-address`} className="text-sm font-semibold text-primary-900 pb-3 border-b border-primary/[0.06]">
                  {t("location.title")}
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor={fieldId("wilaya")} className="block text-xs font-semibold text-primary-900 mb-1.5">
                      {t("location.wilaya")}
                      {required}
                    </label>
                    <select
                      id={fieldId("wilaya")}
                      aria-required="true"
                      value={formData.wilayaCode}
                      onChange={(e) => setFormData({ ...formData, wilayaCode: e.target.value })}
                      className={`${inputClass()} px-3.5 py-2`}
                    >
                      {WILAYAS.map((w) => (
                        <option key={w.code} value={w.code}>
                          {w.code} - {getWilayaLabel(w, locale)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor={fieldId("city")} className="block text-xs font-semibold text-primary-900 mb-1.5">
                      {t("location.city")}
                      {required}
                    </label>
                    <input
                      type="text"
                      {...a11y("city")}
                      aria-required="true"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      className={`${inputClass("city")} px-3.5 py-2`}
                    />
                    {fieldError("city")}
                  </div>
                </div>

                <div>
                  <label htmlFor={fieldId("address")} className="block text-xs font-semibold text-primary-900 mb-1.5">
                    {t("location.address")}
                    {required}
                  </label>
                  <input
                    type="text"
                    {...a11y("address")}
                    aria-required="true"
                    autoComplete="street-address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className={`${inputClass("address")} px-3.5 py-2`}
                  />
                  {fieldError("address")}
                </div>

                <div role="group" aria-labelledby={`${uid}-map-label`}>
                  <span id={`${uid}-map-label`} className="block text-xs font-semibold text-primary-900 mb-2">
                    {t("location.mapLabel")}
                  </span>
                  <MapPicker
                    addressText={formData.address}
                    lat={formData.coordinates.lat}
                    lng={formData.coordinates.lng}
                    onChange={(lat, lng) => setFormData({ ...formData, coordinates: { lat, lng } })}
                  />
                </div>
              </section>

              {/* Contact Card */}
              <section aria-labelledby={`${uid}-contact`} className="bg-white rounded-2xl p-5 shadow-e1 space-y-4">
                <h2 id={`${uid}-contact`} className="text-sm font-semibold text-primary-900 pb-3 border-b border-primary/[0.06]">
                  {t("contact.title")}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div role="group" aria-labelledby={`${uid}-phone-label`}>
                    <span id={`${uid}-phone-label`} className="block text-xs font-semibold text-primary-900 mb-1.5">
                      {t("contact.phone")}
                      {required}
                    </span>
                    <PhoneInput
                      value={formData.phone}
                      onChange={(val) => setFormData({ ...formData, phone: val })}
                    />
                  </div>
                  <div>
                    <label htmlFor={fieldId("email")} className="block text-xs font-semibold text-primary-900 mb-1.5">
                      {t("contact.email")}
                      {required}
                    </label>
                    <input
                      type="email"
                      dir="ltr"
                      autoComplete="email"
                      {...a11y("email")}
                      aria-required="true"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className={`${inputClass("email")} px-3.5 py-2`}
                    />
                    {fieldError("email")}
                  </div>
                </div>
                <label className="flex items-center gap-2 text-xs text-primary-900 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.showContactOnListing}
                    onChange={(e) => setFormData({ ...formData, showContactOnListing: e.target.checked })}
                    className="accent-primary rounded"
                  />
                  <span>{t("contact.showPublic")}</span>
                </label>
              </section>
            </div>
          )}

          {/* STEP 3: Amenities */}
          {currentStep === 3 && (
            <fieldset className="bg-white rounded-2xl p-5 shadow-e1 space-y-4">
              <legend className="sr-only">{t("amenitiesStep.title")}</legend>
              <h2 aria-hidden="true" className="text-sm font-semibold text-primary-900 pb-3 border-b border-primary/[0.06]">
                {t("amenitiesStep.title")}
              </h2>
              <p className="text-xs text-primary-600">{t("amenitiesStep.subtitle")}</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
                {AMENITIES_CATALOG.map((am) => {
                  const isChecked = formData.amenities.includes(am.value);
                  return (
                    <label
                      key={am.value}
                      className={`flex items-center gap-2.5 p-3 rounded-xl border transition-colors duration-fast ease-standard text-xs cursor-pointer transition-colors focus-within:ring-2 focus-within:ring-accent-600 ${
                        isChecked
                          ? "bg-secondary-50 border-secondary-600 text-primary-900 font-semibold"
                          : "bg-white border-primary/[0.12] text-primary-800 hover:border-primary/25"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {
                          setFormData({
                            ...formData,
                            amenities: isChecked
                              ? formData.amenities.filter((a) => a !== am.value)
                              : [...formData.amenities, am.value],
                          });
                        }}
                        className="accent-secondary rounded"
                      />
                      <span>{t(`amenities.${am.key}`)}</span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
          )}

          {/* STEP 4: Photos */}
          {currentStep === 4 && (
            <section aria-labelledby={`${uid}-photos`} className="bg-white rounded-2xl p-5 shadow-e1 space-y-4">
              <h2 id={`${uid}-photos`} className="text-sm font-semibold text-primary-900 pb-3 border-b border-primary/[0.06]">
                {t("photosStep.title")}
              </h2>
              <FileDropzone
                label={t("photosStep.dropLabel")}
                hint={t("photosStep.dropHint")}
                accept="image/jpeg,image/png,image/webp"
                onFileSelect={() => {
                  addToast({ title: t("toasts.photoAdded"), variant: "info" });
                }}
              />
              <ul className="grid grid-cols-3 gap-3 pt-3">
                <li className="relative aspect-video rounded-xl overflow-hidden bg-tertiary-100 shadow-e1">
                  <Image src={placeholderFor("stay")} alt={t("photosStep.coverAlt")} fill sizes="200px" className="object-cover" />
                  <span className="absolute bottom-1 start-1 px-1.5 py-0.5 glass-light text-primary-900 text-[11px] font-semibold rounded-full shadow-e1">
                    {t("photosStep.cover")}
                  </span>
                </li>
              </ul>
            </section>
          )}

          {/* STEP 5: Pricing & availability */}
          {currentStep === 5 && (
            <section aria-labelledby={`${uid}-pricing`} className="bg-white rounded-2xl p-5 shadow-e1 space-y-4">
              <h2 id={`${uid}-pricing`} className="text-sm font-semibold text-primary-900 pb-3 border-b border-primary/[0.06]">
                {t("pricing.title")}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor={fieldId("price")} className="block text-xs font-semibold text-primary-900 mb-1.5">
                    {t("pricing.price")}
                    {required}
                  </label>
                  <input
                    type="number"
                    min={0}
                    {...a11y("price")}
                    aria-required="true"
                    value={formData.price}
                    onChange={setNumber("price")}
                    className={`${inputClass("price")} px-3.5 py-2`}
                  />
                  {fieldError("price")}
                </div>
                <div>
                  <label htmlFor={fieldId("cleaningFee")} className="block text-xs font-semibold text-primary-900 mb-1.5">
                    {t("pricing.cleaningFee")}
                  </label>
                  <input
                    id={fieldId("cleaningFee")}
                    type="number"
                    min={0}
                    value={formData.cleaningFee}
                    onChange={setNumber("cleaningFee")}
                    className={`${inputClass()} px-3.5 py-2`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor={fieldId("deposit")} className="block text-xs font-semibold text-primary-900 mb-1.5">
                    {t("pricing.deposit")}
                  </label>
                  <input
                    id={fieldId("deposit")}
                    type="number"
                    min={0}
                    value={formData.deposit}
                    onChange={setNumber("deposit")}
                    className={`${inputClass()} px-3.5 py-2`}
                  />
                </div>
                <div>
                  <label htmlFor={fieldId("minStay")} className="block text-xs font-semibold text-primary-900 mb-1.5">
                    {t("pricing.minStay")}
                  </label>
                  <input
                    id={fieldId("minStay")}
                    type="number"
                    min={1}
                    value={formData.minStayDays}
                    onChange={setNumber("minStayDays")}
                    className={`${inputClass()} px-3.5 py-2`}
                  />
                </div>
              </div>

              <fieldset>
                <legend className="block text-xs font-semibold text-primary-900 mb-1.5">{t("pricing.bookingMode")}</legend>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  {(
                    [
                      { id: "instant", selected: "bg-secondary-50 border-secondary-600", accent: "accent-secondary" },
                      { id: "request", selected: "bg-amber-50 border-amber-600", accent: "accent-amber-700" },
                    ] as const
                  ).map((m) => (
                    <label
                      key={m.id}
                      className={`p-3 rounded-xl border transition-colors duration-fast ease-standard cursor-pointer focus-within:ring-2 focus-within:ring-accent-600 ${
                        formData.bookingApprovalMode === m.id ? m.selected : "bg-white border-primary/[0.12] hover:border-primary/25"
                      }`}
                    >
                      <input
                        type="radio"
                        name={`${uid}-approval`}
                        value={m.id}
                        checked={formData.bookingApprovalMode === m.id}
                        onChange={() => setFormData({ ...formData, bookingApprovalMode: m.id })}
                        className={`${m.accent} me-2`}
                      />
                      <span className="font-semibold">{t(`pricing.modes.${m.id}.title`)}</span>
                      <span className="block text-[11px] text-primary-600 mt-1">{t(`pricing.modes.${m.id}.description`)}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            </section>
          )}

          {/* STEP 6: Rules & validation */}
          {currentStep === 6 && (
            <section aria-labelledby={`${uid}-summary`} className="bg-white rounded-2xl p-5 shadow-e1 space-y-4">
              <h2 id={`${uid}-summary`} className="text-sm font-semibold text-primary-900 pb-3 border-b border-primary/[0.06]">
                {t("summary.title")}
              </h2>
              <p className="text-xs text-primary-600">{t("summary.subtitle")}</p>
              <dl className="p-4 bg-darnaBg-100 rounded-xl text-xs space-y-2">
                <div className="flex justify-between gap-3">
                  <dt className="text-primary-600">{t("summary.titleLabel")}</dt>
                  <dd className="font-medium text-primary-900 text-end">{formData.title}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-primary-600">{t("summary.location")}</dt>
                  <dd className="font-medium text-primary-900 text-end">{locationText}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-primary-600">{t("summary.capacity")}</dt>
                  <dd className="font-medium text-primary-900 text-end">
                    {t("summary.capacityValue", { guests: formData.guestCapacity, bedrooms: formData.bedroomCount })}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-primary-600">{t("summary.price")}</dt>
                  <dd className="font-semibold text-primary-900 text-end">{formatDzd(formData.price, locale)}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-primary-600">{t("summary.amenities")}</dt>
                  <dd className="font-medium text-primary-900 text-end">
                    {t("summary.amenitiesValue", { count: formData.amenities.length })}
                  </dd>
                </div>
              </dl>
            </section>
          )}

          {/* Bottom Navigation Buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-primary/[0.06]">
            <button
              type="button"
              onClick={handleBack}
              className={`inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-primary-800 bg-white shadow-e1 rounded-xl hover:shadow-e2 transition duration-fast ease-standard active:scale-[0.98] ${focusRing}`}
            >
              <ChevronLeft className="w-3.5 h-3.5 rtl:rotate-180" aria-hidden="true" />
              <span>{currentStep === 1 ? t("cancel") : t("previous")}</span>
            </button>
            <button
              type="button"
              onClick={handleNext}
              className={`inline-flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-primary-800 rounded-xl shadow-e1 shadow-highlight hover:bg-primary-900 transition duration-fast ease-standard active:scale-[0.98] ${focusRing}`}
            >
              <span>{nextLabel}</span>
              {currentStep < 6 && <ChevronRight className="w-3.5 h-3.5 rtl:rotate-180" aria-hidden="true" />}
            </button>
          </div>
        </div>

        {/* Right Rail: Live Preview + Checklist + Tips (Mockup 08) */}
        <div className="space-y-6 lg:sticky lg:top-[88px] lg:self-start">
          {/* Live Preview Card */}
          <LivePreviewCard
            title={formData.title}
            previewTitle={t("preview.title")}
            propertyType={propertyTypeLabel(formData.propertyType)}
            location={locationText}
            priceDzd={formData.price}
            guestCapacity={formData.guestCapacity}
            bedroomCount={formData.bedroomCount}
            surfaceM2={formData.surfaceM2}
            imageSrc={formData.images[0]}
          />

          {/* Creation Progress Checklist */}
          <ProgressChecklist
            currentStep={currentStep}
            totalSteps={6}
            items={PROGRESS_KEYS.map((key, i) => ({
              stepNumber: i + 1,
              label: t(`progress.${key}`),
              completed: currentStep > i + 1,
            }))}
          />

          {/* Step-Specific Tips */}
          <TipsCard title={t(`tips.step${currentStep}.title`)} tips={tips} />
        </div>
      </div>
    </div>
  );
}
