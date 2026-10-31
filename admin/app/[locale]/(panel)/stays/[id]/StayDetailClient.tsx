"use client";

import React, { useState } from "react";
import Image from "next/image";
import { listingImages } from "@/lib/placeholders";
import { useRouter } from "@/navigation";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Star,
  ShieldCheck,
  CheckCircle2,
  FileText,
  Eye,
  Download,
  Edit,
  Check,
  RotateCcw,
} from "lucide-react";
import { Tabs } from "@/components/ui/Tabs";
import { StatusPill } from "@/components/ui/StatusPill";
import { TypePill } from "@/components/ui/TypePill";
import { InfoTile } from "@/components/ui/InfoTile";
import { Dialog } from "@/components/ui/Dialog";
import { useToast } from "@/components/ui/Toast";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { approveListing, rejectListing, requestChangesListing, restoreListing, updateListingStatus } from "@/lib/actions/listings";
import { ReasonDialog } from "@/components/ui/ReasonDialog";
import { canTransitionListing } from "@/lib/domain/transitions";
import { formatDateTime, formatDzd, formatNumber } from "@/lib/utils/format";
import { useLocale, useTranslations } from "next-intl";
import { unwrap } from "@/lib/actions/result";
import { useCan } from "@/components/auth/AdminSessionProvider";
import { Listing } from "@/lib/types";

interface StayDetailClientProps {
  initialStay: Listing | null;
  stayId: string;
}

function errorMessage(err: unknown): string | undefined {
  return err instanceof Error ? err.message : undefined;
}

const TAB_IDS = ["overview", "info", "photos", "amenities", "pricing", "rules", "calendar", "documents", "history"] as const;

/** Mock moderation checklist (key → result key), translated at render time. */
const CHECK_POINTS: { key: string; result: "compliant" | "verified" | "complete" }[] = [
  { key: "ownerDocuments", result: "compliant" },
  { key: "photos", result: "verified" },
  { key: "address", result: "verified" },
  { key: "amenities", result: "complete" },
  { key: "pricingPolicy", result: "compliant" },
  { key: "houseRules", result: "compliant" },
];

/** Mock owner documents. */
const OWNER_DOCUMENTS: { key: string; ext: string; sizeMb: number; validated: boolean }[] = [
  { key: "identity", ext: "PDF", sizeMb: 1.8, validated: true },
  { key: "propertyTitle", ext: "PDF", sizeMb: 4.2, validated: true },
  { key: "proofOfAddress", ext: "JPG", sizeMb: 2.1, validated: false },
];

const iconBtn =
  "p-1 hover:bg-primary/[0.06] rounded text-primary-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2";

