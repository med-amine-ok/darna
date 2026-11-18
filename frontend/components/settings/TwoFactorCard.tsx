"use client";

import React, { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "react-toastify";
import { useRouter } from "@/navigation";
import {
  confirmTotpEnrolmentAction,
  listAuthenticatorsAction,
  startTotpEnrolmentAction,
} from "@/app/actions/account";
import { useActionError } from "@/hook/useActionError";
import { Input } from "@/components/ui/Field";
import Button from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Banner } from "@/components/ui/Feedback";
import { SettingsCard } from "./settingsUi";

type Stage =
  | { kind: "idle" }
  | { kind: "setup"; secret: string; totpUrl: string }
  | { kind: "done"; recoveryCodes: string[] };

/**
 * Two-step verification with an authenticator app (BR-ACC-04): GET the
 * secret, the person adds it to the app, then confirms with a first code.
 * The 10 recovery codes are shown once, right after enrolment.
 */
export default function TwoFactorCard({ enabled: initiallyEnabled }: { enabled: boolean }) {
  const t = useTranslations("settings");
  const errorText = useActionError();
  const router = useRouter();
  const [enabled, setEnabled] = useState(initiallyEnabled);
  const [since, setSince] = useState<string | null>(null);
  const [stage, setStage] = useState<Stage>({ kind: "idle" });
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!initiallyEnabled) return;
    let alive = true;
    listAuthenticatorsAction()
      .then((result) => {
        if (alive && result.ok) setSince(result.data[0]?.createdAt ?? null);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [initiallyEnabled]);

  const start = async () => {
    setBusy(true);
    setError(null);
    try {
      const result = await startTotpEnrolmentAction();
      if (!result.ok) setError(errorText(result));
      else setStage({ kind: "setup", ...result.data });
    } catch {
      setError(t("twoFactor.failed"));
    } finally {
      setBusy(false);
    }
  };

  const confirm = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const result = await confirmTotpEnrolmentAction(code);
      if (!result.ok) {
        setError(errorText(result));
        return;
      }
      setEnabled(true);
      setCode("");
      setStage({ kind: "done", recoveryCodes: result.data.recoveryCodes });
      toast.success(t("twoFactor.enabledToast"));
      router.refresh();
    } catch {
      setError(t("twoFactor.failed"));
    } finally {
      setBusy(false);
    }
  };

  const copyCodes = async (codes: string[]) => {
    try {
      await navigator.clipboard.writeText(codes.join("\n"));
      toast.success(t("twoFactor.copied"));
    } catch {
      /* clipboard refused: the codes stay on screen */
    }
  };

  return (
    <SettingsCard title={t("twoFactor.title")} titleId="settings-2fa-title">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-meta text-primary-600">{t("twoFactor.description")}</p>
          <Badge tone={enabled ? "success" : "warning"}>{enabled ? t("twoFactor.on") : t("twoFactor.off")}</Badge>
        </div>
        {error && <Banner tone="danger">{error}</Banner>}

        {enabled && stage.kind !== "done" && (
          <p className="text-meta text-primary-700">
            {since ? t("twoFactor.enabledSince", { date: new Date(since).toLocaleDateString() }) : t("twoFactor.enabled")}
          </p>
        )}

        {!enabled && stage.kind === "idle" && (
          <div>
            <Button type="button" variant="secondary" loading={busy} onClick={start}>
              {t("twoFactor.start")}
            </Button>
          </div>
        )}

        {stage.kind === "setup" && (
          <form onSubmit={confirm} className="flex flex-col gap-4">
            <ol className="list-decimal space-y-2 ps-5 text-meta text-primary-700">
              <li>{t("twoFactor.step1")}</li>
              <li>
                {t("twoFactor.step2")}
                <div className="mt-2 break-all rounded-xl bg-darnaBg px-3 py-2 font-mono text-body tracking-wider text-primary-900" dir="ltr">
                  {stage.secret}
                </div>
                <a href={stage.totpUrl} className="mt-2 inline-block font-semibold text-primary-800 underline">
                  {t("twoFactor.openApp")}
                </a>
              </li>
              <li>{t("twoFactor.step3")}</li>
            </ol>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
              <Input
                id="settings-2fa-code"
                label={t("twoFactor.codeLabel")}
                inputMode="numeric"
                autoComplete="one-time-code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                containerClassName="sm:max-w-xs sm:flex-1"
              />
              <Button type="submit" variant="secondary" loading={busy} className="sm:mt-1">
                {t("twoFactor.confirm")}
              </Button>
              <Button type="button" variant="tertiary" disabled={busy} onClick={() => setStage({ kind: "idle" })} className="sm:mt-1">
                {t("cancel")}
              </Button>
            </div>
          </form>
        )}

        {stage.kind === "done" && stage.recoveryCodes.length > 0 && (
          <div className="flex flex-col gap-3">
            <Banner tone="warning">{t("twoFactor.recoveryIntro")}</Banner>
            <ul className="grid grid-cols-2 gap-2 font-mono text-body text-primary-900 sm:grid-cols-5" dir="ltr">
              {stage.recoveryCodes.map((c) => (
                <li key={c} className="rounded-lg bg-darnaBg px-2 py-1 text-center">
                  {c}
                </li>
              ))}
            </ul>
            <div className="flex gap-3">
              <Button type="button" variant="tertiary" onClick={() => copyCodes(stage.recoveryCodes)}>
                {t("twoFactor.copy")}
              </Button>
              <Button type="button" variant="secondary" onClick={() => setStage({ kind: "idle" })}>
                {t("twoFactor.savedThem")}
              </Button>
            </div>
          </div>
        )}
      </div>
    </SettingsCard>
  );
}
