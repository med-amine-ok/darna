import { getLocale } from "next-intl/server";
import OnboardingClient from "../../onboarding/OnboardingClient";

export default async function SettingsOnboardingPage() {
  const locale = await getLocale();
  return <OnboardingClient locale={locale} />;
}
