"use client";

import React, { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/navigation";
import { BrandChevronLeftIcon } from "@/components/icons";
import { AuthAside, AuthPanel, type AuthMode } from "@/components/models/LoginModal";
import Logo from "@/components/navbar/Logo";
import { safeCallbackUrl } from "@/lib/auth/callback-url";

/**
 * /login: split layout on desktop (arch-masked photograph + brand line on the start side,
 * the auth panel on the end side); a single paper column on phones and tablets.
 */
export default function LoginForm() {
  const t = useTranslations("auth");
  const locale = useLocale();
  const [mode, setMode] = useState<AuthMode>("login");

  /** Same-origin relative paths only; anything else goes to the locale home. */
  const redirectAfterLogin = () => {
    const raw = new URLSearchParams(window.location.search).get("callbackUrl");
    window.location.assign(safeCallbackUrl(raw, locale));
  };

  return (
    <div className="min-h-[calc(100dvh-5rem)] bg-darnaBg px-4 py-6 sm:px-6 sm:py-10 lg:py-14">
      <div className="mx-auto w-full max-w-5xl">
        <Link
          href="/"
          className="enter-up inline-flex min-h-[44px] items-center gap-2 rounded-full text-meta font-semibold text-primary-700 transition-colors duration-fast ease-standard hover:text-primary-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2 focus-visible:ring-offset-darnaBg"
        >
          <BrandChevronLeftIcon size={18} className="rtl:rotate-180" aria-hidden="true" />
          <span>{t("backHome")}</span>
        </Link>

        <div
          className="enter-up mt-3 grid overflow-hidden rounded-3xl bg-white shadow-e3 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]"
          style={{ animationDelay: "60ms" }}
        >
          <div className="hidden lg:block">
            <AuthAside priority />
          </div>
          <div className="px-5 py-7 sm:px-10 sm:py-10 lg:px-12 lg:py-12">
            <div className="mb-6 lg:hidden">
              <Logo variant="horizontal" interactive={false} />
            </div>
            <AuthPanel
              mode={mode}
              onModeChange={setMode}
              titleAs="h1"
              showDemo
              onAuthenticated={redirectAfterLogin}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
