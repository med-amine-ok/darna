import { guardPage } from "@/lib/auth/page-guard";
import { getLocale } from "next-intl/server";
import OnboardingClient from "./OnboardingClient";
import { pageMetadata } from "@/lib/metadata";

export const generateMetadata = pageMetadata("settings_onboarding");

export default async function SettingsOnboardingPage() {
  const denied = await guardPage("onboarding.edit");
  if (denied) return denied;

  const locale = await getLocale();
  return <OnboardingClient locale={locale} />;
}
