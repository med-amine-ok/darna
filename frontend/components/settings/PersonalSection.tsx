"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "react-toastify";
import { useRouter } from "@/navigation";
import { User } from "@/types";
import { AnimatePresence, m } from "framer-motion";
import { BrandShieldIcon } from "@/components/icons";
import { Input } from "@/components/ui/Field";
import Button from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { dur, ease } from "@/lib/motion";
import {
  requestPhoneCodeAction,
  resendEmailVerificationAction,
  updateProfileAction,
  verifyPhoneAction,
} from "@/app/actions/account";
import { useActionError } from "@/hook/useActionError";
import { LINK_BUTTON_CLASS, SectionHeader, SettingsCard, SettingsList } from "./settingsUi";

type FieldKey = "legalName" | "arabicName" | "email" | "phone" | "resAddress";

export const maskEmail = (val: string) => {
  const parts = val.split("@");
  if (parts.length !== 2) return val;
  const name = parts[0];
  const masked = name.length > 2 ? `${name[0]}***${name[name.length - 1]}` : `${name}***`;
  return `${masked}@${parts[1]}`;
};

interface EditableFieldProps {
  field: FieldKey;
  label: string;
  display: string;
  isEmpty?: boolean;
  editing: boolean;
  onToggle: () => void;
  value: string;
  onChange: (v: string) => void;
  onSave: () => void;
  saving?: boolean;
  type?: string;
  autoComplete?: string;
  placeholder?: string;
  saveLabel?: string;
}

