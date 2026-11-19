import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getSessionUser } from "@/lib/server/session";
import { safeCallbackUrl } from "@/lib/auth/callback-url";
import ProfileSetupWizard from "@/components/welcome/ProfileSetupWizard";
import { getAuthProviders } from "@/lib/api/providers";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { locale: string } }): Promise<Metadata> {
  const t = await getTranslations({ locale: params.locale, namespace: "welcome" });
  return { title: t("metaTitle"), robots: { index: false, follow: false } };
}

/**
 * /welcome: 'complete your profile' right after sign-up (ACC-11). Signed-out
 * visitors go to login; people who already finished go on to where they were heading.
 */
export default async function WelcomePage({
  params,
  searchParams,
}: {
  params: { locale: string };
  searchParams: { callbackUrl?: string };
}) {
  const locale = params.locale || "fr";
  const callbackUrl = safeCallbackUrl(searchParams.callbackUrl, locale);
  const user = await getSessionUser();
  if (!user) {
    redirect(`/${locale}/login?callbackUrl=${encodeURIComponent(`/${locale}/welcome`)}`);
  }
  if (user.profileComplete) {
    redirect(callbackUrl);
  }
  const { phoneOtpRequired } = await getAuthProviders();
  return (
    <div className="min-h-[calc(100dvh-5rem)] bg-darnaBg px-4 py-8 sm:py-12">
      <ProfileSetupWizard user={user} callbackUrl={callbackUrl} phoneOtpRequired={phoneOtpRequired} />
    </div>
  );
}
