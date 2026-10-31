"use client";

import React, { useId, useState } from "react";
import Image from "next/image";
import { listingImages } from "@/lib/placeholders";
import { useRouter } from "@/navigation";
import {
  ArrowLeft,
  ArrowRight,
  ExternalLink,
  MapPin,
  Eye,
  Users,
  Bed,
  Bath,
  Maximize2,
  Check,
} from "lucide-react";
import { Stepper, StepItem } from "@/components/ui/Stepper";
import { Tabs } from "@/components/ui/Tabs";
import { StatusPill } from "@/components/ui/StatusPill";
import { InfoTile } from "@/components/ui/InfoTile";
import { useToast } from "@/components/ui/Toast";
import {
  approveListing,
  rejectListing,
  requestChangesListing,
} from "@/lib/actions/listings";
import { unwrap } from "@/lib/actions/result";
import { useCan } from "@/components/auth/AdminSessionProvider";
import { isValidReason, MIN_REASON_LENGTH } from "@/lib/domain/transitions";
import { useTranslations } from "next-intl";
import { Listing } from "@/lib/types";

interface StayReviewClientProps {
  stay: Listing;
}

type CheckResult =
  | "valid"
  | "compliantPlural"
  | "verified"
  | "completeFem"
  | "compliant";

/** Checklist (Mockup 04): id → translation key under `stays.review.checks`, result when OK. */
const INITIAL_CHECKLIST: {
  id: string;
  key: string;
  okResult: CheckResult;
  ok: boolean;
}[] = [
  { id: "id_proof", key: "idProof", okResult: "valid", ok: true },
  { id: "residence_proof", key: "residenceProof", okResult: "valid", ok: true },
  { id: "property_title", key: "propertyTitle", okResult: "valid", ok: true },
  { id: "photos", key: "photos", okResult: "compliantPlural", ok: true },
  { id: "address", key: "address", okResult: "verified", ok: true },
  {
    id: "completeness",
    key: "completeness",
    okResult: "completeFem",
    ok: true,
  },
  { id: "rules", key: "rules", okResult: "compliant", ok: true },
];

const HOST_TYPE_KEYS = ["individual", "agency", "hotel", "hostel"];

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2";

