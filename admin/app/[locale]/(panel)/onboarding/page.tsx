import { redirectToCanonical } from "@/lib/canonical-redirect";

/** Legacy duplicate route, canonical page is /settings/onboarding. */
export default function OnboardingRedirect({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  redirectToCanonical("/settings/onboarding", searchParams);
}
