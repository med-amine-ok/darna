"use client";

import React, { useId, useState } from "react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { Copy, KeyRound, Lock, Mail, ShieldAlert, ShieldCheck, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { LocaleSwitcher } from "@/components/layout/LocaleSwitcher";
import {
  cancelLoginAction,
  enrolAuthenticatorAction,
  finishEnrolmentAction,
  loginAction,
  verifySecondFactorAction,
  type LoginError,
} from "@/lib/actions/auth";
import { imagery, withParams } from "@/lib/imagery";

type Step =
  | { kind: "password" }
  | { kind: "mfa" }
  | { kind: "enrol"; secret: string; totpUrl: string }
  | { kind: "recovery"; codes: string[]; returnTo: string };

function isRedirect(err: unknown): boolean {
  return Boolean(
    err &&
      typeof err === "object" &&
      "digest" in err &&
      String((err as { digest?: unknown }).digest).startsWith("NEXT_REDIRECT"),
  );
}

/** Secret grouped by 4 characters, easier to type into an authenticator app. */
function groupSecret(secret: string): string {
  return secret.replace(/\s+/g, "").replace(/(.{4})/g, "$1 ").trim();
}

export default function LoginForm({
  returnTo,
  expired = false,
}: {
  /** Already validated on the server (relative path only). */
  returnTo: string;
  /** The previous session ended (30 minutes idle, 8 hours, or revoked). */
  expired?: boolean;
}) {
  const locale = useLocale();
  const t = useTranslations("login");

  const [step, setStep] = useState<Step>({ kind: "password" });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const errorId = useId();
  const errorProps = error ? { "aria-invalid": true as const, "aria-describedby": errorId } : {};

  const showError = (res: LoginError) => {
    switch (res.error) {
      case "rateLimited":
        setError(t("errors.rateLimited", { seconds: res.retryAfterSecs }));
        break;
      case "invalidCredentials":
        setError(t("errors.invalidCredentials"));
        break;
      case "invalidCode":
        setError(t("errors.invalidCode"));
        break;
      case "expired":
        setError(t("errors.stepExpired"));
        setStep({ kind: "password" });
        setCode("");
        break;
      case "alreadyEnrolled":
        setError(t("errors.alreadyEnrolled"));
        setStep({ kind: "mfa" });
        setCode("");
        break;
      default:
        setError(t("errors.unexpected"));
    }
  };

  const handlePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    // Read the fields from the form itself: autofill does not always fire onChange.
    const form = new FormData(e.currentTarget as HTMLFormElement);
    const formData = new FormData();
    formData.set("email", String(form.get("email") ?? email).trim());
    formData.set("password", String(form.get("password") ?? password));
    formData.set("locale", locale);
    formData.set("returnTo", returnTo);
    try {
      // When no authenticator code is needed, the action signs in and redirects (it does not return).
      const res = await loginAction(formData);
      if ("step" in res) {
        setPassword("");
        setCode("");
        setStep(res.step === "mfa" ? { kind: "mfa" } : { kind: "enrol", secret: res.secret, totpUrl: res.totpUrl });
      } else {
        showError(res);
      }
    } catch {
      setError(t("errors.unexpected"));
    }
    setIsLoading(false);
  };

  const handleCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    const formData = new FormData();
    formData.set("code", code);
    formData.set("locale", locale);
    formData.set("returnTo", returnTo);
    try {
      if (step.kind === "enrol") {
        const res = await enrolAuthenticatorAction(formData);
        if ("step" in res) {
          setStep({ kind: "recovery", codes: res.recoveryCodes, returnTo: res.returnTo });
        } else {
          showError(res);
        }
      } else {
        // On success the action sets the session cookie and redirects server-side.
        const res = await verifySecondFactorAction(formData);
        if (res) showError(res);
      }
    } catch (err) {
      if (isRedirect(err)) throw err;
      setError(t("errors.unexpected"));
    }
    setIsLoading(false);
  };

  const backToPassword = async () => {
    setError(null);
    setCode("");
    setStep({ kind: "password" });
    try {
      await cancelLoginAction();
    } catch {
      /* the pending cookie expires by itself */
    }
  };

  const copyCodes = async (codes: string[]) => {
    try {
      await navigator.clipboard.writeText(codes.join("\n"));
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  const iconClass = "w-5 h-5 stroke-[1.75]";
  const heading =
    step.kind === "mfa"
      ? { icon: <ShieldCheck className={iconClass} aria-hidden="true" />, title: t("mfaTitle"), subtitle: t("mfaSubtitle") }
      : step.kind === "enrol"
        ? { icon: <Smartphone className={iconClass} aria-hidden="true" />, title: t("enrolTitle"), subtitle: t("enrolSubtitle") }
        : step.kind === "recovery"
          ? { icon: <KeyRound className={iconClass} aria-hidden="true" />, title: t("recoveryTitle"), subtitle: t("recoverySubtitle") }
          : { icon: <Lock className={iconClass} aria-hidden="true" />, title: t("title"), subtitle: t("subtitle") };

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
            src="/assets/logo-horizontal-white.png"
            alt="BLADUS"
            width={110}
            height={34}
            className="h-7 w-auto object-contain"
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
              className="h-7 w-auto object-contain"
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
                {heading.icon}
              </div>
              <h1 className="font-serif text-heading text-primary-900">{heading.title}</h1>
              <p className="text-meta text-primary-600 mt-1.5">{heading.subtitle}</p>
            </div>

            {expired && step.kind === "password" && !error && (
              <div
                role="status"
                className="mb-4 p-3 rounded-xl bg-darnaBg-100 ring-1 ring-inset ring-primary/10 text-xs text-primary-800"
              >
                {t("sessionExpired")}
              </div>
            )}

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

            {step.kind === "password" && (
              <form onSubmit={handlePassword} className="space-y-4" aria-busy={isLoading}>
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
            )}

            {step.kind === "enrol" && (
              <div className="space-y-3 mb-4 text-meta text-primary-700">
                <ol className="list-decimal ps-5 space-y-1.5">
                  <li>{t("enrolStep1")}</li>
                  <li>{t("enrolStep2")}</li>
                  <li>{t("enrolStep3")}</li>
                </ol>
                <div className="rounded-xl bg-darnaBg-100 p-3">
                  <p className="text-eyebrow uppercase font-semibold text-primary-500">{t("enrolSecretLabel")}</p>
                  <p className="mt-1 font-mono text-sm tracking-wider text-primary-900 break-all select-all" dir="ltr">
                    {groupSecret(step.secret)}
                  </p>
                  <a
                    href={step.totpUrl}
                    className="mt-2 inline-block text-xs font-semibold text-accent-700 underline underline-offset-2"
                  >
                    {t("enrolOpenApp")}
                  </a>
                </div>
              </div>
            )}

            {(step.kind === "mfa" || step.kind === "enrol") && (
              <form onSubmit={handleCode} className="space-y-4" aria-busy={isLoading}>
                <Input
                  label={step.kind === "mfa" ? t("codeLabel") : t("enrolCodeLabel")}
                  type="text"
                  name="code"
                  inputMode={step.kind === "enrol" ? "numeric" : "text"}
                  autoComplete="one-time-code"
                  autoFocus
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="123456"
                  maxLength={32}
                  required
                  dir="ltr"
                  helperText={step.kind === "mfa" ? t("codeHelp") : undefined}
                  {...errorProps}
                  leftIcon={<KeyRound className="w-4 h-4" aria-hidden="true" />}
                />
                <Button type="submit" variant="primary" size="lg" className="w-full mt-2" isLoading={isLoading}>
                  {step.kind === "mfa" ? t("verifyButton") : t("enrolButton")}
                </Button>
                <button
                  type="button"
                  onClick={backToPassword}
                  className="w-full text-xs font-semibold text-primary-600 hover:text-primary-900 min-h-[36px]"
                >
                  {t("backToPassword")}
                </button>
              </form>
            )}

            {step.kind === "recovery" && (
              <div className="space-y-4">
                <ul
                  className="grid grid-cols-2 gap-2 rounded-xl bg-darnaBg-100 p-3 font-mono text-sm text-primary-900"
                  dir="ltr"
                  aria-label={t("recoveryTitle")}
                >
                  {step.codes.map((c) => (
                    <li key={c} className="select-all">
                      {c}
                    </li>
                  ))}
                </ul>
                <p className="text-xs text-accent-800">{t("recoveryWarning")}</p>
                <Button
                  type="button"
                  variant="secondary"
                  className="w-full"
                  onClick={() => copyCodes(step.codes)}
                  leftIcon={<Copy className="w-4 h-4" aria-hidden="true" />}
                >
                  {copied ? t("recoveryCopied") : t("recoveryCopy")}
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  size="lg"
                  className="w-full"
                  onClick={async () => {
                    await finishEnrolmentAction();
                    window.location.assign(step.returnTo);
                  }}
                >
                  {t("recoveryContinue")}
                </Button>
              </div>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-primary-500">{t("footerText")}</p>
      </div>
    </div>
  );
}
