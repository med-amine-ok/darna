import "server-only";

import { api } from "@/lib/api/client";
import { logReadError, write } from "@/lib/api/mapping";
import { toApiSteps, toStepConfig, type ApiFlowVersion } from "@/lib/api/onboarding";
import type { AdminActor, HostType, OnboardingConfig, OnboardingStepConfig } from "@/lib/types";

/**
 * Host onboarding wizards, from the Django API (/admin/onboarding-flows).
 * Each host type has versioned flows: the screen edits the draft (or the
 * published version when there is no draft); saving writes the draft and
 * publishes it as the next immutable version (BR-CFG-02, BR-CFG-03).
 */

const HOST_TYPES: HostType[] = ["individual", "agency", "hotel", "hostel"];

async function versionsOf(hostType: HostType): Promise<ApiFlowVersion[]> {
  const answer = await api<{ results: ApiFlowVersion[] }>(`/admin/onboarding-flows/${hostType}/versions`);
  return answer.results ?? [];
}

/** The version the editor starts from: the draft, else the published one. */
function current(versions: ApiFlowVersion[]): ApiFlowVersion | null {
  return versions.find((v) => v.status === "draft") ?? versions.find((v) => v.status === "published") ?? null;
}

export async function getOnboardingConfig(): Promise<OnboardingConfig> {
  const perType = await Promise.all(
    HOST_TYPES.map(async (ht) => {
      try {
        return [ht, await versionsOf(ht)] as const;
      } catch (error) {
        logReadError(`onboarding flow ${ht}`, error);
        return [ht, [] as ApiFlowVersion[]] as const;
      }
    }),
  );
  let version = 0;
  let updatedAt = "";
  const flows = {} as OnboardingConfig["flows"];
  for (const [ht, versions] of perType) {
    const cur = current(versions);
    const published = versions.find((v) => v.status === "published");
    if (published) {
      version = Math.max(version, published.version);
      if (published.published_at && published.published_at > updatedAt) updatedAt = published.published_at;
    }
    flows[ht] = { steps: (cur?.steps ?? []).map(toStepConfig) };
  }
  return { version, updatedAt: updatedAt || new Date(0).toISOString(), publishedBy: "", flows };
}

/** Save the steps as the draft, then publish it. Validation errors of the backend come back as 422. */
export async function updateOnboardingFlow(
  hostType: HostType,
  steps: OnboardingStepConfig[],
  _actor: AdminActor,
): Promise<OnboardingConfig> {
  const before = current(await versionsOf(hostType));
  const body = { steps: toApiSteps(steps, before?.steps ?? []) };
  await write(() => api(`/admin/onboarding-flows/${hostType}/draft`, { method: "PUT", body }));
  await write(() => api(`/admin/onboarding-flows/${hostType}/publish`, { method: "POST" }));
  return getOnboardingConfig();
}
