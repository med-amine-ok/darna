import { redirect } from "next/navigation";
import { getCurrentAdmin } from "@/lib/auth/current-admin";
import { normalizeLocale, safeReturnTo } from "@/lib/auth/return-to";
import { listDevDemoAccounts } from "@/lib/data/credentials";
import LoginForm, { type DemoAccount } from "./LoginForm";
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

  // Already signed in with a session that is still valid against the admin
  // store -> skip the form. (Done here rather than in middleware, which can
  // only see the JWT and would loop on revoked/deactivated sessions.)
  if (await getCurrentAdmin()) {
    redirect(returnTo);
  }

  // Quick-fill demo accounts exist only in `next dev`. Only emails/roles are
  // sent to the client; the password is fetched on click by a dev-only action.
  const demoAccounts: DemoAccount[] = await listDevDemoAccounts();

  return <LoginForm returnTo={returnTo} demoAccounts={demoAccounts} />;
}
