import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { RECOVERY_SHOWN_COOKIE } from "@/lib/auth/cookies";
import { getCurrentAdmin } from "@/lib/auth/current-admin";
import { normalizeLocale, safeReturnTo } from "@/lib/auth/return-to";
import LoginForm from "./LoginForm";
import { pageMetadata } from "@/lib/metadata";

export const generateMetadata = pageMetadata("login");

export default async function LoginPage({
  params,
  searchParams,
}: {
  params: { locale: string };
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const locale = normalizeLocale(params.locale);
  const rawReturnTo = typeof searchParams.returnTo === "string" ? searchParams.returnTo : undefined;
  const returnTo = safeReturnTo(rawReturnTo, locale);
  const expired = searchParams.expired === "1";

  // Already signed in with a session the backend still accepts -> skip the form.
  // (Done here rather than in middleware, which only sees that a cookie exists.)
  // Not while the one-time recovery codes are on screen after an enrolment.
  const showingRecovery = cookies().get(RECOVERY_SHOWN_COOKIE)?.value === "1";
  if (!showingRecovery && (await getCurrentAdmin())) {
    redirect(returnTo);
  }

  return <LoginForm returnTo={returnTo} expired={expired} />;
}
