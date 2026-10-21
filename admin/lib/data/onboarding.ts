// TODO: replace with Supabase query
import { store } from "@/lib/mock-data/store";
import { OnboardingConfig, HostType, OnboardingStepConfig } from "@/lib/types";
import { assertCan } from "@/lib/permissions";
import { logAudit } from "./audit";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function getOnboardingConfig(): Promise<OnboardingConfig> {
  await delay(120);
  return JSON.parse(JSON.stringify(store.onboardingConfig));
}

export async function updateOnboardingFlow(
  hostType: HostType,
  steps: OnboardingStepConfig[],
  actor: { id: string; name: string; role: any }
): Promise<OnboardingConfig> {
  assertCan(actor.role, "onboarding.edit");
  await delay(200);

  // Enforcement: Solo flow capped at 2 pages
  if (hostType === "individual" && steps.length > 2) {
    throw new Error("Individual host onboarding flow is strictly capped at a maximum of 2 pages.");
  }

  const prev = JSON.parse(JSON.stringify(store.onboardingConfig));
  const newConfig: OnboardingConfig = {
    ...store.onboardingConfig,
    version: store.onboardingConfig.version + 1,
    updatedAt: new Date().toISOString(),
    publishedBy: actor.name,
    flows: {
      ...store.onboardingConfig.flows,
      [hostType]: {
        ...store.onboardingConfig.flows[hostType],
        steps,
      },
    },
  };

  store.onboardingConfig = newConfig;

  await logAudit(
    actor,
    "ONBOARDING_CONFIG_PUBLISH",
    "onboarding",
    hostType,
    `Published version ${newConfig.version} for ${hostType} host flow (${steps.length} steps)`,
    prev.flows[hostType],
    newConfig.flows[hostType]
  );

  return newConfig;
}