export default function StayReviewClient({ stay }: StayReviewClientProps) {
  const router = useRouter();
  const { addToast } = useToast();
  const can = useCan();
  const t = useTranslations("stays");
  const tCommon = useTranslations("common");
  const tActions = useTranslations("actions");
  const tHostTypes = useTranslations("hostTypes");
  const notesId = useId();

  const [currentStep, setCurrentStep] = useState(4); // Step 4 "Verification"
  const [activeTab, setActiveTab] = useState("info");
  const [internalNotes, setInternalNotes] = useState("");
  const [selectedDecision, setSelectedDecision] = useState<
    "approve" | "changes" | "reject"
  >("approve");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reasonError, setReasonError] = useState(false);
  const [checklist, setChecklist] = useState(INITIAL_CHECKLIST);

  // Stepper definition (Mockup 04)
  const steps: StepItem[] = [
    { id: 1, title: t("review.steps.info") },
    { id: 2, title: t("review.steps.photos") },
    { id: 3, title: t("review.steps.documents") },
    { id: 4, title: t("review.steps.verification") },
    { id: 5, title: t("review.steps.decision") },
  ];

  const toggleCheck = (id: string) => {
    setChecklist((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ok: !item.ok } : item)),
    );
  };

  const needsReason = selectedDecision !== "approve";

  const handleExecuteDecision = async () => {
    // Reject / request changes require a written reason (stored in the audit trail).
    if (needsReason && !isValidReason(internalNotes)) {
      setReasonError(true);
      addToast({
        title: tActions("reasonLabel"),
        description: tActions("reasonTooShort", { min: MIN_REASON_LENGTH }),
        variant: "danger",
      });
      return;
    }
    setReasonError(false);
    setIsSubmitting(true);
    try {
      if (selectedDecision === "approve") {
        unwrap(await approveListing(stay.id));
        addToast({ title: t("review.toasts.approved"), variant: "success" });
      } else if (selectedDecision === "reject") {
        unwrap(await rejectListing(stay.id, internalNotes.trim()));
        addToast({ title: t("review.toasts.rejected"), variant: "warning" });
      } else {
        unwrap(await requestChangesListing(stay.id, internalNotes.trim()));
        addToast({
          title: t("review.toasts.changesRequested"),
          variant: "info",
        });
      }
      router.push("/stays");
    } catch (err: unknown) {
      addToast({
        title: tCommon("error"),
        description: err instanceof Error ? err.message : undefined,
        variant: "danger",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const images = listingImages(
    stay.imageSrc,
    stay.category === "vehicle"
      ? "car"
      : stay.category === "experience"
        ? "experience"
        : stay.category === "trip"
          ? "trip"
          : "stay",
  );
  const formattedId =
    stay.formattedId || `#H${stay.id.replace("lst_", "").padStart(5, "0")}`;
  const hostTypeLabel = HOST_TYPE_KEYS.includes(stay.hostType)
    ? tHostTypes(stay.hostType)
    : stay.hostType;

  const notesHintId = `${notesId}-hint`;
  const notesErrorId = `${notesId}-error`;

  const decisions = [
    {
      id: "approve" as const,
      selected: "bg-secondary/10 border-secondary",
      accent: "accent-secondary",
    },
    {
      id: "changes" as const,
      selected: "bg-tertiary/30 border-amber-700",
      accent: "accent-amber-700",
    },
    {
      id: "reject" as const,
      selected: "bg-accent/10 border-accent",
      accent: "accent-accent",
    },
  ];

  return (
    <div className="space-y-6">
      {/* 1. Header (Mockup 04) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-primary/[0.08] pb-5">
        <div>
          <button
            type="button"
            onClick={() => router.push("/stays")}
            className={`inline-flex items-center gap-1.5 text-xs text-primary-600 hover:text-primary mb-2 font-medium rounded ${focusRing}`}
          >
            <ArrowLeft
              className="w-3.5 h-3.5 rtl:rotate-180"
              aria-hidden="true"
            />
            <span>{t("detail.backToList")}</span>
          </button>
          <div className="flex items-center gap-3">
            <h1 className="font-serif text-heading text-primary-900">
              {t("review.title")}
            </h1>
            <StatusPill status={stay.status} />
          </div>
          <p className="text-xs text-primary-600 mt-1">
            {t("review.subtitle")}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => window.open(`/stays/${stay.id}`, "_blank")}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-primary bg-white rounded-xl shadow-e1 hover:shadow-e2 transition duration-fast ${focusRing}`}
          >
            <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{t("review.viewOnSite")}</span>
            <span className="sr-only">{t("review.newTab")}</span>
          </button>
          <button
            type="button"
            onClick={() => setCurrentStep((prev) => Math.min(5, prev + 1))}
            className={`inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-primary rounded-xl hover:bg-primary-900 transition duration-fast ${focusRing}`}
          >
            <span>{t("review.nextStep")}</span>
            <ArrowRight
              className="w-3.5 h-3.5 rtl:rotate-180"
              aria-hidden="true"
            />
          </button>
        </div>
      </div>

      {/* 2. Stepper (Mockup 04: 5 steps connected with lines) */}
      <div className="bg-white rounded-2xl p-5 shadow-e1">
        <Stepper
          steps={steps}
          currentStep={currentStep}
          onStepClick={setCurrentStep}
        />
      </div>

      {/* 3. Main Two-Column Layout (Mockup 04) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Gallery (Main + Thumbs) */}
          <div className="bg-white rounded-2xl p-5 space-y-3 shadow-e1">
            <div className="relative aspect-[16/9] rounded-lg overflow-hidden border border-primary/[0.08] bg-darnaBg-400">
              <Image
                src={images[0]}
                alt={stay.title}
                fill
                sizes="(min-width: 1024px) 66vw, 100vw"
                className="object-cover"
              />
            </div>
            <ul className="flex items-center gap-2 overflow-x-auto pb-1">
              {images.slice(1, 6).map((img, i) => (
                <li
                  key={i}
                  className="relative w-20 h-16 rounded-lg overflow-hidden border border-primary/[0.08] shrink-0"
                >
                  <Image
                    src={img}
                    alt={t("photoAlt", { title: stay.title, index: i + 2 })}
                    fill
                    sizes="80px"
                    className="object-cover"
                  />
                </li>
              ))}
              {images.length > 6 && (
                <li className="w-20 h-16 rounded-xl bg-darnaBg-100 flex items-center justify-center text-xs font-medium text-primary shrink-0">
                  {t("detail.morePhotos", { count: images.length - 6 })}
                </li>
              )}
            </ul>
          </div>

          {/* Property Header & Stat Tiles */}
          <div className="bg-white rounded-2xl p-5 space-y-4 shadow-e1">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-serif text-title text-primary-900">
                    {stay.title}
                  </h2>
                  <span className="px-2 py-0.5 text-xs bg-darnaBg-100 text-primary border border-primary/[0.12] rounded">
                    {stay.propertyType}
                  </span>
                  <StatusPill status={stay.status} />
                </div>
                <div className="text-xs text-primary-600 flex items-center gap-2 mt-1">
                  <span>
                    {t.rich("review.idLabel", {
                      id: formattedId,
                      code: (chunks) => <span dir="ltr">{chunks}</span>,
                    })}
                  </span>
                  <span aria-hidden="true">•</span>
                  <span className="flex items-center gap-1 text-secondary-700">
                    <MapPin className="w-3.5 h-3.5" aria-hidden="true" />{" "}
                    {stay.city}, {stay.wilayaCode}
                  </span>
                </div>
              </div>
            </div>

            <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-primary/[0.08]">
              {[
                {
                  icon: Users,
                  value: String(stay.guestCapacity),
                  label: t("review.stats.guests"),
                },
                {
                  icon: Bed,
                  value: String(stay.bedroomCount || 1),
                  label: t("fields.bedrooms"),
                },
                {
                  icon: Bath,
                  value: String(stay.bathroomCount || 1),
                  label: t("fields.bathrooms"),
                },
                {
                  icon: Maximize2,
                  value: t("values.surface", { value: stay.surfaceM2 || 120 }),
                  label: t("fields.surface"),
                },
              ].map(({ icon: Icon, value, label }) => (
                <div
                  key={label}
                  className="p-3 bg-darnaBg-100 rounded-xl text-center flex flex-col-reverse"
                >
                  <dt className="text-[11px] text-primary-600">{label}</dt>
                  <dd className="text-xs font-semibold text-primary block">
                    <Icon
                      className="w-4 h-4 text-secondary-700 mx-auto mb-1"
                      aria-hidden="true"
                    />
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Host Mini-Card (Mockup 04) */}
          <section
            aria-labelledby="review-host"
            className="bg-white rounded-2xl p-5 shadow-e1"
          >
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-primary/[0.06]">
              <h2
                id="review-host"
                className="text-[11px] font-semibold uppercase tracking-[0.12em] text-primary-500"
              >
                {t("review.ownerInfo")}
              </h2>
              <button
                type="button"
                onClick={() => router.push(`/hosts/${stay.hostId}`)}
                className={`text-xs text-secondary-700 font-medium hover:underline rounded ${focusRing}`}
              >
                {t("review.viewFullProfile")}
              </button>
            </div>
            <div className="flex items-center gap-4">
              <div
                aria-hidden="true"
                className="w-12 h-12 rounded-full bg-darnaBg-400 flex items-center justify-center font-semibold text-base text-primary"
              >
                {stay.hostName.charAt(0)}
              </div>
              <div>
                <h3 className="text-sm font-semibold text-primary-900">
                  {stay.hostName}
                </h3>
                <div className="flex flex-wrap items-center gap-2 text-xs text-primary-600 mt-0.5">
                  <span>{hostTypeLabel}</span>
                  <span aria-hidden="true">•</span>
                  <span>{t("review.memberSince", { year: "2023" })}</span>
                  <span aria-hidden="true">•</span>
                  <span className="text-amber-700 font-medium">
                    <span aria-hidden="true">★ </span>
                    <span className="sr-only">{t("review.ratingLabel")} </span>
                    {stay.rating.toFixed(1)}
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* Tabs bar */}
          <div className="bg-white rounded-2xl p-5 space-y-4 shadow-e1">
            <Tabs
              items={[
                { id: "info", label: t("review.tabs.info") },
                { id: "location", label: t("review.tabs.location") },
                { id: "amenities", label: t("tabs.amenities") },
                { id: "pricing", label: t("tabs.pricing") },
                { id: "rules", label: t("tabs.rules") },
              ]}
              activeId={activeTab}
              onChange={setActiveTab}
            />

            {activeTab === "info" && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                  <InfoTile
                    label={t("review.fields.title")}
                    value={stay.title}
                  />
                  <InfoTile
                    label={t("fields.propertyType")}
                    value={stay.propertyType}
                  />
                  <InfoTile
                    label={t("fields.category")}
                    value={stay.category}
                  />
                  <InfoTile
                    label={t("detail.guestCapacity")}
                    value={t("detail.people", { count: stay.guestCapacity })}
                  />
                  <InfoTile
                    label={t("fields.bedrooms")}
                    value={`${stay.bedroomCount || 1}`}
                  />
                  <InfoTile
                    label={t("fields.bathrooms")}
                    value={`${stay.bathroomCount || 1}`}
                  />
                  <InfoTile
                    label={t("fields.surface")}
                    value={t("values.surface", {
                      value: stay.surfaceM2 || 120,
                    })}
                  />
                  <InfoTile
                    label={t("fields.constructionYear")}
                    value={`${stay.constructionYear || 2020}`}
                  />
                </div>
                <div>
                  <h3 className="text-xs font-semibold text-primary mb-1.5">
                    {t("fields.description")}
                  </h3>
                  <p className="text-xs text-primary-700 leading-relaxed bg-darnaBg-100 p-3 rounded-xl">
                    {stay.description}
                  </p>
                </div>
              </div>
            )}

            {activeTab === "amenities" && (
              <ul className="flex flex-wrap gap-2">
                {stay.amenities.map((am, i) => (
                  <li
                    key={i}
                    className="px-3 py-1.5 bg-darnaBg-100 rounded-xl text-xs text-primary flex items-center gap-1.5"
                  >
                    <Check
                      className="w-3.5 h-3.5 text-secondary-700"
                      aria-hidden="true"
                    />
                    <span>{am}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Right Column: Verification Checklist + Internal Notes + Decision (Mockup 04) */}
        <div className="space-y-6">
          {/* Verification & compliance checklist */}
          <fieldset className="bg-white rounded-2xl p-5 space-y-4 shadow-e1">
            <legend className="sr-only">{t("review.checklistTitle")}</legend>
            <h2
              aria-hidden="true"
              className="text-sm font-semibold text-primary-900 pb-2 border-b border-primary/[0.06]"
            >
              {t("review.checklistTitle")}
            </h2>
            <ul className="space-y-2.5">
              {checklist.map((item) => {
                const title = t(`review.checks.${item.key}`);
                const checkboxId = `${notesId}-check-${item.id}`;
                return (
                  <li
                    key={item.id}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-darnaBg-100 text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <input
                        id={checkboxId}
                        type="checkbox"
                        checked={item.ok}
                        onChange={() => toggleCheck(item.id)}
                        className="w-4 h-4 rounded text-primary accent-primary"
                      />
                      <label
                        htmlFor={checkboxId}
                        className="text-primary font-medium truncate cursor-pointer"
                      >
                        {title}
                      </label>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span
                        className={`text-[11px] font-semibold px-2 py-0.5 rounded ${item.ok ? "bg-secondary/15 text-secondary-800" : "bg-amber-100 text-amber-800"}`}
                      >
                        {item.ok
                          ? t(`review.checkResults.${item.okResult}`)
                          : t("review.checkResults.toCheck")}
                      </span>
                      <button
                        type="button"
                        className={`p-1 text-primary-600 hover:text-primary rounded ${focusRing}`}
                        title={t("review.inspect")}
                        aria-label={t("review.inspectItem", { item: title })}
                      >
                        <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </fieldset>

          {/* Internal notes (Mockup 04), also the reason for reject / request changes */}
          <div className="bg-white rounded-2xl p-5 space-y-3 shadow-e1">
            <h2 className="text-sm font-semibold text-primary-900 pb-2 border-b border-primary/[0.06]">
              <label htmlFor={notesId}>{t("review.notesTitle")}</label>
            </h2>
            <p id={notesHintId} className="text-[11px] text-primary-600">
              {needsReason
                ? t("review.notesReasonHint", { min: MIN_REASON_LENGTH })
                : t("review.notesHint")}
            </p>
            <textarea
              id={notesId}
              rows={3}
              value={internalNotes}
              onChange={(e) => {
                setInternalNotes(e.target.value);
                if (reasonError && isValidReason(e.target.value))
                  setReasonError(false);
              }}
              aria-required={needsReason || undefined}
              aria-invalid={reasonError || undefined}
              aria-describedby={
                reasonError ? `${notesHintId} ${notesErrorId}` : notesHintId
              }
              placeholder={t("review.notesPlaceholder")}
              className="w-full px-3 py-2 text-xs bg-darnaBg-100 border border-primary/[0.12] rounded-lg text-primary focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {reasonError && (
              <p
                id={notesErrorId}
                role="alert"
                className="text-[11px] font-medium text-accent-700"
              >
                {tActions("reasonTooShort", { min: MIN_REASON_LENGTH })}
              </p>
            )}
          </div>

          {/* Decision radio group + action button (Mockup 04) */}
          <div className="bg-white rounded-2xl p-5 space-y-4 shadow-e1">
            <fieldset className="space-y-3 text-xs">
              <legend className="text-sm font-semibold text-primary pb-2 mb-1 border-b border-primary/[0.08] w-full">
                {t("review.decisionTitle")}
              </legend>
              {decisions.map((d) => (
                <label
                  key={d.id}
                  className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors focus-within:ring-2 focus-within:ring-accent-600 ${
                    selectedDecision === d.id
                      ? d.selected
                      : "bg-darnaBg-100 border-tertiary/50 hover:bg-darnaBg"
                  }`}
                >
                  <input
                    type="radio"
                    name="decision"
                    value={d.id}
                    checked={selectedDecision === d.id}
                    onChange={() => {
                      setSelectedDecision(d.id);
                      setReasonError(false);
                    }}
                    className={`mt-0.5 ${d.accent}`}
                  />
                  <span>
                    <span className="font-semibold text-primary block">
                      {t(`review.decisions.${d.id}.title`)}
                    </span>
                    <span className="text-primary-600 text-[11px]">
                      {t(`review.decisions.${d.id}.description`)}
                    </span>
                  </span>
                </label>
              ))}
            </fieldset>

            {/* Action buttons (Mockup 04) */}
            <div className="pt-2 space-y-2">
              <button
                type="button"
                disabled={
                  isSubmitting ||
                  !can(
                    selectedDecision === "reject"
                      ? "listings.reject"
                      : "listings.approve",
                  )
                }
                onClick={handleExecuteDecision}
                className={`w-full py-2.5 px-4 rounded-lg font-semibold text-xs text-white shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${focusRing} ${
                  selectedDecision === "approve"
                    ? "bg-secondary-700 hover:bg-secondary-800"
                    : selectedDecision === "reject"
                      ? "bg-accent-600 hover:bg-accent-700"
                      : "bg-primary hover:bg-primary-900"
                }`}
              >
                {t(`review.submit.${selectedDecision}`)}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
