"use client";

/**
 * Authentication: one panel for "Log in" and "Sign up" with an animated switch, shared by
 * the /login page and the global auth dialog.
 *
 * - `AuthPanel`: segmented Log in / Sign up switch (sliding pill), kit floating-label
 *   inputs with animated validation, password reveal, social shortcuts (simulated),
 *   optional demo quick-login buttons, success micro-interaction (button check) before the
 *   redirect or reload. Server errors go through `useActionError`.
 * - `AuthAside`: arch-masked Algerian photograph with the brand line (desktop split layout).
 * - `LoginModal` (default): the dialog. It opens for both the login and the register store,
 *   so switching tabs never closes and reopens the dialog. On phones the kit Dialog is a
 *   bottom sheet. `RegisterModal` therefore renders nothing.
 */

import React, { useEffect, useId, useRef, useState } from "react";
import { AnimatePresence, m } from "framer-motion";
import { useTranslations } from "next-intl";
import { toast } from "react-toastify";
import { useLoginModal } from "@/hook/useLoginModal";
import { useRegisterModal } from "@/hook/useRegisterModal";
import { useActionError, type ActionErrorLike } from "@/hook/useActionError";
import {
  BrandAppleIcon,
  BrandEyeIcon,
  BrandEyeOffIcon,
  BrandGoogleIcon,
  BrandPhoneIcon,
  BrandShieldIcon,
} from "@/components/icons";
import Dialog from "@/components/ui/Dialog";
import Button, { IconButton } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { Checkbox } from "@/components/ui/Choice";
import { SegmentedControl } from "@/components/ui/Tabs";
import { Divider } from "@/components/ui/Surface";
import { Banner } from "@/components/ui/Feedback";
import ArchImage from "@/components/ui/ArchImage";
import Logo from "@/components/navbar/Logo";
import { imagery } from "@/lib/imagery";
import { dur, ease } from "@/lib/motion";

export type AuthMode = "login" | "signup";

/** Seeded demo accounts (password documented in README.md). */
const DEMO_PASSWORD = "darna-demo-2026";
const DEMO_ACCOUNTS = [
  { email: "yacine.traveler@bladus.dz", key: "demoTraveler", name: "Yacine" },
  { email: "amina.benali@bladus.dz", key: "demoHost", name: "Amina" },
  { email: "karim.mansouri@bladus.dz", key: "demoAgency", name: "Karim" },
] as const;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
/** Time the success check stays on screen before we navigate away. */
const SUCCESS_HOLD_MS = 650;

class AuthError extends Error {
  constructor(public readonly body: ActionErrorLike) {
    super("AUTH_FAILED");
  }
}

async function postAuth(path: string, payload: Record<string, string>) {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new AuthError(data);
  return data as { user?: { name?: string } };
}

type FieldErrors = { name?: string; email?: string; password?: string };

export interface AuthPanelProps {
  mode: AuthMode;
  onModeChange: (mode: AuthMode) => void;
  /** Called after the success animation (redirect, reload…). */
  onAuthenticated: () => void;
  /** One-click demo accounts (seeded data). */
  showDemo?: boolean;
  /** Heading level of the title (h1 on the page, h2 in the dialog). */
  titleAs?: "h1" | "h2";
  titleId?: string;
}

