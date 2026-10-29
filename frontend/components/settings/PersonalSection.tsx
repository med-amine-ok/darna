"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "react-toastify";
import { useRouter } from "@/navigation";
import { User } from "@/types";
import { BrandShieldIcon } from "@/components/icons";
import { updateProfileAction } from "@/app/actions/account";
import { useActionError } from "@/hook/useActionError";
import { INPUT_CLASS, LINK_BUTTON_CLASS, PRIMARY_BUTTON_CLASS, SectionHeader } from "./settingsUi";

type FieldKey = "legalName" | "preferredName" | "email" | "phone" | "resAddress" | "mailingAddress";

const maskEmail = (val: string) => {
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
    <div className="py-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="text-xs font-semibold text-neutral-600">{label}</div>
          <div className={`text-sm mt-0.5 ${isEmpty ? "text-neutral-500" : "font-medium text-primary"}`}>{display}</div>
        </div>
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={editing}
          aria-controls={editing ? panelId : undefined}
          aria-label={editing ? t("cancelEditing", { field: label }) : t("editField", { field: label })}
          className={LINK_BUTTON_CLASS}
        >
          {editing ? t("cancel") : isEmpty ? t("add") : t("edit")}
        </button>
      </div>
      {editing && (
        <form
          id={panelId}
          onSubmit={(e) => {
            e.preventDefault();
            onSave();
          }}
          className="mt-3 p-4 bg-neutral-50 rounded-2xl border border-tertiary/50 space-y-3"
        >
          <label htmlFor={inputId} className="sr-only">
            {label}
          </label>
          <input
            id={inputId}
            type={type}
            value={value}
            autoComplete={autoComplete}
            placeholder={placeholder}
            onChange={(e) => onChange(e.target.value)}
            className={INPUT_CLASS}
          />
          <button type="submit" disabled={saving} className={PRIMARY_BUTTON_CLASS}>
            {saveLabel || t("save")}
          </button>
        </form>
      )}
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

      <div className="divide-y divide-tertiary/40">
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
            <div>
              <div className="text-xs font-semibold text-neutral-600">{t("personal.identity")}</div>
              <div className="text-sm font-semibold text-emerald-700 mt-0.5 flex items-center gap-1.5">
                <BrandShieldIcon size={16} aria-hidden="true" />
                <span>{t("personal.identityVerified")}</span>
              </div>
            </div>
            <span className="text-xs font-semibold text-neutral-600">{t("personal.completed")}</span>
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
      </div>
    </section>
  );
}
