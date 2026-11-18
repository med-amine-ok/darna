"use client";

import React, { useEffect, useId, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "react-toastify";
import { updateProfileHandleAction } from "@/app/actions/account";
import { useActionError } from "@/hook/useActionError";
import { absoluteUrl, copyText, shareLink } from "@/lib/client/share";
import { userProfileHref } from "@/lib/host-profile";

/**
 * The owner's public profile link (/users/<handle>, ACC-06): shown on their
 * own profile so they can copy or share it, and change the name in it.
 * Anyone with the link sees the public profile only (no email, phone or address).
 */
export default function ProfileLinkCard({ userId, handle }: { userId: string; handle?: string }) {
  const t = useTranslations("profile");
  const locale = useLocale();
  const actionError = useActionError();
  const inputId = useId();
  const [current, setCurrent] = useState(handle ?? "");
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(handle ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const path = userProfileHref(userId, current);
  // The site origin is only known in the browser: show the path first, the full link after mount.
  const [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(window.location.origin), []);
  const display = `${origin}/${locale}${path}`;

  const onCopy = async () => {
    const outcome = await copyText(absoluteUrl(path, locale));
    if (outcome === "copied") toast.success(t("profileLink.copied"));
    else toast.error(t("page.copyFailed"));
  };

  const onShare = async () => {
    const outcome = await shareLink({ url: absoluteUrl(path, locale), title: t("profileLink.shareTitle") });
    if (outcome === "copied") toast.success(t("profileLink.copied"));
    else if (outcome === "failed") toast.error(t("page.copyFailed"));
  };

  const onSave = async (event: React.FormEvent) => {
    event.preventDefault();
    const wanted = draft.trim().toLowerCase();
    if (wanted === current) {
      setEditing(false);
      return;
    }
    setSaving(true);
    const result = await updateProfileHandleAction(wanted);
    setSaving(false);
    if (!result.ok) {
      setError(actionError(result));
      return;
    }
    setError(null);
    setCurrent(result.data.handle);
    setDraft(result.data.handle);
    setEditing(false);
    toast.success(t("profileLink.saved"));
  };

  return (
    <section aria-labelledby={`${inputId}-title`} className="rounded-2xl bg-white shadow-e1 p-4 sm:p-5">
      <h2 id={`${inputId}-title`} className="text-sm font-semibold text-primary-900">
        {t("profileLink.title")}
      </h2>
      <p className="mt-1 text-xs text-primary-600">{t("profileLink.hint")}</p>

      {!editing ? (
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
          <code dir="ltr" className="flex-1 truncate rounded-xl bg-darnaBg px-3 py-2 text-xs text-primary-800">
            {display}
          </code>
          <div className="flex gap-2">
            <button type="button" onClick={onCopy} className="rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-white">
              {t("profileLink.copy")}
            </button>
            <button type="button" onClick={onShare} className="rounded-xl border border-primary/15 px-3 py-2 text-xs font-semibold text-primary-800">
              {t("shareProfile")}
            </button>
            <button
              type="button"
              onClick={() => {
                setDraft(current);
                setEditing(true);
              }}
              className="rounded-xl px-3 py-2 text-xs font-semibold text-secondary-700 underline-offset-2 hover:underline"
            >
              {t("profileLink.change")}
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={onSave} className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label htmlFor={inputId} className="block text-xs font-medium text-primary-800">
              {t("profileLink.label")}
            </label>
            <div dir="ltr" className="mt-1 flex items-center rounded-xl border border-primary/15 bg-white px-3 text-xs">
              <span className="text-primary-500">/users/</span>
              <input
                id={inputId}
                value={draft}
                onChange={(e) =>
                  // Spaces become hyphens; anything else outside a-z, 0-9 and "-" is dropped.
                  setDraft(e.target.value.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "").replace(/-{2,}/g, "-"))
                }
                minLength={3}
                maxLength={30}
                required
                autoComplete="off"
                spellCheck={false}
                className="flex-1 bg-transparent py-2 outline-none"
                aria-describedby={`${inputId}-rules`}
              />
            </div>
            <p id={`${inputId}-rules`} className="mt-1 text-[11px] text-primary-500">
              {t("profileLink.rules")}
            </p>
            {error && (
              <p role="alert" className="mt-1 text-[11px] font-medium text-accent-700">
                {error}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={saving} className="rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-white disabled:opacity-60">
              {t("profileLink.save")}
            </button>
            <button
              type="button"
              onClick={() => {
                setEditing(false);
                setError(null);
              }}
              className="rounded-xl px-3 py-2 text-xs font-semibold text-primary-700">
              {t("profileLink.cancel")}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