export function AuthPanel({ mode, onModeChange, onAuthenticated, showDemo, titleAs = "h2", titleId }: AuthPanelProps) {
  const t = useTranslations("auth");
  const errorText = useActionError();
  const formId = useId();
  const isSignup = mode === "signup";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const doneTimer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => () => clearTimeout(doneTimer.current), []);

  // Switching tabs clears messages from the other form.
  useEffect(() => {
    setFieldErrors({});
    setError(null);
  }, [mode]);

  const finish = (message: string) => {
    setSuccess(true);
    toast.success(message);
    doneTimer.current = setTimeout(onAuthenticated, SUCCESS_HOLD_MS);
  };

  const validate = (): FieldErrors => {
    const next: FieldErrors = {};
    if (isSignup && !name.trim()) next.name = t("errors.nameRequired");
    if (!email.trim()) next.email = t("errors.emailRequired");
    else if (!EMAIL_RE.test(email.trim())) next.email = t("errors.emailInvalid");
    if (!password) next.password = t("errors.passwordRequired");
    return next;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading || success) return;
    const next = validate();
    setFieldErrors(next);
    if (next.name || next.email || next.password) {
      setError(null);
      return;
    }
    setError(null);
    setIsLoading(true);
    try {
      if (isSignup) {
        const data = await postAuth("/api/auth/register", { name: name.trim(), email: email.trim(), password });
        const userName = typeof data.user?.name === "string" ? data.user.name : name.trim();
        setIsLoading(false);
        finish(t("welcomeName", { name: userName }));
      } else {
        const data = await postAuth("/api/auth/login", { email: email.trim(), password });
        const userName = typeof data.user?.name === "string" ? data.user.name : "";
        setIsLoading(false);
        finish(userName ? t("welcomeBackName", { name: userName }) : t("welcomeToast"));
      }
    } catch (err) {
      setIsLoading(false);
      setError(
        errorText(err instanceof AuthError ? err.body : null, isSignup ? t("errors.signupFailed") : t("errors.failed")),
      );
    }
  };

  const handleQuickDemo = async (demoEmail: string) => {
    if (isLoading || success) return;
    onModeChange("login");
    setEmail(demoEmail);
    setPassword(DEMO_PASSWORD);
    setFieldErrors({});
    setError(null);
    setIsLoading(true);
    try {
      const data = await postAuth("/api/auth/login", { email: demoEmail, password: DEMO_PASSWORD });
      setIsLoading(false);
      finish(t("loggedInAs", { name: data.user?.name || demoEmail }));
    } catch {
      setIsLoading(false);
      setError(t("errors.demo"));
    }
  };

  const clearFieldError = (key: keyof FieldErrors) =>
    setFieldErrors((cur) => (cur[key] ? { ...cur, [key]: undefined } : cur));

  const Title = titleAs;
  const busy = isLoading || success;

  return (
    <div className="flex flex-col">
      <SegmentedControl<AuthMode>
        ariaLabel={t("tabsLabel")}
        value={mode}
        onChange={onModeChange}
        fullWidth
        options={[
          { value: "login", label: t("tabLogin") },
          { value: "signup", label: t("tabSignup") },
        ]}
      />

      <div className="mt-6 min-h-[5.5rem]">
        <AnimatePresence mode="wait" initial={false}>
          <m.div
            key={mode}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0, transition: { duration: dur.base, ease: ease.out } }}
            exit={{ opacity: 0, y: -4, transition: { duration: dur.fast, ease: ease.standard } }}
          >
            <Title id={titleId} className="font-serif text-display-md text-primary-900 [text-wrap:balance]">
              {isSignup ? t("signupTitle") : t("title")}
            </Title>
            <p className="mt-2 text-body text-primary-600 [text-wrap:pretty]">
              {isSignup ? t("signupSubtitle") : t("subtitle")}
            </p>
          </m.div>
        </AnimatePresence>
      </div>

      {showDemo && (
        <div
          role="group"
          aria-labelledby={`${formId}-demo`}
          className="mt-5 rounded-2xl bg-tertiary-100/70 p-3.5 ring-1 ring-tertiary-300/60"
        >
          <p id={`${formId}-demo`} className="text-meta font-semibold text-primary-800">
            {t("demoTitle")}
          </p>
          <div className="mt-2.5 flex flex-wrap gap-2">
            {DEMO_ACCOUNTS.map((acc) => (
              <Button
                key={acc.email}
                type="button"
                variant="tertiary"
                size="sm"
                disabled={busy}
                onClick={() => handleQuickDemo(acc.email)}
                className="flex-1 basis-[8.5rem]"
              >
                {t(acc.key, { name: acc.name })}
              </Button>
            ))}
          </div>
        </div>
      )}

      <AnimatePresence initial={false}>
        {error && (
          <m.div
            key="auth-error"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0, transition: { duration: dur.base, ease: ease.out } }}
            exit={{ opacity: 0, transition: { duration: dur.fast } }}
            className="mt-5"
          >
            <Banner tone="danger">{error}</Banner>
          </m.div>
        )}
      </AnimatePresence>

      <form onSubmit={handleSubmit} noValidate className="mt-5 flex flex-col gap-4" aria-busy={isLoading}>
        <AnimatePresence initial={false}>
          {isSignup && (
            <m.div
              key="name"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto", transition: { duration: dur.base, ease: ease.out } }}
              exit={{ opacity: 0, height: 0, transition: { duration: dur.fast, ease: ease.standard } }}
              className="-m-1 overflow-hidden p-1"
            >
              <Input
                id={`${formId}-name`}
                label={t("nameLabel")}
                autoComplete="name"
                value={name}
                disabled={busy}
                onChange={(e) => {
                  setName(e.target.value);
                  clearFieldError("name");
                }}
                error={fieldErrors.name}
              />
            </m.div>
          )}
        </AnimatePresence>

        <Input
          id={`${formId}-email`}
          type="email"
          inputMode="email"
          label={t("emailLabel")}
          autoComplete="email"
          value={email}
          disabled={busy}
          onChange={(e) => {
            setEmail(e.target.value);
            clearFieldError("email");
          }}
          error={fieldErrors.email}
        />

        <Input
          id={`${formId}-password`}
          type={showPassword ? "text" : "password"}
          label={t("passwordLabel")}
          autoComplete={isSignup ? "new-password" : "current-password"}
          value={password}
          disabled={busy}
          onChange={(e) => {
            setPassword(e.target.value);
            clearFieldError("password");
          }}
          error={fieldErrors.password}
          suffix={
            <IconButton
              type="button"
              size="sm"
              label={showPassword ? t("hidePassword") : t("showPassword")}
              pressed={showPassword}
              onClick={() => setShowPassword((v) => !v)}
              icon={showPassword ? <BrandEyeOffIcon size={18} /> : <BrandEyeIcon size={18} />}
            />
          }
        />

        {!isSignup && (
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
            <Checkbox
              label={t("rememberMe")}
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
            />
            <button
              type="button"
              onClick={() => toast.info(t("forgotPasswordSoon"))}
              className="rounded text-meta font-semibold text-primary-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2"
            >
              <span className="link-underline pb-0.5">{t("forgotPassword")}</span>
            </button>
          </div>
        )}

        <Button
          type="submit"
          size="lg"
          fullWidth
          loading={isLoading}
          success={success}
          className="mt-1"
        >
          {success ? t("successButton") : isSignup ? t("createAccount") : t("submit")}
        </Button>
      </form>

      <Divider label={t("orContinueWith")} className="my-6" />

      <div className="grid grid-cols-3 gap-2.5">
        {(["Google", "Apple"] as const).map((provider) => (
          <Button
            key={provider}
            type="button"
            variant="tertiary"
            aria-label={t("signInWith", { provider })}
            title={t("signInWith", { provider })}
            onClick={() => toast.info(t("socialSimulated", { provider }))}
          >
            {provider === "Google" ? (
              <BrandGoogleIcon size={20} aria-hidden="true" />
            ) : (
              <BrandAppleIcon size={20} className="text-primary-900" aria-hidden="true" />
            )}
          </Button>
        ))}
        <Button
          type="button"
          variant="tertiary"
          aria-label={t("signInWithPhone")}
          title={t("signInWithPhone")}
          onClick={() => toast.info(t("phoneSimulated"))}
        >
          <BrandPhoneIcon size={20} className="text-secondary-700" aria-hidden="true" />
        </Button>
      </div>

      <p className="mt-6 text-center text-meta text-primary-600">
        {isSignup ? t("haveAccount") : t("noAccount")}{" "}
        <button
          type="button"
          onClick={() => onModeChange(isSignup ? "login" : "signup")}
          className="rounded font-semibold text-primary-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2"
        >
          <span className="link-underline pb-0.5">{isSignup ? t("tabLogin") : t("createAccount")}</span>
        </button>
      </p>
    </div>
  );
}

