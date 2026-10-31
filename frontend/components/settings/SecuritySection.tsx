"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "react-toastify";
import { changePasswordAction } from "@/app/actions/account";
import { MIN_PASSWORD_LENGTH } from "@/lib/auth/password-rules";
import type { ActionError } from "@/lib/action-result";
import { useActionError } from "@/hook/useActionError";
import { AnimatePresence, m } from "framer-motion";
import { Input } from "@/components/ui/Field";
import Button from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Banner } from "@/components/ui/Feedback";
import { dur, ease } from "@/lib/motion";
import { SectionHeader, SettingsCard, SettingsList } from "./settingsUi";

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

      <SettingsCard title={t("security.changePassword")} titleId="settings-change-password-title">
        <form
          onSubmit={handleChangePassword}
          noValidate
          aria-labelledby="settings-change-password-title"
          className="flex flex-col gap-4"
        >
          <AnimatePresence initial={false}>
            {error && (
              <m.div
                key="error"
                id="settings-password-error"
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0, transition: { duration: dur.base, ease: ease.out } }}
                exit={{ opacity: 0, transition: { duration: dur.fast } }}
              >
                <Banner tone="danger">{error}</Banner>
              </m.div>
            )}
          </AnimatePresence>
          <div className="grid gap-4 md:grid-cols-3">
            {fields.map((f) => (
              <Input
                key={f.id}
                id={f.id}
                type="password"
                label={f.label}
                autoComplete={f.auto}
                value={f.value}
                onChange={(e) => f.set(e.target.value)}
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? "settings-password-error" : undefined}
              />
            ))}
          </div>
          <div>
            <Button type="submit" variant="secondary" loading={isChangingPassword}>
              {isChangingPassword ? t("security.updating") : t("security.updatePassword")}
            </Button>
          </div>
        </form>
      </SettingsCard>

      <SettingsCard title={t("security.sessionsTitle")}>
        <SettingsList>
          <div className="flex items-center justify-between gap-4 pb-4">
            <div className="min-w-0">
              <div className="text-body font-medium text-primary-900">{t("security.thisBrowser")}</div>
              <div className="mt-0.5 flex items-center gap-1.5 text-meta text-primary-600">
                <span aria-hidden="true" className="h-2 w-2 rounded-full bg-secondary-600" />
                {t("security.activeNow")}
              </div>
            </div>
            <Badge tone="success">{t("security.thisDevice")}</Badge>
          </div>
          <div className="flex items-center justify-between gap-4 pt-4">
            <div className="text-meta text-primary-600">{t("security.otherDevicesSoon")}</div>
            <Badge tone="sand" className="shrink-0">
              {t("comingSoon")}
            </Badge>
          </div>
        </SettingsList>
      </SettingsCard>

      <SettingsCard>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-title font-semibold text-primary-900">{t("security.deactivateTitle")}</h3>
            <p className="mt-1 text-meta text-primary-600">{t("security.deactivateDescription")}</p>
          </div>
          <Button type="button" variant="tertiary" onClick={onDeactivate} aria-haspopup="dialog" className="shrink-0 text-accent-800">
            {t("security.deactivate")}
          </Button>
        </div>
      </SettingsCard>
    </section>
  );
}
