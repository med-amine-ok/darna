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
import { updateProfileAction } from "@/app/actions/account";
import { useActionError } from "@/hook/useActionError";
import { LINK_BUTTON_CLASS, SectionHeader, SettingsCard, SettingsList } from "./settingsUi";

type FieldKey = "legalName" | "preferredName" | "email" | "phone" | "resAddress" | "mailingAddress";

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

export default function PersonalSection({ currentUser }: { currentUser?: User | null }) {
  const t = useTranslations("settings");
  const errorText = useActionError();
  const router = useRouter();

  const [legalName, setLegalName] = useState(currentUser?.name || "");
  const [preferredName, setPreferredName] = useState("");
  const [email, setEmail] = useState(currentUser?.email || "");
  const [phone, setPhone] = useState(currentUser?.phone || "");
  const [resAddress, setResAddress] = useState(currentUser?.address || "");
  const [mailingAddress, setMailingAddress] = useState("");
  const [editingField, setEditingField] = useState<FieldKey | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  const toggle = (field: FieldKey) => setEditingField((cur) => (cur === field ? null : field));

  /** Persists a profile field on the server; only closes the editor on success. */
  const saveProfileField = async (
    patch: { name?: string; phone?: string; address?: string },
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

  const notProvided = t("personal.notProvided");

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
          field="preferredName"
          label={t("personal.preferredName")}
          display={preferredName || notProvided}
          isEmpty={!preferredName}
          editing={editingField === "preferredName"}
          onToggle={() => toggle("preferredName")}
          value={preferredName}
          onChange={setPreferredName}
          autoComplete="given-name"
          placeholder={t("personal.preferredNamePlaceholder")}
          onSave={() => {
            setEditingField(null);
            toast.success(t("personal.preferredNameSaved"));
          }}
        />

        <EditableField
          field="email"
          label={t("personal.email")}
          display={maskEmail(email)}
          editing={editingField === "email"}
          onToggle={() => toggle("email")}
          value={email}
          onChange={setEmail}
          type="email"
          autoComplete="email"
          saveLabel={t("personal.saveAndVerify")}
          onSave={() => {
            // Email changes need a verification flow the mock backend doesn't have yet.
            setEmail(currentUser?.email || "");
            setEditingField(null);
            toast.info(t("personal.emailChangeSoon"));
          }}
        />

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
          saving={isSavingProfile}
          onSave={() => saveProfileField({ phone }, t("personal.phoneSaved"))}
        />

        <div className="py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="text-meta font-medium text-primary-600">{t("personal.identity")}</div>
              <div className="mt-1">
                <Badge tone="success" icon={<BrandShieldIcon size={14} aria-hidden="true" />}>
                  {t("personal.identityVerified")}
                </Badge>
              </div>
            </div>
            <span className="text-meta font-medium text-primary-600">{t("personal.completed")}</span>
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

        <EditableField
          field="mailingAddress"
          label={t("personal.mailingAddress")}
          display={mailingAddress || notProvided}
          isEmpty={!mailingAddress}
          editing={editingField === "mailingAddress"}
          onToggle={() => toggle("mailingAddress")}
          value={mailingAddress}
          onChange={setMailingAddress}
          placeholder={t("personal.mailingAddressPlaceholder")}
          onSave={() => {
            setEditingField(null);
            toast.success(t("personal.mailingAddressSaved"));
          }}
        />
      </SettingsList>
      </SettingsCard>
    </section>
  );
}
