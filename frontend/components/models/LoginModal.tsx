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
import { useLocale, useTranslations } from "next-intl";
import { toast } from "react-toastify";
import { useLoginModal } from "@/hook/useLoginModal";
import { useRegisterModal } from "@/hook/useRegisterModal";
import { useActionError, type ActionErrorLike } from "@/hook/useActionError";
import {
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
import { TEST_MODE } from "@/lib/test-mode";

export type AuthMode = "login" | "signup";



const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
/** Time the success check stays on screen before we navigate away. */
const SUCCESS_HOLD_MS = 650;
/** Wait before "Send a new code" works again (the backend allows 3 codes per hour). */
const RESEND_COOLDOWN_S = 60;

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
  return data as {
    user?: { name?: string; profileComplete?: boolean };
    mfaRequired?: boolean;
    /** The account waits for the 6-digit code emailed at sign-up (ACC-01). */
    verifyEmail?: boolean;
  };
}

type FieldErrors = { name?: string; email?: string; password?: string };

/** Reasons the Google callback can send back (texts in auth.google.errors.*). */
const GOOGLE_ERRORS = new Set([
  "google_expired",
  "invalid_redirect_uri",
  "google_client_rejected",
  "google_cancelled",
  "google_failed",
  "google_unavailable",
  "google_disabled",
  "google_email_unverified",
  "google_staff_account",
  "account_disabled",
]);

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
  const locale = useLocale();
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
  /** Second step of a sign-in protected by an authenticator app (BR-ACC-04). */
  const [mfaStep, setMfaStep] = useState(false);
  const [mfaCode, setMfaCode] = useState("");
  /** Code step of an email sign-up (ACC-01): no session until the emailed code is entered. */
  const [emailStep, setEmailStep] = useState(false);
  const [emailCode, setEmailCode] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [resent, setResent] = useState(false);
  const doneTimer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => () => clearTimeout(doneTimer.current), []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  // Switching tabs clears messages from the other form.
  useEffect(() => {
    setFieldErrors({});
    setError(null);
    setMfaStep(false);
    setMfaCode("");
    setEmailStep(false);
    setEmailCode("");
  }, [mode]);

  const askSecondFactor = () => {
    setPassword("");
    setMfaCode("");
    setError(null);
    setMfaStep(true);
  };

  /** Show the email code step. The password stays in memory only to ask for a new code. */
  const askEmailCode = (justSent: boolean) => {
    setEmailCode("");
    setError(null);
    setResent(false);
    setEmailStep(true);
    setCooldown(justSent ? RESEND_COOLDOWN_S : 0);
  };

  const resendEmailCode = async () => {
    setError(null);
    setResent(false);
    try {
      await postAuth("/api/auth/email-code/resend", { email: email.trim(), password });
      setResent(true);
      setCooldown(RESEND_COOLDOWN_S);
    } catch (err) {
      setError(errorText(err instanceof AuthError ? err.body : null, t("emailCode.resendFailed")));
    }
  };

  const handleEmailCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading || success) return;
    const code = emailCode.replace(/\s/g, "");
    if (!/^[0-9]{6}$/.test(code)) {
      setError(t("emailCode.codeRequired"));
      return;
    }
    setError(null);
    setIsLoading(true);
    try {
      const data = await postAuth("/api/auth/email-code", { email: email.trim(), code });
      setIsLoading(false);
      if (data.mfaRequired) {
        setEmailStep(false);
        askSecondFactor();
        return;
      }
      setPassword("");
      const userName = typeof data.user?.name === "string" ? data.user.name : name.trim();
      finish(
        userName ? t(isSignup ? "welcomeName" : "welcomeBackName", { name: userName }) : t("welcomeToast"),
        data.user?.profileComplete !== false,
        isSignup,
      );
    } catch (err) {
      setIsLoading(false);
      setError(errorText(err instanceof AuthError ? err.body : null, t("emailCode.failed")));
    }
  };

  // Back from "Continue with Google" (/api/auth/google/callback): ?mfa=1 asks for the
  // authenticator code, ?error=google_* explains why Google sign-in did not finish.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("mfa") === "1") {
      askSecondFactor();
      return;
    }
    const code = params.get("error");
    if (code && GOOGLE_ERRORS.has(code)) setError(t(`google.errors.${code}`));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Full-page trip to Google; the callback brings the visitor back to where they were. */
  const continueWithGoogle = () => {
    const params = new URLSearchParams(window.location.search);
    const back = params.get("callbackUrl") || `${window.location.pathname}${window.location.search}`;
    window.location.assign(
      `/api/auth/google/start?${new URLSearchParams({ locale, callbackUrl: back }).toString()}`,
    );
  };

  const handleMfaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading || success) return;
    const code = mfaCode.replace(/\s/g, "");
    if (!code) {
      setError(t("mfa.codeRequired"));
      return;
    }
    setError(null);
    setIsLoading(true);
    try {
      const data = await postAuth("/api/auth/2fa", { code });
      const userName = typeof data.user?.name === "string" ? data.user.name : "";
      setIsLoading(false);
      finish(userName ? t("welcomeBackName", { name: userName }) : t("welcomeToast"), data.user?.profileComplete !== false);
    } catch (err) {
      setIsLoading(false);
      const body = err instanceof AuthError ? err.body : null;
      if (body?.code === "UNAUTHENTICATED") {
        // The pending sign-in expired: start again from the password.
        setMfaStep(false);
        setError(t("mfa.expired"));
        return;
      }
      setError(errorText(body, t("mfa.failed")));
    }
  };

  /**
   * After a successful sign-in or sign-up. New accounts (and accounts with
   * required profile steps left) go to /welcome first (ACC-11), then on to
   * where the visitor was heading.
   */
  const finish = (message: string, profileComplete = true, newAccount = false) => {
    setSuccess(true);
    toast.success(message);
    doneTimer.current = setTimeout(() => {
      // A new account: email code, then "complete your profile", then the home page.
      if (newAccount && profileComplete) {
        window.location.assign(`/${locale}`);
        return;
      }
      if (profileComplete) {
        onAuthenticated();
        return;
      }
      const params = new URLSearchParams(window.location.search);
      const back = params.get("callbackUrl") || `${window.location.pathname}${window.location.search}`;
      const target = newAccount || back.startsWith(`/${locale}/login`) ? `/${locale}` : back;
      window.location.assign(`/${locale}/welcome?${new URLSearchParams({ callbackUrl: target }).toString()}`);
    }, SUCCESS_HOLD_MS);
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
        if (data.verifyEmail) {
          setIsLoading(false);
          askEmailCode(true);
          return;
        }
        const userName = typeof data.user?.name === "string" ? data.user.name : name.trim();
        setIsLoading(false);
        finish(t("welcomeName", { name: userName }), false, true);
      } else {
        const data = await postAuth("/api/auth/login", { email: email.trim(), password });
        if (data.verifyEmail) {
          // The earlier code may have expired: send a fresh one, then ask for it.
          setIsLoading(false);
          askEmailCode(false);
          await resendEmailCode();
          return;
        }
        if (data.mfaRequired) {
          setIsLoading(false);
          askSecondFactor();
          return;
        }
        const userName = typeof data.user?.name === "string" ? data.user.name : "";
        setIsLoading(false);
        finish(userName ? t("welcomeBackName", { name: userName }) : t("welcomeToast"), data.user?.profileComplete !== false);
      }
    } catch (err) {
      setIsLoading(false);
      setError(
        errorText(err instanceof AuthError ? err.body : null, isSignup ? t("errors.signupFailed") : t("errors.failed")),
      );
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

      {emailStep ? (
        <form onSubmit={handleEmailCodeSubmit} noValidate className="mt-5 flex flex-col gap-4" aria-busy={isLoading}>
          <div>
            <p className="text-title font-semibold text-primary-900">{t("emailCode.title")}</p>
            <p className="mt-1 text-meta text-primary-600">{t("emailCode.subtitle", { email: email.trim() })}</p>
          </div>
          <Input
            id={`${formId}-email-code`}
            label={t("emailCode.codeLabel")}
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            autoFocus
            value={emailCode}
            disabled={busy}
            onChange={(e) => {
              setEmailCode(e.target.value.replace(/[^0-9]/g, "").slice(0, 6));
              setError(null);
            }}
          />
          <p className="text-meta text-primary-600" aria-live="polite">
            {resent ? t("emailCode.resent") : t("emailCode.hint")}
          </p>
          <Button type="submit" size="lg" fullWidth loading={isLoading} success={success}>
            {success ? t("successButton") : t("emailCode.submit")}
          </Button>
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
            <button
              type="button"
              disabled={busy || cooldown > 0}
              onClick={resendEmailCode}
              className="rounded text-meta font-semibold text-primary-800 disabled:cursor-not-allowed disabled:text-primary-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2"
            >
              <span className="link-underline pb-0.5">
                {cooldown > 0 ? t("emailCode.resendIn", { seconds: cooldown }) : t("emailCode.resend")}
              </span>
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setEmailStep(false);
                setError(null);
              }}
              className="rounded text-meta font-semibold text-primary-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2"
            >
              <span className="link-underline pb-0.5">{t("emailCode.back")}</span>
            </button>
          </div>
        </form>
      ) : mfaStep ? (
        <form onSubmit={handleMfaSubmit} noValidate className="mt-5 flex flex-col gap-4" aria-busy={isLoading}>
          <div>
            <p className="text-title font-semibold text-primary-900">{t("mfa.title")}</p>
            <p className="mt-1 text-meta text-primary-600">{t("mfa.subtitle")}</p>
          </div>
          <Input
            id={`${formId}-mfa`}
            label={t("mfa.codeLabel")}
            inputMode="numeric"
            autoComplete="one-time-code"
            autoFocus
            value={mfaCode}
            disabled={busy}
            onChange={(e) => {
              setMfaCode(e.target.value);
              setError(null);
            }}
          />
          <p className="text-meta text-primary-600">{t("mfa.recoveryHint")}</p>
          <Button type="submit" size="lg" fullWidth loading={isLoading} success={success}>
            {success ? t("successButton") : t("mfa.submit")}
          </Button>
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              setMfaStep(false);
              setError(null);
            }}
            className="self-center rounded text-meta font-semibold text-primary-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2"
          >
            <span className="link-underline pb-0.5">{t("mfa.back")}</span>
          </button>
        </form>
      ) : (
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
      )}

      <Divider label={t("orContinueWith")} className="my-6" />

      <div className="grid grid-cols-2 gap-2.5">
        <Button
          type="button"
          variant="tertiary"
          leadingIcon={<BrandGoogleIcon size={18} aria-hidden="true" />}
          aria-label={t("signInWith", { provider: "Google" })}
          title={t("signInWith", { provider: "Google" })}
          onClick={continueWithGoogle}
          disabled={busy}
          fullWidth
        >
          Google
        </Button>
        <Button
          type="button"
          variant="tertiary"
          leadingIcon={<BrandPhoneIcon size={18} className="text-secondary-700" aria-hidden="true" />}
          aria-label={t("signInWithPhone")}
          title={t("signInWithPhone")}
          onClick={() => toast.info(t("phoneSimulated"))}
          disabled={busy}
          fullWidth
        >
          {t("phone")}
        </Button>
      </div>
      <p className="mt-3 text-center text-[11px] leading-relaxed text-primary-500">{t("google.terms")}</p>

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
          showDemo={process.env.NODE_ENV !== "production" || TEST_MODE}
          onAuthenticated={() => {
            close();
            window.location.reload();
          }}
        />
      </div>
    </Dialog>
  );
}