export default function StayDetailClient({ initialStay, stayId }: StayDetailClientProps) {
  const router = useRouter();
  const { addToast } = useToast();
  const can = useCan();
  const locale = useLocale();
  const t = useTranslations("stays");
  const tCommon = useTranslations("common");
  const tActions = useTranslations("actions");

  const [stay, setStay] = useState<Listing | null>(initialStay);
  const [activeTab, setActiveTab] = useState("overview");
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [decisionModal, setDecisionModal] = useState<"approve" | "reject" | "changes" | null>(null);

  const formattedId = stay?.formattedId || `#H${stayId.replace("lst_", "").padStart(5, "0")}`;

  const showError = (err: unknown) =>
    addToast({ title: tCommon("error"), description: errorMessage(err), variant: "danger" });

  const handleApprove = async () => {
    if (!stay) return;
    try {
      const updated = unwrap(await approveListing(stay.id));
      setStay(updated);
      addToast({ title: t("detail.toasts.approved"), variant: "success" });
      setDecisionModal(null);
    } catch (err: unknown) {
      showError(err);
    }
  };

  const handleReject = async (reason: string) => {
    if (!stay) return;
    try {
      const updated = unwrap(await rejectListing(stay.id, reason));
      setStay(updated);
      addToast({ title: t("detail.toasts.rejected"), variant: "warning" });
      setDecisionModal(null);
    } catch (err: unknown) {
      showError(err);
    }
  };

  const handleRequestChanges = async (reason: string) => {
    if (!stay) return;
    try {
      const updated = unwrap(await requestChangesListing(stay.id, reason));
      setStay(updated);
      addToast({ title: t("detail.toasts.changesRequested"), variant: "info" });
      setDecisionModal(null);
    } catch (err: unknown) {
      showError(err);
    }
  };

  // deleted → previous status (restore); suspended → approved; rejected → back to review.
  const handleRestore = async () => {
    if (!stay) return;
    try {
      const updated =
        stay.status === "deleted"
          ? unwrap(await restoreListing(stay.id))
          : unwrap(await updateListingStatus(stay.id, stay.status === "suspended" ? "approved" : "pending_review"));
      setStay(updated);
      addToast({ title: tActions("statusUpdated"), variant: "success" });
    } catch (err: unknown) {
      showError(err);
    }
  };

  if (!stay) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl shadow-e1">
        <h1 className="text-base font-semibold text-primary">{t("detail.notFoundTitle")}</h1>
        <p className="text-xs text-primary-600 mt-1">{t("detail.notFoundText")}</p>
        <button
          type="button"
          onClick={() => router.push("/stays")}
          className="mt-4 px-4 py-2 bg-primary text-white rounded-lg text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2"
        >
          {t("detail.backToStays")}
        </button>
      </div>
    );
  }

  const images = listingImages(
    stay.imageSrc,
    stay.category === "vehicle" ? "car" : stay.category === "experience" ? "experience" : stay.category === "trip" ? "trip" : "stay"
  );
  const isPublished = stay.status === "approved" || stay.status === "published";
  const isPending = stay.status === "pending_review" || stay.status === "pending";

  return (
    <div className="space-y-6">
      {/* 1. Header (Mockup 06: Back link, title, status pill, id, prev/next) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-primary/[0.08] pb-5">
        <div>
          <button
            type="button"
            onClick={() => router.push("/stays")}
            className="inline-flex items-center gap-1.5 text-xs text-primary-600 hover:text-primary mb-2 font-medium rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600"
          >
            <ArrowLeft className="w-3.5 h-3.5 rtl:rotate-180" aria-hidden="true" />
            <span>{t("detail.backToList")}</span>
          </button>
          <div className="flex items-center gap-3">
            <h1 className="font-serif text-heading text-primary-900">{stay.title}</h1>
            <StatusPill status={stay.status} />
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-primary-600 mt-1">
            <span className="tabular-nums font-medium" dir="ltr">{formattedId}</span>
            <span aria-hidden="true">•</span>
            <span>{t("detail.addedOn", { date: formatDateTime(stay.createdAt, locale) })}</span>
            <span aria-hidden="true">•</span>
            <span className="text-secondary-700 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" aria-hidden="true" /> {stay.city}, {stay.wilayaCode}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => router.push(`/stays/${stay.id}/review`)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-primary bg-white rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2 shadow-e1 hover:shadow-e2 transition duration-fast"
          >
            <Eye className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{t("detail.reviewModeration")}</span>
          </button>
          {/* Prev / next navigation is not wired to the data layer yet. */}
          <button
            type="button"
            disabled
            className="p-2 border border-primary/[0.12] rounded-lg bg-white text-primary-600 hover:bg-darnaBg disabled:opacity-50 disabled:cursor-not-allowed"
            title={t("detail.previous")}
            aria-label={t("detail.previous")}
          >
            <ChevronLeft className="w-4 h-4 rtl:rotate-180" aria-hidden="true" />
          </button>
          <button
            type="button"
            disabled
            className="p-2 border border-primary/[0.12] rounded-lg bg-white text-primary-600 hover:bg-darnaBg disabled:opacity-50 disabled:cursor-not-allowed"
            title={t("detail.next")}
            aria-label={t("detail.next")}
          >
            <ChevronRight className="w-4 h-4 rtl:rotate-180" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* 2. Tab Bar (Mockup 06: 9 tabs) */}
      <Tabs
        items={TAB_IDS.map((id) => ({ id, label: t(`tabs.${id}`) }))}
        activeId={activeTab}
        onChange={setActiveTab}
      />

      {/* 3. Main Body: Left Content + Right Rail (Mockup 06) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Gallery Card */}
          <div className="bg-white rounded-2xl p-5 space-y-3 shadow-e1">
            <div className="relative aspect-[16/9] rounded-lg overflow-hidden border border-primary/[0.08] bg-darnaBg-400">
              <Image
                src={images[0]}
                alt={stay.title}
                fill
                sizes="(min-width: 1024px) 66vw, 100vw"
                className="object-cover"
              />
              <span className="absolute top-3 start-3 px-2.5 py-1 text-[11px] font-medium bg-primary/80 text-white backdrop-blur-sm rounded-md">
                {t("detail.mainImage")}
              </span>
            </div>

            {/* Thumbnail Strip */}
            <ul className="flex items-center gap-2 overflow-x-auto pb-1">
              {images.slice(1, 6).map((img, i) => (
                <li key={i} className="shrink-0">
                  <button
                    type="button"
                    onClick={() => setLightboxImage(img)}
                    aria-label={t("detail.enlargePhoto", { index: i + 2 })}
                    className="relative block w-20 h-16 rounded-lg overflow-hidden border border-primary/[0.08] cursor-pointer hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2"
                  >
                    <Image src={img} alt="" fill sizes="80px" className="object-cover" />
                  </button>
                </li>
              ))}
              {images.length > 6 && (
                <li className="shrink-0">
                  <button
                    type="button"
                    onClick={() => setActiveTab("photos")}
                    className="w-20 h-16 rounded-xl bg-darnaBg-100 flex items-center justify-center text-xs font-medium text-primary hover:bg-primary/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600"
                  >
                    {t("detail.morePhotos", { count: images.length - 6 })}
                  </button>
                </li>
              )}
            </ul>
          </div>

          {/* General information card (3-column field grid) */}
          <section aria-labelledby="stay-general-info" className="bg-white rounded-2xl p-5 shadow-e1">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-primary/[0.06]">
              <h2 id="stay-general-info" className="text-sm font-semibold text-primary-900">{t("detail.generalInfo")}</h2>
              <button type="button" className="text-xs font-medium text-secondary-700 hover:underline flex items-center gap-1 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600">
                <Edit className="w-3.5 h-3.5" aria-hidden="true" /> {tCommon("edit")}
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <InfoTile label={t("fields.propertyType")} value={stay.propertyType} />
              <InfoTile label={t("fields.category")} value={stay.category} />
              <InfoTile label={t("detail.guestCapacity")} value={t("detail.people", { count: stay.guestCapacity })} />
              <InfoTile label={t("fields.bedrooms")} value={`${stay.bedroomCount || 1}`} />
              <InfoTile label={t("fields.bathrooms")} value={`${stay.bathroomCount || 1}`} />
              <InfoTile label={t("fields.surface")} value={t("values.surface", { value: stay.surfaceM2 || 120 })} />
              <InfoTile label={t("fields.constructionYear")} value={`${stay.constructionYear || 2020}`} />
              <InfoTile label={t("fields.pricePerNight")} value={formatDzd(stay.price, locale)} />
              <InfoTile
                label={t("fields.approvalMode")}
                value={stay.bookingApprovalMode === "instant" ? t("detail.instant") : t("values.onRequest")}
              />
            </div>

            <div className="mt-4 pt-4 border-t border-primary/[0.08]">
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-primary-500 mb-1.5">{t("fields.description")}</h3>
              <p className="text-xs text-primary-700 leading-relaxed bg-darnaBg-100 p-3 rounded-xl">
                {stay.description}
              </p>
            </div>
          </section>

          {/* Amenities card */}
          <section aria-labelledby="stay-amenities" className="bg-white rounded-2xl p-5 shadow-e1">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-primary/[0.06]">
              <div>
                <h2 id="stay-amenities" className="text-sm font-semibold text-primary-900">
                  {t("detail.amenitiesTitle", { count: stay.amenities.length })}
                </h2>
                <p className="text-xs text-primary-600">{t("detail.amenitiesSubtitle")}</p>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab("amenities")}
                className="text-xs font-medium text-secondary-700 hover:underline rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600"
              >
                {t("detail.seeAll", { count: stay.amenities.length })}
              </button>
            </div>
            <ul className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {stay.amenities.slice(0, 9).map((amenity, i) => (
                <li
                  key={i}
                  className="flex items-center gap-2 p-2 bg-darnaBg-100 rounded-xl text-xs text-primary"
                >
                  <Check className="w-3.5 h-3.5 text-secondary-700 shrink-0" aria-hidden="true" />
                  <span className="truncate">{amenity}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* House rules card */}
          <section aria-labelledby="stay-house-rules" className="bg-white rounded-2xl p-5 shadow-e1">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-primary/[0.06]">
              <h2 id="stay-house-rules" className="text-sm font-semibold text-primary-900">{t("detail.houseRules")}</h2>
              <button type="button" className="text-xs font-medium text-secondary-700 hover:underline flex items-center gap-1 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600">
                <Edit className="w-3.5 h-3.5" aria-hidden="true" /> {tCommon("edit")}
              </button>
            </div>
            <dl className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs text-primary">
              <div className="p-3 bg-darnaBg-100 rounded-xl">
                <dt className="text-primary-600 block text-[11px]">{t("times.checkIn")}</dt>
                <dd className="font-semibold text-sm">{t("times.checkInValue", { time: "15:00" })}</dd>
              </div>
              <div className="p-3 bg-darnaBg-100 rounded-xl">
                <dt className="text-primary-600 block text-[11px]">{t("times.checkOut")}</dt>
                <dd className="font-semibold text-sm">{t("times.checkOutValue", { time: "11:00" })}</dd>
              </div>
              <div className="p-3 bg-darnaBg-100 rounded-xl">
                <dt className="text-primary-600 block text-[11px]">{t("detail.rules.pets")}</dt>
                <dd className="font-medium text-accent-700">{t("detail.rules.notAllowed")}</dd>
              </div>
              <div className="p-3 bg-darnaBg-100 rounded-xl">
                <dt className="text-primary-600 block text-[11px]">{t("detail.rules.smoking")}</dt>
                <dd className="font-medium text-accent-700">{t("detail.rules.notAllowed")}</dd>
              </div>
              <div className="p-3 bg-darnaBg-100 rounded-xl">
                <dt className="text-primary-600 block text-[11px]">{t("detail.rules.parties")}</dt>
                <dd className="font-medium text-accent-700">{t("detail.rules.notAllowed")}</dd>
              </div>
              <div className="p-3 bg-darnaBg-100 rounded-xl">
                <dt className="text-primary-600 block text-[11px]">{t("detail.rules.children")}</dt>
                <dd className="font-medium text-secondary-700">{t("detail.rules.childFriendly")}</dd>
              </div>
            </dl>
          </section>
        </div>

        {/* Right Rail (1 col) - Mockup 06 */}
        <div className="space-y-6">
          {/* Validation status card */}
          <section aria-labelledby="stay-validation" className="bg-white rounded-2xl p-5 space-y-4 shadow-e1">
            <div className="flex items-center justify-between pb-3 border-b border-primary/[0.06]">
              <h2 id="stay-validation" className="text-sm font-semibold text-primary-900">{t("detail.validationStatus")}</h2>
              <StatusPill status={stay.status} />
            </div>
            <p className="text-xs text-primary-600 leading-relaxed">
              {isPublished
                ? t("detail.statusText.published")
                : isPending
                ? t("detail.statusText.pending")
                : t("detail.statusText.attention")}
            </p>
            <div className="space-y-2 pt-1">
              {can("listings.approve") && canTransitionListing(stay.status, "approved") && (
                <button
                  type="button"
                  onClick={() => setDecisionModal("approve")}
                  className="w-full py-2.5 px-3 bg-secondary-700 hover:bg-secondary-800 text-white text-xs font-semibold rounded-xl shadow-e1 transition-colors text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2 duration-fast"
                >
                  {t("detail.approvePublish")}
                </button>
              )}
              {can("listings.approve") && canTransitionListing(stay.status, "changes_requested") && (
              <button
                type="button"
                onClick={() => setDecisionModal("changes")}
                className="w-full py-2 px-3 text-primary text-xs font-semibold rounded-xl transition-colors text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2 bg-white shadow-e1 hover:shadow-e2 duration-fast"
              >
                {t("detail.requestChanges")}
              </button>
              )}
              {can("listings.reject") && canTransitionListing(stay.status, "rejected") && (
                <button
                  type="button"
                  onClick={() => setDecisionModal("reject")}
                  className="w-full py-2 px-3 border border-accent/40 hover:bg-accent/10 text-accent-700 text-xs font-semibold rounded-xl transition-colors text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2 duration-fast"
                >
                  {tActions("reject")}
                </button>
              )}
              {(stay.status === "deleted"
                ? can("listings.delete")
                : (stay.status === "suspended" || stay.status === "rejected" || stay.status === "refused") &&
                  can("listings.approve") &&
                  canTransitionListing(stay.status, stay.status === "suspended" ? "approved" : "pending_review")) && (
                <button
                  type="button"
                  onClick={handleRestore}
                  className="w-full py-2.5 px-3 text-primary text-xs font-semibold rounded-xl transition-colors text-center flex items-center justify-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2 bg-white shadow-e1 hover:shadow-e2 duration-fast"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-secondary-700" aria-hidden="true" />
                  <span>{stay.status === "deleted" ? tActions("restore") : t("detail.reactivate")}</span>
                </button>
              )}
            </div>
          </section>

          {/* Quick checklist */}
          <section aria-labelledby="stay-checkpoints" className="bg-white rounded-2xl p-5 space-y-3 shadow-e1">
            <h2 id="stay-checkpoints" className="text-sm font-semibold text-primary-900 pb-2 border-b border-primary/[0.06]">
              {t("detail.checkpointsTitle")}
            </h2>
            <ul className="space-y-2 text-xs">
              {CHECK_POINTS.map((pt) => (
                <li key={pt.key} className="flex items-center justify-between p-2 rounded-xl bg-darnaBg-100">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-secondary-700" aria-hidden="true" />
                    <span className="text-primary font-medium">{t(`detail.checkpoints.${pt.key}`)}</span>
                  </div>
                  <span className="text-[11px] text-secondary-700 font-semibold">{t(`detail.checkResults.${pt.result}`)}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* Host / owner card with verification badges */}
          <section aria-labelledby="stay-host" className="bg-white rounded-2xl p-5 space-y-3 shadow-e1">
            <div className="flex items-center justify-between pb-2 border-b border-primary/[0.06]">
              <h2 id="stay-host" className="text-sm font-semibold text-primary-900">{t("host.title")}</h2>
              <TypePill type={stay.hostType} />
            </div>
            <div className="flex items-center gap-3">
              <div aria-hidden="true" className="w-12 h-12 rounded-full bg-darnaBg-400 flex items-center justify-center font-semibold text-base text-primary">
                {stay.hostName.charAt(0)}
              </div>
              <div>
                <h3 className="text-sm font-semibold text-primary-900">{stay.hostName}</h3>
                <div className="flex items-center gap-1 text-xs text-amber-700 font-semibold">
                  <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" aria-hidden="true" />
                  <span>{stay.rating.toFixed(1)}</span>
                  <span className="text-primary-600">{t("values.reviews", { count: stay.reviewsCount })}</span>
                </div>
              </div>
            </div>

            <dl className="space-y-1.5 pt-2 border-t border-primary/[0.08] text-xs">
              {(["identity", "phone", "email"] as const).map((k) => (
                <div key={k} className="flex items-center justify-between text-primary-700">
                  <dt>{t(`detail.verification.${k}`)}</dt>
                  <dd className="text-secondary-700 font-medium flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" /> {t("host.verified")}
                  </dd>
                </div>
              ))}
            </dl>
          </section>

          {/* Owner documents list */}
          <section aria-labelledby="stay-documents" className="bg-white rounded-2xl p-5 space-y-3 shadow-e1">
            <h2 id="stay-documents" className="text-sm font-semibold text-primary-900 pb-2 border-b border-primary/[0.06]">
              {t("detail.ownerDocuments")}
            </h2>
            <ul className="space-y-2 text-xs">
              {OWNER_DOCUMENTS.map((doc) => {
                const name = t(`detail.documents.${doc.key}`);
                return (
                  <li key={doc.key} className="flex items-center justify-between p-2.5 rounded-xl bg-darnaBg-100">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-secondary-700" aria-hidden="true" />
                      <div>
                        <div className="font-medium text-primary">{name}</div>
                        <div className="text-[11px] text-primary-600">
                          {t("detail.fileMeta", { ext: doc.ext, size: formatNumber(doc.sizeMb, locale) })}
                          {" · "}
                          <span className={doc.validated ? "text-secondary-700" : "text-amber-800"}>
                            {doc.validated ? t("detail.docValidated") : t("detail.docToCheck")}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button type="button" className={iconBtn} aria-label={t("detail.viewDocument", { name })} title={tCommon("view")}>
                        <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                      </button>
                      <button type="button" className={iconBtn} aria-label={t("detail.downloadDocument", { name })} title={t("detail.download")}>
                        <Download className="w-3.5 h-3.5" aria-hidden="true" />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        </div>
      </div>

      {/* Photo lightbox */}
      <Dialog
        isOpen={!!lightboxImage}
        onClose={() => setLightboxImage(null)}
        title={stay.title}
        size="xl"
      >
        {lightboxImage && (
          <div className="relative w-full aspect-[16/10] rounded-lg overflow-hidden bg-darnaBg-400">
            <Image src={lightboxImage} alt={stay.title} fill sizes="(min-width: 768px) 672px, 100vw" className="object-contain" />
          </div>
        )}
      </Dialog>

      {/* Decision Dialogs: approval needs a confirmation, reject / changes need a reason */}
      {decisionModal === "approve" && (
        <ConfirmDialog
          isOpen={true}
          title={t("detail.approveDialogTitle")}
          description={t("detail.approveDialogText")}
          confirmLabel={t("detail.approvePublish")}
          variant="primary"
          onConfirm={handleApprove}
          onCancel={() => setDecisionModal(null)}
        />
      )}
      <ReasonDialog
        isOpen={decisionModal === "reject" || decisionModal === "changes"}
        title={decisionModal === "reject" ? tActions("rejectListingTitle") : tActions("requestChangesTitle")}
        description={stay.title}
        confirmLabel={decisionModal === "reject" ? tActions("reject") : tActions("requestChanges")}
        variant={decisionModal === "reject" ? "danger" : "primary"}
        onCancel={() => setDecisionModal(null)}
        onConfirm={(reason) => (decisionModal === "reject" ? handleReject(reason) : handleRequestChanges(reason))}
      />
    </div>
  );
}
