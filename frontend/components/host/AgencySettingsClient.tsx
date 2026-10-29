"use client";

import React, { useId, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, useRouter } from "@/navigation";
import { MembershipRole, Organization, User } from "@/types";
import { orgPermissions } from "@/lib/host-types";
import { updateOrganizationAction, deleteOrganizationAction } from "@/app/actions/organizations";
import {
  BrandBadgeCheckIcon,
  BrandExternalLinkIcon,
  BrandExclamationIcon,
  BrandArrowLeftIcon,
  BrandMailIcon,
  BrandPhoneIcon,
  BrandPinIcon,
  BrandLightningIcon,
  BrandClockIcon,
} from "@/components/icons";
import { toast } from "react-toastify";
import ConfirmDialog from "@/components/models/ConfirmDialog";
import HostWalletWidget from "@/components/host/HostWalletWidget";
import { useActionError } from "@/hook/useActionError";

interface AgencySettingsClientProps {
  organization: Organization;
  currentUser?: User | null;
  /** Role of the viewer in this organization (drives what they may edit). */
  currentRole?: MembershipRole | null;
}

type TeamSize = NonNullable<Organization["teamSizeEstimate"]>;

const FIELD_CLASS =
  "w-full bg-neutral-50 border border-tertiary/80 rounded-xl text-xs sm:text-sm text-primary focus:outline-none focus:border-primary focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2";
const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2";

