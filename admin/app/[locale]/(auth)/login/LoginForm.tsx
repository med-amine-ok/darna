"use client";

import React, { useId, useState } from "react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { Lock, Mail, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { LocaleSwitcher } from "@/components/layout/LocaleSwitcher";
import { loginAction, getDemoCredentials } from "@/lib/actions/auth";
import type { AdminRole } from "@/lib/types";

export interface DemoAccount {
  email: string;
  role: AdminRole;
}

export default function LoginForm({
  returnTo,
  demoAccounts,
}: {
  /** Already validated on the server (relative path only). */
  returnTo: string;
  /** Non-empty only in development. */
  demoAccounts: DemoAccount[];
}) {
  const locale = useLocale();
  const t = useTranslations("login");
  const tRoles = useTranslations("roles");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const errorId = useId();
  const errorProps = error
    ? { "aria-invalid": true as const, "aria-describedby": errorId }
    : {};

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    const formData = new FormData();
    formData.set("email", email);
    formData.set("password", password);
    formData.set("locale", locale);
    formData.set("returnTo", returnTo);

    try {
      // On success the action sets the httpOnly cookie and redirects
      // server-side to the validated returnTo, so it only returns on failure.
      const res = await loginAction(formData);
      if (res?.error === "rateLimited") {
        setError(t("errors.rateLimited", { seconds: res.retryAfterSecs }));
      } else if (res?.error === "invalidCredentials") {
        setError(t("errors.invalidCredentials"));
      } else if (res?.error) {
        setError(t("errors.unexpected"));
      }
      setIsLoading(false);
    } catch (err) {
      // redirect() surfaces as a thrown control-flow error in some versions; let it through.
      if (err && typeof err === "object" && "digest" in err && String((err as { digest?: unknown }).digest).startsWith("NEXT_REDIRECT")) {
        throw err;
      }
      setError(t("errors.unexpected"));
      setIsLoading(false);
    }
  };

  // Development only (demoAccounts is empty in production builds).
  const fillQuickAccount = async (accountEmail: string) => {
    setError(null);
    const creds = await getDemoCredentials(accountEmail);
    if (creds) {
      setEmail(creds.email);
      setPassword(creds.password);
    }
  };

  return (
    <div className="min-h-screen bg-darnaBg flex flex-col justify-between p-4 sm:p-6 lg:p-8">
      {/* Top Header */}
      <div className="flex items-center justify-between max-w-5xl w-full mx-auto">
        <div className="flex items-center gap-2">
          <Image
            src="/assets/logo-horizontal.png"
            alt="DARNA"
            width={110}
            height={34}
            className="h-7 w-auto object-contain brightness-0"
          />
          <span className="px-2 py-0.5 bg-accent-600 text-white rounded-md text-[9px] font-bold uppercase tracking-wider">
            {t("adminBadge")}
          </span>
        </div>
        <LocaleSwitcher />
      </div>

      {/* Main Login Card */}
      <div className="max-w-md w-full mx-auto my-8">
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-tertiary/80 shadow-darna-modal text-start animate-in fade-in zoom-in-95">
          <div className="text-center pb-6 border-b border-neutral-100">
            <div className="w-12 h-12 rounded-2xl bg-primary text-white flex items-center justify-center mx-auto mb-3 shadow-xs">
              <Lock className="w-6 h-6 stroke-[1.8]" aria-hidden="true" />
            </div>
            <h1 className="text-xl sm:text-2xl font-serif font-black text-primary">
              {t("title")}
            </h1>
            <p className="text-xs text-neutral-500 mt-1">
              {t("subtitle")}
            </p>
          </div>

          {/* Live region stays mounted so screen readers announce each new error. */}
          <div role="alert" aria-live="assertive" aria-atomic="true">
            {error && (
              <div className="mt-4 p-3 rounded-xl bg-accent/10 border border-accent/30 text-xs text-accent-700 flex items-start gap-2.5">
                <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                <p id={errorId} className="leading-snug">
                  {error}
                </p>
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} className="mt-5 space-y-4" aria-busy={isLoading}>
            <Input
              label={t("emailLabel")}
              type="email"
              name="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@darna.dz"
              required
              {...errorProps}
              leftIcon={<Mail className="w-4 h-4" aria-hidden="true" />}
            />

            <Input
              label={t("passwordLabel")}
              type="password"
              name="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              required
              {...errorProps}
              leftIcon={<Lock className="w-4 h-4" aria-hidden="true" />}
            />

            <Button
              type="submit"
              variant="primary"
              size="md"
              className="w-full mt-2"
              isLoading={isLoading}
            >
              {t("submitButton")}
            </Button>
          </form>

          {/* Quick Demo Pre-fills (development only) */}
          {demoAccounts.length > 0 && (
            <div className="mt-6 pt-5 border-t border-neutral-100">
              <span id={`${errorId}-demo`} className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 block mb-2">
                {t("demoSeeds")}
              </span>
              <div className="grid grid-cols-3 gap-2" role="group" aria-labelledby={`${errorId}-demo`}>
                {demoAccounts.map((acc) => (
                  <button
                    key={acc.email}
                    type="button"
                    onClick={() => fillQuickAccount(acc.email)}
                    aria-label={t("demoFillLabel", { role: tRoles(acc.role), email: acc.email })}
                    className="px-2 py-1.5 rounded-xl border border-tertiary/70 text-[11px] font-bold text-primary hover:bg-darnaBg/80 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2"
                  >
                    {tRoles(acc.role)}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="text-center text-xs text-neutral-500">
        {t("footerText")}
      </div>
    </div>
  );
}
