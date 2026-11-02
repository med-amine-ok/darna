"use client";

import React, { useId, useState } from "react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { Lock, Mail, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { LocaleSwitcher } from "@/components/layout/LocaleSwitcher";
import { loginAction, getDemoCredentials } from "@/lib/actions/auth";
import { imagery, withParams } from "@/lib/imagery";
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

    // Read the fields from the form itself: browser/password-manager autofill fills the
    // inputs without always firing onChange, so React state can be empty or stale.
    const form = new FormData(e.currentTarget as HTMLFormElement);
    const formData = new FormData();
    formData.set("email", String(form.get("email") ?? email).trim());
    formData.set("password", String(form.get("password") ?? password));
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
    <div className="min-h-[100dvh] bg-darnaBg grid lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
      {/* Brand panel (the only textured surface in the back office): rosette texture + arch-masked Algeria */}
      <aside
        aria-label={t("panelImagesAlt")}
        className="relative hidden lg:flex flex-col justify-between overflow-hidden bg-primary-800 text-white p-10 xl:p-14"
      >
        <div aria-hidden="true" className="absolute inset-0 texture-zellige opacity-[0.35] invert" />
        <div aria-hidden="true" className="absolute inset-0 texture-grain opacity-60" />

        <div className="relative flex items-center gap-2.5 enter-up">
          <Image
            src="/assets/logo-horizontal.png"
            alt="BLADUS"
            width={110}
            height={34}
            className="h-7 w-auto object-contain brightness-0 invert"
          />
          <span className="px-2 py-0.5 rounded-md bg-white/10 ring-1 ring-inset ring-white/15 text-[11px] font-semibold tracking-wide">
            {t("adminBadge")}
          </span>
        </div>

        <div className="relative flex items-end justify-center gap-4 xl:gap-5 my-10">
          {[
            { src: imagery.ghardaia, w: "w-[30%]", h: "aspect-[4/5]", delay: "120ms" },
            { src: imagery.tassiliArch, w: "w-[38%]", h: "aspect-[4/5.6]", delay: "0ms" },
            { src: imagery.algiersBay, w: "w-[30%]", h: "aspect-[4/5]", delay: "220ms" },
          ].map((img, i) => (
            <div
              key={img.src}
              className={`relative ${img.w} ${img.h} mask-arch bg-tertiary-200 enter-rise ${i === 1 ? "mb-10" : ""}`}
              style={{ animationDelay: img.delay }}
            >
              <Image
                src={withParams(img.src)}
                alt=""
                fill
                sizes="(min-width: 1280px) 18vw, 22vw"
                priority={i === 1}
                className="object-cover"
              />
            </div>
          ))}
        </div>

        <div className="relative max-w-md enter-up" style={{ animationDelay: "160ms" }}>
          <p className="flex items-center gap-3 text-eyebrow uppercase font-semibold text-tertiary-200/90">
            <span aria-hidden="true" className="h-px w-8 bg-tertiary-200/50" />
            {t("panelEyebrow")}
          </p>
          <p className="mt-3 font-serif text-display-md text-white text-balance">{t("panelTitle")}</p>
        </div>
      </aside>

      {/* Sign-in column */}
      <div className="flex flex-col justify-between p-4 sm:p-6 lg:p-10 texture-grain">
        <div className="flex items-center justify-between w-full max-w-md mx-auto lg:max-w-none">
          <div className="flex items-center gap-2 lg:invisible">
            <Image
              src="/assets/logo-horizontal.png"
              alt="BLADUS"
              width={110}
              height={34}
              className="h-7 w-auto object-contain brightness-0"
            />
            <span className="px-2 py-0.5 bg-accent-600 text-white rounded-md text-[11px] font-semibold">
              {t("adminBadge")}
            </span>
          </div>
          <LocaleSwitcher />
        </div>

        <div className="max-w-[400px] w-full mx-auto my-10">
          <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-e3 text-start enter-up">
            <div className="pb-6">
              <div className="w-11 h-11 rounded-xl bg-primary-800 text-white flex items-center justify-center mb-5 shadow-e1 shadow-highlight">
                <Lock className="w-5 h-5 stroke-[1.75]" aria-hidden="true" />
              </div>
              <h1 className="font-serif text-heading text-primary-900">{t("title")}</h1>
              <p className="text-meta text-primary-600 mt-1.5">{t("subtitle")}</p>
            </div>

            {/* Live region stays mounted so screen readers announce each new error. */}
            <div role="alert" aria-live="assertive" aria-atomic="true">
              {error && (
                <div className="mb-4 p-3 rounded-xl bg-accent-50 ring-1 ring-inset ring-accent-200 text-xs text-accent-800 flex items-start gap-2.5 animate-in fade-in slide-in-from-top-1">
                  <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                  <p id={errorId} className="leading-snug">
                    {error}
                  </p>
                </div>
              )}
            </div>

            <form onSubmit={handleSubmit} className="space-y-4" aria-busy={isLoading}>
              <Input
                label={t("emailLabel")}
                type="email"
                name="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@bladus.dz"
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

              <Button type="submit" variant="primary" size="lg" className="w-full mt-2" isLoading={isLoading}>
                {t("submitButton")}
              </Button>
            </form>

            {/* Quick demo pre-fills (development only) */}
            {demoAccounts.length > 0 && (
              <div className="mt-6 pt-5 border-t border-primary/[0.06]">
                <span id={`${errorId}-demo`} className="text-eyebrow uppercase font-semibold text-primary-500 block mb-2.5">
                  {t("demoSeeds")}
                </span>
                <div className="grid grid-cols-3 gap-2" role="group" aria-labelledby={`${errorId}-demo`}>
                  {demoAccounts.map((acc) => (
                    <button
                      key={acc.email}
                      type="button"
                      onClick={() => fillQuickAccount(acc.email)}
                      aria-label={t("demoFillLabel", { role: tRoles(acc.role), email: acc.email })}
                      className="px-2 min-h-[36px] rounded-xl bg-darnaBg-100 text-xs font-semibold text-primary-800 hover:bg-darnaBg-300/70 transition-colors duration-fast active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2"
                    >
                      {tRoles(acc.role)}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-primary-500">{t("footerText")}</p>
      </div>
    </div>
  );
}
