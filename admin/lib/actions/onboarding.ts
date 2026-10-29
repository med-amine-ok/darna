"use server";

import * as onboarding from "@/lib/data/onboarding";
import { runAction, oneOf } from "@/lib/auth/run-action";
import type { HostType, OnboardingStepConfig } from "@/lib/types";

const HOST_TYPES: readonly HostType[] = ["individual", "agency", "hotel", "hostel"];

export async function getOnboardingConfig() {
  return runAction("onboarding.edit", () => onboarding.getOnboardingConfig());
}

export async function updateOnboardingFlow(hostType: HostType, steps: OnboardingStepConfig[]) {
  return runAction("onboarding.edit", (actor) => {
    if (!Array.isArray(steps)) throw new TypeError("Invalid steps");
    return onboarding.updateOnboardingFlow(oneOf(hostType, HOST_TYPES, "hostType"), steps, actor);
  });
}