/** Editorial half of the split layout: arch-masked photograph + brand line. */
export function AuthAside({ priority, compact }: { priority?: boolean; compact?: boolean }) {
  const t = useTranslations("auth");
  return (
    <div className="relative flex h-full flex-col justify-between overflow-hidden bg-darnaBg-300/60 p-8 lg:p-10">
      <div aria-hidden="true" className="texture-zellige pointer-events-none absolute inset-0 opacity-60" />
      <div className="relative">
        <Logo variant="horizontal" interactive={false} />
      </div>
      <div className={`relative mx-auto w-full ${compact ? "max-w-[15rem]" : "max-w-[19rem]"} py-6`}>
        <ArchImage
          src={imagery.ghardaia}
          alt={t("aside.imageAlt")}
          sizes="(min-width: 1024px) 320px, 260px"
          priority={priority}
          className="aspect-[4/5] enter-rise"
        />
      </div>
      <div className="relative">
        <p className="flex items-center gap-2 text-eyebrow uppercase font-semibold text-secondary-700">
          <span aria-hidden="true" className="h-px w-6 bg-secondary-600/60" />
          {t("aside.eyebrow")}
        </p>
        <p className="mt-3 font-serif text-heading text-primary-900 [text-wrap:balance]">{t("aside.title")}</p>
        <p className="mt-3 flex items-start gap-2 text-meta text-primary-600">
          <BrandShieldIcon size={16} className="mt-0.5 shrink-0 text-secondary-700" aria-hidden="true" />
          {t("aside.body")}
        </p>
      </div>
    </div>
  );
}

