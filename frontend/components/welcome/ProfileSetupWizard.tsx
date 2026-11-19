"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { User } from "@/types";
import {
  completeProfileAction,
  listCommunesAction,
  requestPhoneCodeAction,
  saveProfileDetailsAction,
  type CommuneOption,
} from "@/app/actions/account";
import { useActionError } from "@/hook/useActionError";
import type { ActionResult } from "@/lib/action-result";
import { WILAYAS } from "@/lib/algeria";
import { safeCallbackUrl } from "@/lib/auth/callback-url";
import Button from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Field";
import { Checkbox, RadioGroup } from "@/components/ui/Choice";

/**
 * 'Complete your profile' after sign-up (ACC-11). One question per step,
 * saved as soon as the step is done, so leaving half way keeps what was given:
 *   1. name   2. phone + SMS code   3. date of birth (adult)
 *   4. site language + spoken languages   5. where you live, short bio (optional)
 * Name, verified phone and birthday are required (the backend checks them
 * again in POST /me/profile/complete); the last step can be skipped.
 */

type Step = "name" | "phone" | "birth" | "languages" | "home";
const STEPS: Step[] = ["name", "phone", "birth", "languages", "home"];

/** Languages people can say they speak (ISO 639-1 codes the API accepts). */
const SPOKEN = ["ar", "fr", "en", "es", "it", "de", "tr", "zh"] as const;

