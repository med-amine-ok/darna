"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "react-toastify";
import { changePasswordAction } from "@/app/actions/account";
import { MIN_PASSWORD_LENGTH } from "@/lib/auth/password-rules";
import type { ActionError } from "@/lib/action-result";
import { useActionError } from "@/hook/useActionError";
import { FOCUS_RING, INPUT_CLASS, PRIMARY_BUTTON_CLASS, SectionHeader } from "./settingsUi";

export default function SecuritySection({ onDeactivate }: { onDeactivate: () => void }) {
  const t = useTranslations("settings");
  const errorText = useActionError();

  const [currPass, setCurrPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    // Same checks as the server (changePasswordAction), so errors show instantly.
    const clientError: ActionError | null =
      !currPass || !newPass || !confirmPass
        ? { code: "PASSWORD_FIELDS_REQUIRED" }
        : newPass !== confirmPass
          ? { code: "PASSWORD_MISMATCH" }
          : newPass.length < MIN_PASSWORD_LENGTH
            ? { code: "PASSWORD_TOO_SHORT", params: { min: MIN_PASSWORD_LENGTH } }
            : newPass === currPass
              ? { code: "PASSWORD_SAME_AS_CURRENT" }
              : null;
    if (clientError) {
      setError(errorText(clientError));
      return;
    }
    setError(null);
    setIsChangingPassword(true);
    try {
      const result = await changePasswordAction({
        currentPassword: currPass,
        newPassword: newPass,
        confirmPassword: confirmPass,
      });
      if (!result.ok) {
        setError(errorText(result));
        return;
      }
      toast.success(t("security.passwordChanged"));
      setCurrPass("");
      setNewPass("");
      setConfirmPass("");
    } catch {
      setError(t("security.errors.failed"));
    } finally {
      setIsChangingPassword(false);
    }
  };

  const describedBy = error ? "settings-password-error" : undefined;
  const fields = [
    { id: "settings-current-password", label: t("security.currentPassword"), value: currPass, set: setCurrPass, auto: "current-password" },
    { id: "settings-new-password", label: t("security.newPassword"), value: newPass, set: setNewPass, auto: "new-password" },
    { id: "settings-confirm-password", label: t("security.confirmPassword"), value: confirmPass, set: setConfirmPass, auto: "new-password" },
  ];

  return (
    <section aria-labelledby="settings-security-title" className="space-y-6">
      <SectionHeader
        id="settings-security-title"
        title={t("security.title")}
        description={t("security.description")}
      />

      <form
        onSubmit={handleChangePassword}
        noValidate
        aria-labelledby="settings-change-password-title"
        className="p-5 bg-neutral-50 rounded-2xl border border-tertiary/60 space-y-3"
      >
        <h3 id="settings-change-password-title" className="font-bold text-primary text-sm">
          {t("security.changePassword")}
        </h3>
        {error && (
          <p
            id="settings-password-error"
            role="alert"
            className="rounded-xl border border-status-error/30 bg-status-error/5 px-3 py-2 text-xs text-status-error"
          >
            {error}
          </p>
        )}
        <div className="space-y-2">
          {fields.map((f) => (
            <div key={f.id}>
              <label htmlFor={f.id} className="block text-xs font-semibold text-neutral-700 mb-1">
                {f.label}
              </label>
              <input
                id={f.id}
                type="password"
                autoComplete={f.auto}
                value={f.value}
                onChange={(e) => f.set(e.target.value)}
                aria-invalid={error ? true : undefined}
                aria-describedby={describedBy}
                className={INPUT_CLASS}
              />
            </div>
          ))}
        </div>
        <button type="submit" disabled={isChangingPassword} aria-busy={isChangingPassword} className={PRIMARY_BUTTON_CLASS}>
          {isChangingPassword ? t("security.updating") : t("security.updatePassword")}
        </button>
      </form>

      <div className="space-y-3">
        <h3 className="font-bold text-primary text-sm">{t("security.sessionsTitle")}</h3>
        <ul className="space-y-2">
          <li className="p-3.5 bg-white rounded-2xl border border-tertiary/60 flex items-center justify-between text-xs">
            <div>
              <div className="font-semibold text-primary">{t("security.thisBrowser")}</div>
              <div className="text-neutral-600 mt-0.5">{t("security.activeNow")}</div>
            </div>
            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full font-bold">
              {t("security.thisDevice")}
            </span>
          </li>
          <li className="p-3.5 bg-neutral-50 rounded-2xl border border-dashed border-tertiary/60 flex items-center justify-between text-xs">
            <div className="text-neutral-600">{t("security.otherDevicesSoon")}</div>
            <span className="px-2 py-0.5 bg-neutral-200 text-neutral-700 rounded-full font-bold shrink-0 ms-3">
              {t("comingSoon")}
            </span>
          </li>
        </ul>
      </div>

      <div className="pt-4 border-t border-tertiary/50 flex items-center justify-between gap-4">
        <div>
          <div className="font-bold text-primary text-sm">{t("security.deactivateTitle")}</div>
          <div className="text-xs text-neutral-600">{t("security.deactivateDescription")}</div>
        </div>
        <button
          type="button"
          onClick={onDeactivate}
          aria-haspopup="dialog"
          className={`px-4 py-2 text-rose-700 border border-rose-200 rounded-xl text-xs font-semibold hover:bg-rose-50 transition ${FOCUS_RING}`}
        >
          {t("security.deactivate")}
        </button>
      </div>
    </section>
  );
}