export default function LoginModal() {
  const t = useTranslations("auth");
  const isLoginOpen = useLoginModal((s) => s.isOpen);
  const openLogin = useLoginModal((s) => s.onOpen);
  const closeLogin = useLoginModal((s) => s.onClose);
  const isRegisterOpen = useRegisterModal((s) => s.isOpen);
  const openRegister = useRegisterModal((s) => s.onOpen);
  const closeRegister = useRegisterModal((s) => s.onClose);
  const isOpen = isLoginOpen || isRegisterOpen;
  const mode: AuthMode = isRegisterOpen && !isLoginOpen ? "signup" : "login";
  const titleId = useId();

  const close = () => {
    closeLogin();
    closeRegister();
  };

  const changeMode = (next: AuthMode) => {
    if (next === mode) return;
    if (next === "signup") {
      closeLogin();
      openRegister();
    } else {
      closeRegister();
      openLogin();
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={close}
      ariaLabel={t("modalLabel")}
      showClose
      className="relative grid w-full overflow-hidden rounded-t-3xl bg-white shadow-e4 sm:max-w-lg sm:rounded-3xl md:max-w-4xl md:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]"
    >
      <div className="hidden md:block">
        <AuthAside compact />
      </div>
      <div className="max-h-[92dvh] overflow-y-auto overscroll-contain px-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-10 sm:max-h-[90vh] sm:px-8 sm:pb-8 sm:pt-16 lg:px-10">
        <AuthPanel
          mode={mode}
          onModeChange={changeMode}
          titleId={titleId}
          showDemo={process.env.NODE_ENV !== "production"}
          onAuthenticated={() => {
            close();
            window.location.reload();
          }}
        />
      </div>
    </Dialog>
  );
}
