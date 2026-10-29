"use client";

import React, { useState } from "react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "react-toastify";
import Container from "@/components/Container";
import { Link } from "@/navigation";
import { useRegisterModal } from "@/hook/useRegisterModal";
import {
  BrandGoogleIcon,
  BrandAppleIcon,
  BrandEyeIcon,
  BrandEyeOffIcon,
  BrandPhoneIcon,
  BrandLockIcon,
  BrandMailIcon,
  BrandChevronLeftIcon,
} from "@/components/icons";
import { safeCallbackUrl } from "@/lib/auth/callback-url";
import { useActionError, type ActionErrorLike } from "@/hook/useActionError";

/** Seeded demo accounts (password documented in README.md). */
const DEMO_PASSWORD = "darna-demo-2026";

const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2";

const DEMO_ACCOUNTS = [
  { email: "yacine.traveler@darna.dz", key: "demoTraveler", name: "Yacine" },
  { email: "amina.benali@darna.dz", key: "demoHost", name: "Amina" },
  { email: "karim.mansouri@darna.dz", key: "demoAgency", name: "Karim" },
] as const;

class LoginError extends Error {
  constructor(public readonly body: ActionErrorLike) {
    super("LOGIN_FAILED");
  }
}

export default function LoginForm() {
  const t = useTranslations("auth");
  const errorText = useActionError();
  const locale = useLocale();
  const openRegister = useRegisterModal((s) => s.onOpen);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});

  /** Same-origin relative paths only; anything else goes to the locale home. */
  const redirectAfterLogin = () => {
    const raw =
      typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("callbackUrl") : null;
    window.location.assign(safeCallbackUrl(raw, locale));
  };

  const login = async (loginEmail: string, loginPassword: string) => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: loginEmail, password: loginPassword }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new LoginError(data);
    }
    return data as { user?: { name?: string } };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const nextFieldErrors: { email?: string; password?: string } = {};
    if (!email) nextFieldErrors.email = t("errors.emailRequired");
    if (!password) nextFieldErrors.password = t("errors.passwordRequired");
    setFieldErrors(nextFieldErrors);
    if (nextFieldErrors.email || nextFieldErrors.password) {
      setError(t("errors.missingFields"));
      return;
    }

    setError(null);
    setIsLoading(true);
    try {
      await login(email, password);
      toast.success(t("welcomeToast"));
      redirectAfterLogin();
    } catch (err) {
      setError(errorText(err instanceof LoginError ? err.body : null, t("errors.failed")));
      setIsLoading(false);
    }
  };

  const handleQuickDemo = async (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword(DEMO_PASSWORD);
    setFieldErrors({});
    setError(null);
    setIsLoading(true);

    try {
      const data = await login(demoEmail, DEMO_PASSWORD);
      toast.success(t("loggedInAs", { name: data.user?.name || demoEmail }));
      redirectAfterLogin();
    } catch {
      setError(t("errors.demo"));
      setIsLoading(false);
    }
  };

  const inputClass = (invalid: boolean) =>
    `w-full ps-10 py-2.5 bg-neutral-50 border rounded-xl text-sm text-primary placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition ${
      invalid ? "border-status-error" : "border-tertiary/70"
    }`;

  return (
    <div className="min-h-screen bg-bg-light/60 py-12 flex flex-col justify-center">
      <Container className="max-w-md w-full">
        <Link
          href="/"
          className={`inline-flex items-center gap-2 text-sm text-neutral-600 hover:text-primary mb-6 transition rounded ${FOCUS_RING}`}
        >
          <BrandChevronLeftIcon size={18} className="rtl:rotate-180" aria-hidden="true" />
          <span>{t("backHome")}</span>
        </Link>

        <div className="bg-white rounded-3xl p-8 sm:p-10 border border-tertiary shadow-xl">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <Image
                src="/assets/logo-horizontal.png"
                alt={t("logoAlt")}
                width={160}
                height={50}
                priority
                className="h-10 w-auto object-contain"
              />
            </div>
            <h1 className="text-2xl font-bold text-primary">{t("title")}</h1>
            <p className="text-sm text-neutral-600 mt-1.5">{t("subtitle")}</p>
          </div>

          {/* Quick Demo Logins */}
          <div
            role="group"
            aria-labelledby="demo-access-label"
            className="mb-6 p-3.5 bg-tertiary/20 rounded-2xl border border-tertiary/40"
          >
            <div id="demo-access-label" className="text-xs font-semibold text-primary mb-2 text-center">
              {t("demoTitle")}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {DEMO_ACCOUNTS.map((acc, i) => (
                <button
                  key={acc.email}
                  type="button"
                  disabled={isLoading}
                  onClick={() => handleQuickDemo(acc.email)}
                  className={`${
                    i === DEMO_ACCOUNTS.length - 1 ? "col-span-2 " : ""
                  }py-1.5 px-2 bg-white rounded-xl text-xs font-medium text-neutral-700 hover:bg-neutral-50 border border-tertiary/50 transition text-center disabled:opacity-50 ${FOCUS_RING}`}
                >
                  {t(acc.key, { name: acc.name })}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div
              role="alert"
              className="mb-4 rounded-xl border border-status-error/30 bg-status-error/5 px-3.5 py-2.5 text-sm text-status-error"
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <div>
              <label htmlFor="login-email" className="block text-xs font-semibold text-neutral-700 mb-1.5">
                {t("emailLabel")}
              </label>
              <div className="relative">
                <BrandMailIcon
                  size={18}
                  aria-hidden="true"
                  className="absolute start-3.5 top-1/2 -translate-y-1/2 text-neutral-400"
                />
                <input
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t("emailPlaceholder")}
                  required
                  aria-invalid={fieldErrors.email ? true : undefined}
                  aria-describedby={fieldErrors.email ? "login-email-error" : undefined}
                  className={`${inputClass(Boolean(fieldErrors.email))} pe-4`}
                />
              </div>
              {fieldErrors.email && (
                <p id="login-email-error" className="mt-1 text-xs text-status-error">
                  {fieldErrors.email}
                </p>
              )}
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label htmlFor="login-password" className="text-xs font-semibold text-neutral-700">
                  {t("passwordLabel")}
                </label>
                <button
                  type="button"
                  onClick={() => toast.info(t("forgotPasswordSoon"))}
                  className={`text-xs text-secondary hover:underline rounded ${FOCUS_RING}`}
                >
                  {t("forgotPassword")}
                </button>
              </div>
              <div className="relative">
                <BrandLockIcon
                  size={18}
                  aria-hidden="true"
                  className="absolute start-3.5 top-1/2 -translate-y-1/2 text-neutral-400"
                />
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  aria-invalid={fieldErrors.password ? true : undefined}
                  aria-describedby={fieldErrors.password ? "login-password-error" : undefined}
                  className={`${inputClass(Boolean(fieldErrors.password))} pe-10`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? t("hidePassword") : t("showPassword")}
                  aria-pressed={showPassword}
                  aria-controls="login-password"
                  className={`absolute end-3.5 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-700 rounded ${FOCUS_RING}`}
                >
                  {showPassword ? (
                    <BrandEyeOffIcon size={18} aria-hidden="true" />
                  ) : (
                    <BrandEyeIcon size={18} aria-hidden="true" />
                  )}
                </button>
              </div>
              {fieldErrors.password && (
                <p id="login-password-error" className="mt-1 text-xs text-status-error">
                  {fieldErrors.password}
                </p>
              )}
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="login-remember"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded text-primary border-tertiary focus:ring-primary"
              />
              <label htmlFor="login-remember" className="ms-2 text-xs text-neutral-600">
                {t("rememberMe")}
              </label>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              aria-busy={isLoading}
              className={`w-full py-3 bg-primary text-white rounded-xl font-semibold text-sm hover:bg-primary/95 transition shadow-sm disabled:opacity-50 mt-2 ${FOCUS_RING}`}
            >
              {isLoading ? t("submitting") : t("submit")}
            </button>
          </form>

          <div className="relative my-6 text-center">
            <hr className="border-tertiary/60" />
            <span className="absolute start-1/2 -translate-x-1/2 rtl:translate-x-1/2 -top-2.5 bg-white px-3 text-xs text-neutral-500">
              {t("orContinueWith")}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            <button
              type="button"
              onClick={() => toast.info(t("socialSimulated", { provider: "Google" }))}
              className={`flex items-center justify-center py-2.5 px-3 border border-tertiary/70 rounded-xl hover:bg-neutral-50 transition ${FOCUS_RING}`}
              aria-label={t("signInWith", { provider: "Google" })}
              title={t("signInWith", { provider: "Google" })}
            >
              <BrandGoogleIcon size={20} aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => toast.info(t("socialSimulated", { provider: "Apple" }))}
              className={`flex items-center justify-center py-2.5 px-3 border border-tertiary/70 rounded-xl hover:bg-neutral-50 transition ${FOCUS_RING}`}
              aria-label={t("signInWith", { provider: "Apple" })}
              title={t("signInWith", { provider: "Apple" })}
            >
              <BrandAppleIcon size={20} className="text-black" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => toast.info(t("phoneSimulated"))}
              className={`flex items-center justify-center py-2.5 px-3 border border-tertiary/70 rounded-xl hover:bg-neutral-50 transition text-neutral-700 ${FOCUS_RING}`}
              aria-label={t("signInWithPhone")}
              title={t("signInWithPhone")}
            >
              <BrandPhoneIcon size={20} className="text-secondary" aria-hidden="true" />
            </button>
          </div>

          <div className="text-center text-xs text-neutral-600 mt-8 pt-4 border-t border-tertiary/40">
            {t("noAccount")}{" "}
            <button
              type="button"
              onClick={openRegister}
              className={`text-primary font-semibold hover:underline rounded ${FOCUS_RING}`}
            >
              {t("createAccount")}
            </button>
          </div>
        </div>
      </Container>
    </div>
  );
}
