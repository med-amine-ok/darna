import "server-only";

import { api } from "@/lib/api/client";
import { dzd, fetchPage, logReadError, minor, write, emptyPage } from "@/lib/api/mapping";
import { STAFF_IDLE_SECONDS } from "@/lib/auth/cookies";
import type { AdminActor, HostType, PaginatedResult, PlatformSettings, SettingsVersion } from "@/lib/types";

/**
 * Platform settings, from the Django API (/admin/settings, versioned and
 * audited, BR-CFG-01). Only the keys the backend knows can be changed:
 * maintenance mode, instant booking, request window, default credit floor
 * and the top-up second-approval threshold. Default commission rates live
 * on /admin/commission-rates (finance screen).
 */

interface ApiSettingsBody {
  version: number;
  data: {
    commission_bp?: Partial<Record<HostType, number>>;
    request_ttl_hours?: number;
    credit_limit_minor?: number;
    topup_four_eyes_minor?: number;
    instant_booking_enabled?: boolean;
    maintenance_mode?: boolean;
    [key: string]: unknown;
  };
  created_by: { id: string; display_name: string } | null;
  created_at: string | null;
}

function toSettings(body: ApiSettingsBody): PlatformSettings {
  const d = body.data ?? {};
  const bp = d.commission_bp ?? {};
  return {
    platformName: "BLADUS",
    supportEmail: "",
    supportPhone: "",
    defaultLocale: "fr",
    enabledLocales: ["fr", "ar", "en"],
    primaryCurrency: "DZD",
    supportedCurrencies: ["DZD"],
    guestServiceFeePercent: 0,
    serviceFeePercent: 0,
    defaultCommissionRates: {
      individual: (bp.individual ?? 0) / 100,
      agency: (bp.agency ?? 0) / 100,
      hotel: (bp.hotel ?? 0) / 100,
      hostel: (bp.hostel ?? 0) / 100,
    },
    instantBookingPlatformWide: Boolean(d.instant_booking_enabled),
    maintenanceMode: Boolean(d.maintenance_mode),
    // Staff sessions: 30 minutes idle, second factor always required (backend rules, not settings).
    sessionTimeoutMinutes: STAFF_IDLE_SECONDS / 60,
    twoFactorAuthEnabled: true,
    security: { sessionTimeoutMinutes: STAFF_IDLE_SECONDS / 60, twoFactorRequired: true },
    requestTtlHours: d.request_ttl_hours,
    creditLimitDzd: d.credit_limit_minor !== undefined ? dzd(d.credit_limit_minor) : undefined,
    topupFourEyesDzd: d.topup_four_eyes_minor !== undefined ? dzd(d.topup_four_eyes_minor) : undefined,
    settingsVersion: body.version,
    settingsUpdatedAt: body.created_at,
    settingsUpdatedBy: body.created_by?.display_name ?? null,
  };
}

export async function getPlatformSettings(): Promise<PlatformSettings> {
  return toSettings(await api<ApiSettingsBody>("/admin/settings"));
}

/** Sends only the keys the backend accepts and that the caller gave. */
export async function updatePlatformSettings(
  updates: Partial<PlatformSettings>,
  _actor: AdminActor,
): Promise<PlatformSettings> {
  const body: Record<string, unknown> = {};
  if (typeof updates.maintenanceMode === "boolean") body.maintenance_mode = updates.maintenanceMode;
  if (typeof updates.instantBookingPlatformWide === "boolean") body.instant_booking_enabled = updates.instantBookingPlatformWide;
  if (typeof updates.requestTtlHours === "number") body.request_ttl_hours = Math.round(updates.requestTtlHours);
  if (typeof updates.creditLimitDzd === "number") body.credit_limit_minor = minor(updates.creditLimitDzd);
  if (typeof updates.topupFourEyesDzd === "number") body.topup_four_eyes_minor = minor(updates.topupFourEyesDzd);
  if (Object.keys(body).length === 0) return getPlatformSettings();
  return toSettings(await write(() => api<ApiSettingsBody>("/admin/settings", { method: "PATCH", body })));
}

/** Settings history, newest first. */
export async function listSettingsVersions(page = 1, pageSize = 20): Promise<PaginatedResult<SettingsVersion>> {
  try {
    return await fetchPage<ApiSettingsBody, SettingsVersion>(
      "/admin/settings/versions",
      (row) => ({
        version: row.version,
        createdAt: row.created_at,
        createdBy: row.created_by?.display_name ?? null,
        data: row.data ?? {},
      }),
      { page, pageSize },
    );
  } catch (error) {
    logReadError("settings versions", error);
    return emptyPage<SettingsVersion>(page, pageSize);
  }
}
