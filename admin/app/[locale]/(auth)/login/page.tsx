"use client";

import React, { useState } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Lock, Mail, ShieldAlert, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { LocaleSwitcher } from "@/components/layout/LocaleSwitcher";
import { loginAdminAction } from "./actions";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const locale = useLocale();
  const t = useTranslations("login");
  const tRoles = useTranslations("roles");
  const returnTo = searchParams.get("returnTo") || `/${locale}`;

  const [email, setEmail] = useState("admin@darna.dz");
  const [password, setPassword] = useState("DarnaAdmin2026!");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    const formData = new FormData();
    formData.set("email", email);
    formData.set("password", password);

    try {
      const res = await loginAdminAction(formData);
      if (res?.error) {
        setError(res.error);
        setIsLoading(false);
      } else {
        router.push(returnTo);
        router.refresh();
      }
    } catch {
      setError("An unexpected error occurred during login. Please try again.");
      setIsLoading(false);
    }
  };

  const fillQuickAccount = (em: string, pw: string) => {
    setEmail(em);
    setPassword(pw);
    setError(null);
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
          <span className="px-2 py-0.5 bg-accent text-white rounded-md text-[9px] font-bold uppercase tracking-wider">
            Admin
          </span>
        </div>
        <LocaleSwitcher />
      </div>

      {/* Main Login Card */}
      <div className="max-w-md w-full mx-auto my-8">
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-tertiary/80 shadow-darna-modal text-start animate-in fade-in zoom-in-95">
          <div className="text-center pb-6 border-b border-neutral-100">
            <div className="w-12 h-12 rounded-2xl bg-primary text-white flex items-center justify-center mx-auto mb-3 shadow-xs">
              <Lock className="w-6 h-6 stroke-[1.8]" />
            </div>
            <h1 className="text-xl sm:text-2xl font-serif font-black text-primary">
              {t("title")}
            </h1>
            <p className="text-xs text-neutral-500 mt-1">
              {t("subtitle")}
            </p>
          </div>

          {error && (
            <div className="mt-4 p-3 rounded-xl bg-accent/10 border border-accent/30 text-xs text-accent flex items-start gap-2.5">
              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
              <p className="leading-snug">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            <Input
              label={t("emailLabel")}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@darna.dz"
              required
              leftIcon={<Mail className="w-4 h-4" />}
            />

            <Input
              label={t("passwordLabel")}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              required
              leftIcon={<Lock className="w-4 h-4" />}
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

          {/* Quick Demo Pre-fills */}
          <div className="mt-6 pt-5 border-t border-neutral-100">
            <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block mb-2">
              {t("demoSeeds")}
            </span>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => fillQuickAccount("admin@darna.dz", "DarnaAdmin2026!")}
                className="px-2 py-1.5 rounded-xl border border-tertiary/70 text-[11px] font-bold text-primary hover:bg-darnaBg/80 transition"
              >
                {tRoles("super_admin")}
              </button>
              <button
                type="button"
                onClick={() => fillQuickAccount("moderator@darna.dz", "DarnaMod2026!")}
                className="px-2 py-1.5 rounded-xl border border-tertiary/70 text-[11px] font-bold text-primary hover:bg-darnaBg/80 transition"
              >
                {tRoles("moderator")}
              </button>
              <button
                type="button"
                onClick={() => fillQuickAccount("finance@darna.dz", "DarnaFinance2026!")}
                className="px-2 py-1.5 rounded-xl border border-tertiary/70 text-[11px] font-bold text-primary hover:bg-darnaBg/80 transition"
              >
                {tRoles("finance")}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center text-xs text-neutral-400">
        {t("footerText")}
      </div>
    </div>
  );
}
