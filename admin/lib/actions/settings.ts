"use server";

import * as settings from "@/lib/data/settings";
import { runAction, obj } from "@/lib/auth/run-action";
import type { PlatformSettings } from "@/lib/types";

export async function getPlatformSettings() {
  return runAction("settings.manage", () => settings.getPlatformSettings());
}

export async function updatePlatformSettings(updates: Partial<PlatformSettings>) {
  return runAction("settings.manage", (actor) => settings.updatePlatformSettings(obj(updates, "settings"), actor));
}