export default function ProfileSetupWizard({ user, callbackUrl }: { user: User; callbackUrl: string }) {
  const t = useTranslations("welcome");
  const locale = useLocale();
  const errorText = useActionError();

  const [step, setStep] = useState<Step>(() => {
    const missing = user.profileMissing ?? [];
    if (missing.includes("name")) return "name";
    if (missing.includes("phone")) return "phone";
    if (missing.includes("date_of_birth")) return "birth";
    return "languages";
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step values (prefilled with what the account already has).
  const [firstName, setFirstName] = useState(user.name?.split(" ")[0] ?? "");
  const [lastName, setLastName] = useState("");
  const [arabicName, setArabicName] = useState(user.fullNameAr ?? "");
  const [phone, setPhone] = useState(user.phone ?? "");
  const [birth, setBirth] = useState(user.dateOfBirth ?? "");
  const [siteLocale, setSiteLocale] = useState(locale);
  const [spoken, setSpoken] = useState<string[]>(user.languages?.filter((l) => /^[a-z]{2}$/.test(l)) ?? []);
  const [wilaya, setWilaya] = useState<string>("");
  const [communes, setCommunes] = useState<CommuneOption[]>([]);
  const [commune, setCommune] = useState<string>("");
  const [bio, setBio] = useState(user.bio ?? "");

  const index = STEPS.indexOf(step);
  const latestBirth = useMemo(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 18);
    return d.toISOString().slice(0, 10);
  }, []);

  useEffect(() => {
    setCommune("");
    setCommunes([]);
    const code = Number(wilaya);
    if (!code) return;
    let alive = true;
    listCommunesAction(code, locale).then((res) => alive && res.ok && setCommunes(res.data));
    return () => {
      alive = false;
    };
  }, [wilaya, locale]);

  const go = (next: Step) => {
    setError(null);
    setStep(next);
  };
  const nextStep = () => go(STEPS[Math.min(index + 1, STEPS.length - 1)]);

  /** Run one save; show the error under the step and stay, else continue. */
  const run = async (work: () => Promise<ActionResult<unknown>>, after: () => void) => {
    setBusy(true);
    setError(null);
    try {
      const result = await work();
      if (!result.ok) {
        if (result.code === "PROFILE_INCOMPLETE") {
          // Open the first required step the server still misses, and say what it needs.
          const missing = String(result.params?.missing ?? "").split(",").filter(Boolean);
          const first = missing[0];
          const target: Step | null = first === "name" ? "name" : first === "phone" ? "phone" : first === "date_of_birth" ? "birth" : null;
          if (target) setStep(target);
          setError(first ? t(`missing.${first === "date_of_birth" ? "birth" : first}`) : errorText(result));
          return;
        }
        setError(errorText(result));
        return;
      }
      after();
    } catch {
      setError(t("errors.generic"));
    } finally {
      setBusy(false);
    }
  };

  const finish = async (skipHome: boolean) => {
    await run(
      async () => {
        if (!skipHome && (commune || bio.trim() !== (user.bio ?? ""))) {
          const saved = await saveProfileDetailsAction({
            homeCommuneId: commune ? Number(commune) : undefined,
            bio: bio.trim(),
          });
          if (!saved.ok) return saved;
        }
        return completeProfileAction();
      },
      () => {
        // Continue in the language the person chose.
        const target = safeCallbackUrl(callbackUrl, siteLocale);
        const localized = target.replace(/^\/(en|fr|ar)(?=\/|$)/, `/${siteLocale}`);
        window.location.assign(localized);
      },
    );
  };

  const stepTitle = t(`steps.${step}.title`);

  return (
    <div className="mx-auto w-full max-w-xl">
      <p className="text-meta font-semibold uppercase tracking-wide text-secondary-700">
        {t("progress", { current: index + 1, total: STEPS.length })}
      </p>
      <div className="mt-2 flex gap-1.5" aria-hidden="true">
        {STEPS.map((s, i) => (
          <span key={s} className={`h-1.5 flex-1 rounded-full ${i <= index ? "bg-primary" : "bg-primary/10"}`} />
        ))}
      </div>

      <div className="mt-6 rounded-3xl bg-white p-6 shadow-e2 sm:p-8">
        <h1 className="font-serif text-heading text-primary-900">{stepTitle}</h1>
        <p className="mt-2 text-body text-primary-600">
          {step === "phone" ? t("steps.phone.descriptionNoCode") : t(`steps.${step}.description`)}
        </p>

        <div className="mt-6 flex flex-col gap-4">
          {step === "name" && (
            <form
              className="flex flex-col gap-4"
              onSubmit={(e) => {
                e.preventDefault();
                // An empty last name keeps the one given at sign-up.
                run(() => saveProfileDetailsAction({ firstName, lastName: lastName.trim() || undefined, arabicName }), nextStep);
              }}
            >
              <Input label={t("fields.firstName")} value={firstName} onChange={(e) => setFirstName(e.target.value)} required autoComplete="given-name" />
              <Input label={t("fields.lastName")} value={lastName} onChange={(e) => setLastName(e.target.value)} autoComplete="family-name" helper={t("fields.lastNameHelper")} />
              <Input label={t("fields.arabicName")} value={arabicName} onChange={(e) => setArabicName(e.target.value)} dir="rtl" helper={t("fields.optional")} />
              <Button type="submit" loading={busy}>{t("continue")}</Button>
            </form>
          )}

          {step === "phone" && (
            <form
              className="flex flex-col gap-4"
              onSubmit={(e) => {
                e.preventDefault();
                // No SMS code for now: the number is saved and the next step opens.
                run(() => requestPhoneCodeAction(phone), nextStep);
              }}
            >
              <Input
                label={t("fields.phone")}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="0555 12 34 56"
                dir="ltr"
                required
                helper={t("fields.phoneHelper")}
              />
              <Button type="submit" loading={busy}>{t("continue")}</Button>
            </form>
          )}

          {step === "birth" && (
            <form
              className="flex flex-col gap-4"
              onSubmit={(e) => {
                e.preventDefault();
                run(() => saveProfileDetailsAction({ dateOfBirth: birth }), nextStep);
              }}
            >
              <Input
                label={t("fields.birth")}
                type="date"
                value={birth}
                onChange={(e) => setBirth(e.target.value)}
                max={latestBirth}
                min="1900-01-01"
                required
                helper={t("fields.birthHelper")}
              />
              <Button type="submit" loading={busy}>{t("continue")}</Button>
            </form>
          )}

          {step === "languages" && (
            <form
              className="flex flex-col gap-5"
              onSubmit={(e) => {
                e.preventDefault();
                run(() => saveProfileDetailsAction({ preferredLocale: siteLocale, spokenLanguages: spoken }), nextStep);
              }}
            >
              <RadioGroup
                legend={t("fields.siteLanguage")}
                name="site-language"
                value={siteLocale}
                onChange={setSiteLocale}
                orientation="horizontal"
                appearance="card"
                options={[
                  { value: "ar", label: "العربية" },
                  { value: "fr", label: "Français" },
                  { value: "en", label: "English" },
                ]}
              />
              <fieldset>
                <legend className="text-body font-semibold text-primary-900">{t("fields.spoken")}</legend>
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {SPOKEN.map((codeValue) => (
                    <Checkbox
                      key={codeValue}
                      label={t(`languages.${codeValue}`)}
                      checked={spoken.includes(codeValue)}
                      onChange={(e) =>
                        setSpoken((list) => (e.target.checked ? [...list, codeValue] : list.filter((c) => c !== codeValue)))
                      }
                    />
                  ))}
                </div>
              </fieldset>
              <Button type="submit" loading={busy}>{t("continue")}</Button>
            </form>
          )}

          {step === "home" && (
            <form
              className="flex flex-col gap-4"
              onSubmit={(e) => {
                e.preventDefault();
                finish(false);
              }}
            >
              <Select
                label={t("fields.wilaya")}
                value={wilaya}
                onChange={(e) => setWilaya(e.target.value)}
                placeholderOption={t("fields.choose")}
                options={WILAYAS.map((w) => ({
                  value: String(w.code),
                  label: `${String(w.code).padStart(2, "0")} - ${locale === "ar" ? w.nameAr : w.name}`,
                }))}
              />
              <Select
                label={t("fields.commune")}
                value={commune}
                onChange={(e) => setCommune(e.target.value)}
                disabled={!communes.length}
                placeholderOption={t("fields.choose")}
                options={communes.map((c) => ({ value: String(c.id), label: c.name }))}
              />
              <label className="flex flex-col gap-1.5 text-body font-medium text-primary-900">
                {t("fields.bio")}
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value.slice(0, 500))}
                  rows={3}
                  className="rounded-xl border border-primary/15 px-3 py-2 text-body font-normal"
                  placeholder={t("fields.bioPlaceholder")}
                />
              </label>
              <Button type="submit" loading={busy}>{t("finish")}</Button>
              <button type="button" className="text-meta font-semibold text-primary-600 underline" onClick={() => finish(true)} disabled={busy}>
                {t("skipFinish")}
              </button>
            </form>
          )}

          {error && (
            <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-meta font-semibold text-status-error">
              {error}
            </p>
          )}
        </div>

        {index > 0 && step !== "home" && (
          <button type="button" className="mt-5 text-meta font-semibold text-primary-600 underline" onClick={() => go(STEPS[index - 1])}>
            {t("back")}
          </button>
        )}
      </div>
    </div>
  );
}
