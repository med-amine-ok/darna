"use client";

import { orgProfileHref } from "@/lib/host-profile";
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
import { Badge, Button, Card, Input, RadioGroup, Select, Textarea, cn, focusRing } from "@/components/ui";
import HostWalletWidget from "@/components/host/HostWalletWidget";
import { useActionError } from "@/hook/useActionError";

interface AgencySettingsClientProps {
  organization: Organization;
  currentUser?: User | null;
  /** Role of the viewer in this organization (drives what they may edit). */
  currentRole?: MembershipRole | null;
}

type TeamSize = NonNullable<Organization["teamSizeEstimate"]>;

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
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      <Link
        href="/host"
        className={cn(
          "mb-6 inline-flex min-h-[44px] items-center gap-1.5 rounded-full text-meta font-semibold text-primary-600 transition-colors duration-fast ease-standard hover:text-primary-900",
          focusRing
        )}
      >
        <BrandArrowLeftIcon size={16} className="rtl:rotate-180" aria-hidden="true" />
        <span>{t("backToHost")}</span>
      </Link>

      <header className="enter-up mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-eyebrow uppercase text-secondary-700">{org.name}</p>
          <h1 className="mt-2 font-serif text-display-md text-primary-900">{t("title")}</h1>
          <p className="mt-2 max-w-2xl text-body text-primary-600 [text-wrap:pretty]">{t("subtitle")}</p>
        </div>
        <Link
          href={orgProfileHref(org)}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            "inline-flex h-11 shrink-0 items-center gap-2 self-start rounded-full bg-white px-5 text-meta font-semibold text-primary-800 shadow-e1 transition-shadow duration-fast ease-standard hover:shadow-e2 sm:self-auto",
            focusRing
          )}
        >
          <BrandExternalLinkIcon size={16} aria-hidden="true" />
          <span>{t("viewPublicProfile")}</span>
          <span className="sr-only">{t("opensInNewTab")}</span>
        </Link>
      </header>

      {/* Verification */}
      <Card padding="md" radius="3xl" className="mb-8 flex items-center gap-4">
        <span aria-hidden="true" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-secondary-100 text-secondary-800">
          <BrandBadgeCheckIcon size={24} />
        </span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-title text-primary-900">{t("verification.label")}</h2>
            {org.verificationStatus === "verified" ? (
              <Badge tone="success" dot>
                {t("verification.verified")}
              </Badge>
            ) : (
              <Badge tone="warning" dot>
                {t("verificationPending")}
              </Badge>
            )}
          </div>
          <p className="mt-0.5 text-meta text-primary-600">{t("verification.description")}</p>
        </div>
      </Card>

      <HostWalletWidget className="mb-8" />

      {/* Profile form */}
      <Card
        as="section"
        padding="lg"
        radius="3xl"
        className="mb-8"
        aria-labelledby={`${baseId}-form-title`}
      >
        <form onSubmit={handleSave} aria-describedby={!canEdit ? ids.readOnlyNote : undefined} className="space-y-5">
          <h2 id={`${baseId}-form-title`} className="font-serif text-heading text-primary-900">
            {t("form.title")}
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input id={ids.name} label={t("form.name")} value={name} onChange={(e) => setName(e.target.value)} required />
            <Input
              id={ids.rc}
              label={t("form.rcNumber")}
              dir="ltr"
              value={rcNumber}
              onChange={(e) => setRcNumber(e.target.value)}
              required
              className="tabular-nums"
            />
            <Input
              id={ids.email}
              type="email"
              dir="ltr"
              autoComplete="email"
              label={t("form.email")}
              value={businessEmail}
              onChange={(e) => setBusinessEmail(e.target.value)}
              prefix={<BrandMailIcon size={16} aria-hidden="true" />}
              required
            />
            <Input
              id={ids.phone}
              type="tel"
              dir="ltr"
              autoComplete="tel"
              label={t("form.phone")}
              value={businessPhone}
              onChange={(e) => setBusinessPhone(e.target.value)}
              prefix={<BrandPhoneIcon size={16} aria-hidden="true" />}
              required
              className="tabular-nums"
            />
            <Input
              id={ids.address}
              autoComplete="street-address"
              label={t("form.address")}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              prefix={<BrandPinIcon size={16} aria-hidden="true" />}
            />
            <Select id={ids.teamSize} label={t("form.teamSize")} value={teamSize} onChange={(e) => setTeamSize(e.target.value as TeamSize)}>
              <option value="1">{t("form.teamSize1")}</option>
              <option value="2-10">{t("form.teamSizeRange", { min: 2, max: 10 })}</option>
              <option value="11-50">{t("form.teamSizeRange", { min: 11, max: 50 })}</option>
              <option value="50+">{t("form.teamSizeOver", { min: 50 })}</option>
            </Select>
          </div>
          <Textarea id={ids.description} label={t("form.description")} rows={4} value={description} onChange={(e) => setDescription(e.target.value)} />

          <div className="border-t border-primary/[0.08] pt-5">
            <RadioGroup
              legend={t("form.approvalMode")}
              name={`${baseId}-approval`}
              value={bookingApprovalMode}
              onChange={(v) => setBookingApprovalMode(v as "instant" | "request")}
              appearance="card"
              orientation="horizontal"
              options={[
                {
                  value: "instant",
                  label: (
                    <span className="flex items-center gap-2">
                      <BrandLightningIcon size={16} aria-hidden="true" className="text-secondary-700" />
                      {t("form.instantTitle")}
                    </span>
                  ),
                  description: t("form.instantDesc"),
                },
                {
                  value: "request",
                  label: (
                    <span className="flex items-center gap-2">
                      <BrandClockIcon size={16} aria-hidden="true" className="text-amber-700" />
                      {t("form.requestTitle")}
                    </span>
                  ),
                  description: t("form.requestDesc"),
                },
              ]}
            />
          </div>

          <div className="flex flex-wrap items-center justify-end gap-3 border-t border-primary/[0.08] pt-5">
            {!canEdit && (
              <span id={ids.readOnlyNote} className="me-auto text-meta text-primary-600">
                {t("form.readOnly")}
              </span>
            )}
            <Button type="submit" variant="primary" size="md" loading={isSaving} disabled={!canEdit}>
              {isSaving ? t("form.saving") : t("form.save")}
            </Button>
          </div>
        </form>
      </Card>

      {/* Danger zone (owner only) */}
      {canDelete && (
        <section aria-labelledby={`${baseId}-danger-title`} className="rounded-3xl bg-accent-50 p-6 ring-1 ring-inset ring-accent-200 sm:p-8">
          <div className="mb-5 flex items-start gap-3">
            <span aria-hidden="true" className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-100 text-accent-700">
              <BrandExclamationIcon size={20} />
            </span>
            <div>
              <h2 id={`${baseId}-danger-title`} className="font-serif text-heading text-accent-900">
                {t("dangerZone")}
              </h2>
              <p className="mt-1 text-meta leading-relaxed text-accent-800">{t("danger.description", { name: org.name })}</p>
            </div>
          </div>
          <Button variant="destructive" size="md" aria-haspopup="dialog" onClick={() => setIsDeleteModalOpen(true)}>
            {t("disbandAgency")}
          </Button>
        </section>
      )}

      <ConfirmDialog
        isOpen={isDeleteModalOpen}
        variant="destructive"
        title={t("danger.confirmTitle")}
        message={t("danger.confirmMessage")}
        callout={
          <label htmlFor={ids.deleteInput}>
            {t.rich("danger.confirmPrompt", {
              name: org.name,
              strong: (chunks) => <strong className="font-semibold text-primary-900">{chunks}</strong>,
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
        <Input
          id={ids.deleteInput}
          label={org.name}
          hideLabel
          autoComplete="off"
          value={deleteConfirmInput}
          onChange={(e) => setDeleteConfirmInput(e.target.value)}
          containerClassName="mt-3"
        />
      </ConfirmDialog>
    </div>
  );
}
