"use client";

import React, { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "react-toastify";
import {
  disconnectAccountAction,
  listConnectedAccountsAction,
  type ConnectedAccount,
} from "@/app/actions/account";
import { useActionError } from "@/hook/useActionError";
import { formatDate } from "@/lib/i18n/date-locale";
import Button from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Banner } from "@/components/ui/Feedback";
import { BrandGoogleIcon } from "@/components/icons";
import { SettingsCard } from "./settingsUi";

/**
 * Settings, Security: how this account signs in (ACC-10). Shows whether
 * Google is connected, lets the person disconnect it (refused while it is
 * their only way in) or connect it by signing in with Google once.
 */
export default function SignInMethodsCard({ email }: { email: string }) {
  const t = useTranslations("settings");
  const locale = useLocale();
  const errorText = useActionError();
  const [accounts, setAccounts] = useState<ConnectedAccount[] | null>(null);
  const [hasPassword, setHasPassword] = useState(true);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    listConnectedAccountsAction()
      .then((result) => {
        if (!alive) return;
        if (result.ok) {
          setAccounts(result.data.accounts);
          setHasPassword(result.data.hasPassword);
        } else {
          setFailed(true);
        }
      })
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, []);

  const google = accounts?.find((a) => a.provider === "google") ?? null;

  const connect = () => {
    const back = `/${locale}/settings`;
    window.location.assign(`/api/auth/google/start?${new URLSearchParams({ locale, callbackUrl: back }).toString()}`);
  };

  const disconnect = async () => {
    if (!google) return;
    setBusy(true);
    setError(null);
    const result = await disconnectAccountAction(google.id);
    setBusy(false);
    if (!result.ok) {
      setError(errorText(result));
      return;
    }
    setAccounts((rows) => (rows ?? []).filter((row) => row.id !== google.id));
    toast.success(t("signInMethods.disconnected"));
  };

  return (
    <SettingsCard title={t("signInMethods.title")} titleId="settings-sign-in-methods-title">
      {failed ? (
        <Banner tone="warning">{t("signInMethods.loadError")}</Banner>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <BrandGoogleIcon size={22} aria-hidden="true" />
              <div>
                <p className="text-body font-semibold text-primary-900">{t("signInMethods.google")}</p>
                <p className="text-meta text-primary-600">
                  {accounts === null
                    ? "…"
                    : google
                      ? `${t("signInMethods.connectedAs", { email: google.email })} · ${t("signInMethods.since", {
                          date: formatDate(google.createdAt, locale, { day: "numeric", month: "long", year: "numeric" }),
                        })}`
                      : t("signInMethods.notConnected")}
                </p>
              </div>
            </div>
            {accounts !== null &&
              (google ? (
                <Button type="button" variant="tertiary" size="sm" loading={busy} onClick={disconnect}>
                  {t("signInMethods.disconnect")}
                </Button>
              ) : (
                <Button type="button" variant="secondary" size="sm" onClick={connect}>
                  {t("signInMethods.connect")}
                </Button>
              ))}
          </div>
          {accounts !== null && !google && <p className="text-meta text-primary-500">{t("signInMethods.connectHint", { email })}</p>}
          <div className="flex items-center justify-between gap-3 border-t border-primary/[0.08] pt-3">
            <p className="text-body text-primary-800">{t("signInMethods.password")}</p>
            <Badge tone={hasPassword ? "success" : "neutral"}>
              {hasPassword ? t("signInMethods.passwordSet") : t("signInMethods.passwordNotSet")}
            </Badge>
          </div>
          {error && (
            <p role="alert" className="text-meta font-medium text-accent-700">
              {error}
            </p>
          )}
        </div>
      )}
    </SettingsCard>
  );
}
