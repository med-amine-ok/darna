// TODO: replace with Supabase query
import { store } from "@/lib/mock-data/store";
import { PlatformSettings } from "@/lib/types";
import { assertCan } from "@/lib/permissions";
import { logAudit } from "./audit";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function getPlatformSettings(): Promise<PlatformSettings> {
  await delay(100);
  return { ...store.platformSettings };
}

export async function updatePlatformSettings(
  updates: Partial<PlatformSettings>,
  actor: { id: string; name: string; role: any }
): Promise<PlatformSettings> {
  assertCan(actor.role, "settings.manage");
  await delay(200);

  const prev = { ...store.platformSettings };
  store.platformSettings = {
    ...store.platformSettings,
    ...updates,
  };

  await logAudit(
    actor,
    "PLATFORM_SETTINGS_UPDATE",
    "setting",
    "platform_config",
    "Updated platform configuration settings",
    prev,
    store.platformSettings
  );

  return { ...store.platformSettings };
}
