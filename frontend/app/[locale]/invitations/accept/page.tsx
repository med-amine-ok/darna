import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { isActionErrorCode } from "@/lib/action-result";
import { getSessionUser } from "@/lib/server/session";
import { acceptInvitationAction } from "@/app/actions/organizations";
import Button from "@/components/ui/Button";
import { Banner } from "@/components/ui/Feedback";

export const dynamic = "force-dynamic";

interface AcceptPageProps {
  params: { locale: string };
  searchParams: { token?: string; error?: string };
}

export async function generateMetadata({ params }: { params: { locale: string } }): Promise<Metadata> {
  const t = await getTranslations({ locale: params.locale, namespace: "agencyTeam" });
  return { title: t("accept.metaTitle"), robots: { index: false, follow: false } };
}

/**
 * /invitations/accept?token=...: the link an organisation owner or admin
 * passes on (invitation emails are not sent yet). Joining is an explicit
 * button press (POST /invitations/accept through a server action), never a
 * side effect of opening the link. Signed-out visitors log in first.
 */
export default async function AcceptInvitationPage({ params, searchParams }: AcceptPageProps) {
  const { locale } = params;
  const token = typeof searchParams.token === "string" ? searchParams.token.slice(0, 200) : "";
  const self = `/${locale}/invitations/accept?token=${encodeURIComponent(token)}`;
  const user = await getSessionUser();
  if (!user) {
    redirect(`/${locale}/login?callbackUrl=${encodeURIComponent(self)}`);
  }

  const t = await getTranslations({ locale, namespace: "agencyTeam" });
  const tErrors = await getTranslations({ locale, namespace: "errors" });
  const errorCode = isActionErrorCode(searchParams.error) ? searchParams.error : null;

  async function accept() {
    "use server";
    const result = await acceptInvitationAction(token);
    if (!result.ok) {
      redirect(`${self}&error=${result.code}`);
    }
    redirect(`/${locale}/host`);
  }

  return (
    <div className="min-h-[calc(100dvh-5rem)] bg-darnaBg px-4 py-10 sm:px-6 lg:py-16">
      <div className="mx-auto w-full max-w-lg rounded-3xl bg-white p-6 shadow-e2 sm:p-10">
        <p className="text-eyebrow uppercase text-secondary-700">{t("eyebrow")}</p>
        <h1 className="mt-2 font-serif text-display-md text-primary-900 [text-wrap:balance]">{t("accept.title")}</h1>
        <p className="mt-3 text-body text-primary-600 [text-wrap:pretty]">
          {t("accept.description", { email: user.email || user.name })}
        </p>
        {!token && (
          <div className="mt-5">
            <Banner tone="danger">{tErrors("codes.INVITATION_INVALID")}</Banner>
          </div>
        )}
        {errorCode && (
          <div className="mt-5">
            <Banner tone="danger">{tErrors(`codes.${errorCode}`)}</Banner>
          </div>
        )}
        {token && (
          <form action={accept} className="mt-6">
            <Button type="submit" size="lg" fullWidth>
              {t("accept.join")}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