function EditableField({
  field,
  label,
  display,
  isEmpty,
  editing,
  onToggle,
  value,
  onChange,
  onSave,
  saving,
  type = "text",
  autoComplete,
  placeholder,
  saveLabel,
}: EditableFieldProps) {
  const t = useTranslations("settings");
  const inputId = `settings-${field}`;
  const panelId = `settings-${field}-editor`;
  return (
    <div className="py-4 first:pt-0 last:pb-0">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="text-meta font-medium text-primary-600">{label}</div>
          <div className={`mt-0.5 break-words text-body ${isEmpty ? "text-primary-500" : "font-medium text-primary-900"}`}>
            {display}
          </div>
        </div>
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={editing}
          aria-controls={editing ? panelId : undefined}
          aria-label={editing ? t("cancelEditing", { field: label }) : t("editField", { field: label })}
          className={`${LINK_BUTTON_CLASS} shrink-0`}
        >
          {editing ? t("cancel") : isEmpty ? t("add") : t("edit")}
        </button>
      </div>
      <AnimatePresence initial={false}>
        {editing && (
          <m.div
            key="editor"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto", transition: { duration: dur.base, ease: ease.out } }}
            exit={{ opacity: 0, height: 0, transition: { duration: dur.fast, ease: ease.standard } }}
            className="-mx-1 overflow-hidden px-1"
          >
            <form
              id={panelId}
              onSubmit={(e) => {
                e.preventDefault();
                onSave();
              }}
              className="flex flex-col gap-3 pb-1 pt-4 sm:flex-row sm:items-start"
            >
              <Input
                id={inputId}
                label={label}
                type={type}
                value={value}
                autoComplete={autoComplete}
                placeholder={placeholder}
                onChange={(e) => onChange(e.target.value)}
                containerClassName="sm:flex-1"
              />
              <Button type="submit" variant="secondary" loading={saving} className="sm:mt-1">
                {saveLabel || t("save")}
              </Button>
            </form>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function PersonalSection({
  currentUser,
  phoneOtpRequired = true,
}: {
  currentUser?: User | null;
  /** False while phones need no SMS code: saving the number is enough. */
  phoneOtpRequired?: boolean;
}) {
  const t = useTranslations("settings");
  const errorText = useActionError();
  const router = useRouter();

  const [legalName, setLegalName] = useState(currentUser?.name || "");
  const [arabicName, setArabicName] = useState(currentUser?.fullNameAr || "");
  const email = currentUser?.email || "";
  const emailVerified = Boolean(currentUser?.emailVerified);
  const [phone, setPhone] = useState(currentUser?.phone || "");
  const phoneVerified = Boolean(currentUser?.phoneVerified);
  const [resAddress, setResAddress] = useState(currentUser?.address || "");
  const [editingField, setEditingField] = useState<FieldKey | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  /** Phone waiting for the SMS code (after "Send code"). */
  const [codeSentTo, setCodeSentTo] = useState<string | null>(null);
  const [phoneCode, setPhoneCode] = useState("");
  const [isVerifyingPhone, setIsVerifyingPhone] = useState(false);
  const [isResending, setIsResending] = useState(false);

  const toggle = (field: FieldKey) => setEditingField((cur) => (cur === field ? null : field));

  /** Persists a profile field on the server; only closes the editor on success. */
  const saveProfileField = async (
    patch: { name?: string; arabicName?: string; address?: string },
    successMessage: string
  ) => {
    setIsSavingProfile(true);
    try {
      const result = await updateProfileAction(patch);
      if (!result.ok) {
        toast.error(errorText(result));
        return;
      }
      setEditingField(null);
      toast.success(successMessage);
      router.refresh();
    } catch {
      toast.error(t("errors.saveFailed"));
    } finally {
      setIsSavingProfile(false);
    }
  };

  /** Stores the number (unverified) on the server, which texts a 6-digit code. */
  const sendPhoneCode = async () => {
    setIsSavingProfile(true);
    try {
      const result = await requestPhoneCodeAction(phone);
      if (!result.ok) {
        toast.error(errorText(result));
        return;
      }
      setPhone(result.data.phone);
      setEditingField(null);
      if (!phoneOtpRequired) {
        // Codes are switched off for now: the number is saved, no code to type.
        toast.success(t("personal.phoneSaved"));
        return;
      }
      setCodeSentTo(result.data.phone);
      setPhoneCode("");
      toast.success(t("personal.phoneCodeSent"));
    } catch {
      toast.error(t("errors.saveFailed"));
    } finally {
      setIsSavingProfile(false);
    }
  };

  const confirmPhoneCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsVerifyingPhone(true);
    try {
      const result = await verifyPhoneAction(phoneCode);
      if (!result.ok) {
        toast.error(errorText(result));
        return;
      }
      setCodeSentTo(null);
      toast.success(t("personal.phoneVerifiedToast"));
      router.refresh();
    } catch {
      toast.error(t("errors.saveFailed"));
    } finally {
      setIsVerifyingPhone(false);
    }
  };

  const resendEmail = async () => {
    setIsResending(true);
    try {
      const result = await resendEmailVerificationAction();
      if (!result.ok) toast.error(errorText(result));
      else toast.success(t("personal.emailLinkSent"));
    } catch {
      toast.error(t("errors.saveFailed"));
    } finally {
      setIsResending(false);
    }
  };

  const notProvided = t("personal.notProvided");
  const phoneShownVerified = phoneVerified && !codeSentTo;
  const phoneAwaitingCode = phoneOtpRequired && (Boolean(codeSentTo) || (Boolean(currentUser?.phone) && !phoneVerified));

  return (
    <section aria-labelledby="settings-personal-title" className="space-y-6">
      <SectionHeader
        id="settings-personal-title"
        title={t("personal.title")}
        description={t("personal.description")}
      />

      <SettingsCard>
      <SettingsList>
        <EditableField
          field="legalName"
          label={t("personal.legalName")}
          display={legalName || notProvided}
          isEmpty={!legalName}
          editing={editingField === "legalName"}
          onToggle={() => toggle("legalName")}
          value={legalName}
          onChange={setLegalName}
          autoComplete="name"
          saving={isSavingProfile}
          onSave={() => saveProfileField({ name: legalName }, t("personal.legalNameSaved"))}
        />

        <EditableField
          field="arabicName"
          label={t("personal.arabicName")}
          display={arabicName || notProvided}
          isEmpty={!arabicName}
          editing={editingField === "arabicName"}
          onToggle={() => toggle("arabicName")}
          value={arabicName}
          onChange={setArabicName}
          placeholder={t("personal.arabicNamePlaceholder")}
          saving={isSavingProfile}
          onSave={() => saveProfileField({ arabicName }, t("personal.arabicNameSaved"))}
        />

        <div className="py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="text-meta font-medium text-primary-600">{t("personal.email")}</div>
              <div className="mt-0.5 break-words text-body font-medium text-primary-900">
                {email ? maskEmail(email) : notProvided}
              </div>
              {email && (
                <div className="mt-1.5">
                  <Badge tone={emailVerified ? "success" : "warning"}>
                    {emailVerified ? t("personal.verified") : t("personal.notVerified")}
                  </Badge>
                </div>
              )}
            </div>
            {email && !emailVerified && (
              <Button type="button" variant="tertiary" size="sm" loading={isResending} onClick={resendEmail} className="shrink-0">
                {t("personal.resendLink")}
              </Button>
            )}
          </div>
          <p className="mt-2 text-meta text-primary-600">{t("personal.emailChangeSoon")}</p>
        </div>

        <EditableField
          field="phone"
          label={t("personal.phone")}
          display={phone || notProvided}
          isEmpty={!phone}
          editing={editingField === "phone"}
          onToggle={() => toggle("phone")}
          value={phone}
          onChange={setPhone}
          type="tel"
          autoComplete="tel"
          placeholder="+213551234567"
          saving={isSavingProfile}
          saveLabel={t("personal.sendCode")}
          onSave={sendPhoneCode}
        />
        {phone && (
          <div className="pb-4">
            <Badge tone={phoneShownVerified ? "success" : "warning"}>
              {phoneShownVerified ? t("personal.verified") : t("personal.notVerified")}
            </Badge>
            {phoneAwaitingCode && (
              <form onSubmit={confirmPhoneCode} className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-start">
                <Input
                  id="settings-phone-code"
                  label={t("personal.phoneCode")}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={phoneCode}
                  onChange={(e) => setPhoneCode(e.target.value)}
                  containerClassName="sm:flex-1"
                />
                <Button type="submit" variant="secondary" loading={isVerifyingPhone} className="sm:mt-1">
                  {t("personal.verifyPhone")}
                </Button>
              </form>
            )}
          </div>
        )}

        <div className="py-4">
          <div className="text-meta font-medium text-primary-600">{t("personal.identity")}</div>
          <div className="mt-1">
            {currentUser?.isIdentityVerified ? (
              <Badge tone="success" icon={<BrandShieldIcon size={14} aria-hidden="true" />}>
                {t("personal.identityPhoneVerified")}
              </Badge>
            ) : (
              <Badge tone="warning">{t("personal.identityPending")}</Badge>
            )}
          </div>
        </div>

        <EditableField
          field="resAddress"
          label={t("personal.residentialAddress")}
          display={resAddress || notProvided}
          isEmpty={!resAddress}
          editing={editingField === "resAddress"}
          onToggle={() => toggle("resAddress")}
          value={resAddress}
          onChange={setResAddress}
          autoComplete="street-address"
          saving={isSavingProfile}
          onSave={() => saveProfileField({ address: resAddress }, t("personal.residentialAddressSaved"))}
        />
      </SettingsList>
      </SettingsCard>
    </section>
  );
}
