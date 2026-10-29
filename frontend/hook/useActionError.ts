"use client";

import { useCallback } from "react";
import { useLocale, useTranslations } from "next-intl";
import { isActionErrorCode, type ActionErrorParams } from "@/lib/action-result";
import { formatDzd } from "@/lib/currency";

/** Anything shaped like a failed ActionResult / auth API body (or nothing). */
export type ActionErrorLike = { code?: unknown; params?: ActionErrorParams | null } | null | undefined;

/** Params that are DZD amounts and must go through formatDzd. */
const MONEY_PARAMS: Partial<Record<string, string[]>> = {
  PRICE_RANGE: ["min", "max"],
};

/**
 * Maps a server error code (+ ICU params) to translated text from
 * `errors.codes.*`. Unknown or missing codes fall back to `fallback` (already
 * translated by the caller) or the generic `errors.generic` message.
 */
export function useActionError() {
  const t = useTranslations("errors");
  const locale = useLocale();
  return useCallback(
    (error: ActionErrorLike, fallback?: string): string => {
      if (!error || !isActionErrorCode(error.code)) return fallback ?? t("generic");
      const params: ActionErrorParams = { ...(error.params ?? {}) };
      for (const key of MONEY_PARAMS[error.code] ?? []) {
        if (typeof params[key] === "number") params[key] = formatDzd(params[key] as number, locale);
      }
      return t(`codes.${error.code}`, params);
    },
    [t, locale]
  );
}

/** Reads `{ code, params }` from a failed auth API response body. */
export async function readErrorBody(res: Response): Promise<ActionErrorLike> {
  const body = (await res.json().catch(() => null)) as ActionErrorLike;
  return body && typeof body === "object" ? body : null;
}