export default function AgencySettingsClient({
  organization: initialOrg,
  currentRole = null,
}: AgencySettingsClientProps) {
  const t = useTranslations("agencySettings");
  const errorText = useActionError();
  const locale = useLocale();
  const baseId = useId();
  const canEdit = orgPermissions.canEditSettings(currentRole);
  const canDelete = orgPermissions.canDeleteOrganization(currentRole);
  const router = useRouter();
  const [org, setOrg] = useState<Organization>(initialOrg);
  const [name, setName] = useState(org.name);
  const [businessEmail, setBusinessEmail] = useState(org.businessEmail);
  const [businessPhone, setBusinessPhone] = useState(org.businessPhone);
  const [address, setAddress] = useState(org.address || "");
  const [description, setDescription] = useState(org.description || "");
  const [rcNumber, setRcNumber] = useState(org.businessRegistrationNumber);
  const [teamSize, setTeamSize] = useState<TeamSize>(org.teamSizeEstimate || "2-10");
  const [bookingApprovalMode, setBookingApprovalMode] = useState<"instant" | "request">(
    org.bookingApprovalMode || "instant"
  );
  const [isSaving, setIsSaving] = useState(false);

  // Danger zone
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteConfirmInput, setDeleteConfirmInput] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const ids = {
    name: `${baseId}-name`,
    rc: `${baseId}-rc`,
    email: `${baseId}-email`,
    phone: `${baseId}-phone`,
    address: `${baseId}-address`,
    teamSize: `${baseId}-team-size`,
    description: `${baseId}-description`,
    approvalLabel: `${baseId}-approval-label`,
    readOnlyNote: `${baseId}-read-only`,
    deleteInput: `${baseId}-delete-input`,
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const result = await updateOrganizationAction({
        name,
        businessEmail,
        businessPhone,
        address,
        description,
        businessRegistrationNumber: rcNumber,
        teamSizeEstimate: teamSize,
        bookingApprovalMode,
      });
      if (!result.ok) {
        toast.error(errorText(result));
        return;
      }
      const legalChanged = org.verificationStatus === "verified" && result.data.verificationStatus !== "verified";
      setOrg(result.data);
      toast.success(legalChanged ? t("toasts.savedReverify") : t("toasts.saved"));
      router.refresh();
    } catch {
      toast.error(t("toasts.saveFailed"));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (deleteConfirmInput !== org.name) {
      toast.error(t("toasts.nameMismatch"));
      return;
    }

    setIsDeleting(true);
    try {
      const result = await deleteOrganizationAction(deleteConfirmInput);
      if (!result.ok) {
        toast.error(errorText(result));
        return;
      }
      toast.info(t("toasts.deactivated"));
      // Full reload so the refreshed session (no org) is picked up everywhere.
      window.location.href = `/${locale}`;
    } catch {
      toast.error(t("toasts.deleteFailed"));
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-8 py-8">
      {/* Back button */}
      <div className="mb-6">
        <Link
          href="/host"
          className={`inline-flex items-center gap-1.5 text-xs font-bold text-neutral-600 hover:text-primary transition rounded ${FOCUS_RING}`}
        >
          <BrandArrowLeftIcon size={16} className="rtl:rotate-180" aria-hidden="true" />
          <span>{t("backToHost")}</span>
        </Link>
      </div>

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-serif font-black text-primary">{t("title")}</h1>
          <p className="text-sm text-neutral-600 mt-1">{t("subtitle")}</p>
        </div>

        {/* Public profile button */}
        <Link
          href={`/agencies/${org.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className={`px-4 py-2 border border-tertiary/80 hover:bg-neutral-50 rounded-xl text-xs font-bold text-neutral-700 transition flex items-center gap-1.5 shadow-2xs self-start sm:self-auto ${FOCUS_RING}`}
        >
          <BrandExternalLinkIcon size={16} aria-hidden="true" />
          <span>{t("viewPublicProfile")}</span>
          <span className="sr-only">{t("opensInNewTab")}</span>
        </Link>
      </div>

      {/* Verification Badge Re-surfaced */}
      <div className="bg-white rounded-3xl border border-tertiary/70 p-6 shadow-2xs mb-8 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div
            aria-hidden="true"
            className="w-12 h-12 rounded-2xl bg-secondary/15 text-secondary flex items-center justify-center shrink-0"
          >
            <BrandBadgeCheckIcon size={26} />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-serif font-bold text-primary text-base">{t("verification.label")}</h2>
              {org.verificationStatus === "verified" ? (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                  {t("verification.verified")}
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                  {t("verificationPending")}
                </span>
              )}
            </div>
            <p className="text-xs text-neutral-600 mt-0.5">{t("verification.description")}</p>
          </div>
        </div>
      </div>

      {/* Host Prepaid Wallet & Solvency Widget */}
      <HostWalletWidget className="mb-8" />

      {/* Edit Form */}
      <form
        onSubmit={handleSave}
        aria-describedby={!canEdit ? ids.readOnlyNote : undefined}
        className="bg-white rounded-3xl border border-tertiary/70 p-6 sm:p-8 shadow-2xs space-y-6 mb-8"
      >
        <h2 className="font-serif text-lg font-bold text-primary pb-3 border-b border-tertiary/60">
          {t("form.title")}
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor={ids.name} className="text-xs font-bold text-neutral-600 block mb-1">
              {t("form.name")}
            </label>
            <input
              id={ids.name}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={`${FIELD_CLASS} px-3 py-2 font-semibold`}
              required
            />
          </div>

          <div>
            <label htmlFor={ids.rc} className="text-xs font-bold text-neutral-600 block mb-1">
              {t("form.rcNumber")}
            </label>
            <input
              id={ids.rc}
              type="text"
              dir="ltr"
              value={rcNumber}
              onChange={(e) => setRcNumber(e.target.value)}
              className={`${FIELD_CLASS} px-3 py-2 font-mono text-start`}
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor={ids.email} className="text-xs font-bold text-neutral-600 block mb-1">
              {t("form.email")}
            </label>
            <div className="relative">
              <BrandMailIcon
                size={16}
                aria-hidden="true"
                className="absolute start-3 top-1/2 -translate-y-1/2 text-neutral-400"
              />
              <input
                id={ids.email}
                type="email"
                dir="ltr"
                autoComplete="email"
                value={businessEmail}
                onChange={(e) => setBusinessEmail(e.target.value)}
                className={`${FIELD_CLASS} ps-9 pe-3 py-2 text-start`}
                required
              />
            </div>
          </div>

          <div>
            <label htmlFor={ids.phone} className="text-xs font-bold text-neutral-600 block mb-1">
              {t("form.phone")}
            </label>
            <div className="relative">
              <BrandPhoneIcon
                size={16}
                aria-hidden="true"
                className="absolute start-3 top-1/2 -translate-y-1/2 text-neutral-400"
              />
              <input
                id={ids.phone}
                type="tel"
                dir="ltr"
                autoComplete="tel"
                value={businessPhone}
                onChange={(e) => setBusinessPhone(e.target.value)}
                className={`${FIELD_CLASS} ps-9 pe-3 py-2 text-start`}
                required
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor={ids.address} className="text-xs font-bold text-neutral-600 block mb-1">
              {t("form.address")}
            </label>
            <div className="relative">
              <BrandPinIcon
                size={16}
                aria-hidden="true"
                className="absolute start-3 top-1/2 -translate-y-1/2 text-neutral-400"
              />
              <input
                id={ids.address}
                type="text"
                autoComplete="street-address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className={`${FIELD_CLASS} ps-9 pe-3 py-2`}
              />
            </div>
          </div>

          <div>
            <label htmlFor={ids.teamSize} className="text-xs font-bold text-neutral-600 block mb-1">
              {t("form.teamSize")}
            </label>
            <select
              id={ids.teamSize}
              value={teamSize}
              onChange={(e) => setTeamSize(e.target.value as TeamSize)}
              className={`${FIELD_CLASS} px-3 py-2`}
            >
              <option value="1">{t("form.teamSize1")}</option>
              <option value="2-10">{t("form.teamSizeRange", { min: 2, max: 10 })}</option>
              <option value="11-50">{t("form.teamSizeRange", { min: 11, max: 50 })}</option>
              <option value="50+">{t("form.teamSizeOver", { min: 50 })}</option>
            </select>
          </div>
        </div>

        <div>
          <label htmlFor={ids.description} className="text-xs font-bold text-neutral-600 block mb-1">
            {t("form.description")}
          </label>
          <textarea
            id={ids.description}
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={`${FIELD_CLASS} p-3 leading-relaxed`}
          />
        </div>

        {/* Default Booking Approval Mode */}
        <div
          className="space-y-2 pt-2 border-t border-tertiary/40"
          role="group"
          aria-labelledby={ids.approvalLabel}
        >
          <span id={ids.approvalLabel} className="text-xs font-bold text-neutral-700 block">
            {t("form.approvalMode")}
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              aria-pressed={bookingApprovalMode === "instant"}
              onClick={() => setBookingApprovalMode("instant")}
              className={`p-3.5 rounded-2xl border text-start transition flex items-start gap-3 cursor-pointer ${FOCUS_RING} ${
                bookingApprovalMode === "instant"
                  ? "border-primary bg-primary/5 ring-1 ring-primary"
                  : "border-tertiary/70 bg-neutral-50 hover:bg-neutral-100/60"
              }`}
            >
              <div
                aria-hidden="true"
                className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 ${
                  bookingApprovalMode === "instant" ? "bg-primary text-white" : "bg-neutral-200 text-neutral-600"
                }`}
              >
                <BrandLightningIcon size={16} />
              </div>
              <div>
                <span className="font-bold text-xs text-primary block">{t("form.instantTitle")}</span>
                <span className="text-[10px] text-neutral-600 leading-snug block">{t("form.instantDesc")}</span>
              </div>
            </button>

            <button
              type="button"
              aria-pressed={bookingApprovalMode === "request"}
              onClick={() => setBookingApprovalMode("request")}
              className={`p-3.5 rounded-2xl border text-start transition flex items-start gap-3 cursor-pointer ${FOCUS_RING} ${
                bookingApprovalMode === "request"
                  ? "border-primary bg-primary/5 ring-1 ring-primary"
                  : "border-tertiary/70 bg-neutral-50 hover:bg-neutral-100/60"
              }`}
            >
              <div
                aria-hidden="true"
                className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 ${
                  bookingApprovalMode === "request" ? "bg-amber-700 text-white" : "bg-neutral-200 text-neutral-600"
                }`}
              >
                <BrandClockIcon size={16} />
              </div>
              <div>
                <span className="font-bold text-xs text-primary block">{t("form.requestTitle")}</span>
                <span className="text-[10px] text-neutral-600 leading-snug block">{t("form.requestDesc")}</span>
              </div>
            </button>
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t border-tertiary/40">
          {!canEdit && (
            <span id={ids.readOnlyNote} className="me-auto self-center text-xs text-neutral-600">
              {t("form.readOnly")}
            </span>
          )}
          <button
            type="submit"
            disabled={isSaving || !canEdit}
            aria-busy={isSaving || undefined}
            className={`px-6 py-2.5 bg-primary text-white rounded-xl text-xs font-bold hover:bg-primary/90 transition shadow-2xs disabled:opacity-50 ${FOCUS_RING}`}
          >
            {isSaving ? t("form.saving") : t("form.save")}
          </button>
        </div>
      </form>

      {/* Danger Zone (owner only) */}
      {canDelete && (
        <section
          aria-labelledby={`${baseId}-danger-title`}
          className="bg-rose-50/50 rounded-3xl border border-rose-200 p-6 sm:p-8"
        >
          <div className="flex items-start gap-3 mb-4">
            <div aria-hidden="true" className="p-2 rounded-xl bg-rose-100 text-rose-700 shrink-0 mt-0.5">
              <BrandExclamationIcon size={20} />
            </div>
            <div>
              <h2 id={`${baseId}-danger-title`} className="font-serif font-bold text-rose-900 text-base">
                {t("dangerZone")}
              </h2>
              <p className="text-xs text-rose-700 mt-1 leading-relaxed">
                {t("danger.description", { name: org.name })}
              </p>
            </div>
          </div>

          <button
            type="button"
            aria-haspopup="dialog"
            onClick={() => setIsDeleteModalOpen(true)}
            className={`px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition shadow-2xs ${FOCUS_RING}`}
          >
            {t("disbandAgency")}
          </button>
        </section>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isDeleteModalOpen}
        variant="destructive"
        title={t("danger.confirmTitle")}
        message={t("danger.confirmMessage")}
        callout={
          <label htmlFor={ids.deleteInput}>
            {t.rich("danger.confirmPrompt", {
              name: org.name,
              strong: (chunks) => <strong className="text-primary font-bold">{chunks}</strong>,
            })}
          </label>
        }
        confirmLabel={t("danger.confirmButton")}
        cancelLabel={t("danger.cancelButton")}
        disabled={deleteConfirmInput !== org.name}
        isLoading={isDeleting}
        onConfirm={handleDelete}
        onCancel={() => {
          setIsDeleteModalOpen(false);
          setDeleteConfirmInput("");
        }}
      >
        <input
          id={ids.deleteInput}
          type="text"
          autoComplete="off"
          value={deleteConfirmInput}
          onChange={(e) => setDeleteConfirmInput(e.target.value)}
          placeholder={org.name}
          className="w-full px-3.5 py-2.5 bg-neutral-50 border border-tertiary/80 rounded-2xl text-xs text-primary focus:outline-none focus:border-rose-600 focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2 font-semibold"
        />
      </ConfirmDialog>
    </div>
  );
}
