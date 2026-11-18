import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/navigation";
import { ApiError, api } from "@/lib/api/client";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { locale: string } }): Promise<Metadata> {
  const t = await getTranslations({ locale: params.locale, namespace: "auth" });
  return { title: t("verifyEmail.metaTitle"), robots: { index: false, follow: false } };
}

type Outcome = "verified" | "invalid" | "error";

/** Confirms the key of the emailed link (POST /auth/email/verify, ACC-01). Safe to open twice. */
async function verify(key: string | undefined): Promise<Outcome> {
  if (!key || key.length > 512) return "invalid";
  try {
    await api("/auth/email/verify", { method: "POST", body: { key }, anonymous: true });
    return "verified";
  } catch (error) {
    if (error instanceof ApiError && error.status === 400) return "invalid";
    console.error("[verify-email]", error);
    return "error";
  }
}

export default async function VerifyEmailPage({
  params,
  searchParams,
}: {
  params: { locale: string };
  searchParams: { key?: string };
}) {
  const t = await getTranslations({ locale: params.locale, namespace: "auth" });
  const outcome = await verify(typeof searchParams?.key === "string" ? searchParams.key : undefined);

  return (
    <div className="min-h-[calc(100dvh-5rem)] bg-darnaBg px-4 py-12 sm:py-20">
      <div className="mx-auto w-full max-w-lg rounded-3xl bg-white p-8 text-center shadow-e2">
        <h1 className="font-serif text-display-md text-primary-900">{t(`verifyEmail.${outcome}Title`)}</h1>
        <p className="mt-3 text-body text-primary-600">{t(`verifyEmail.${outcome}Body`)}</p>
        <Link
          href={outcome === "verified" ? "/" : "/settings"}
          className="mt-8 inline-flex min-h-[44px] items-center rounded-full bg-primary-800 px-6 font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2"
        >
          {outcome === "verified" ? t("verifyEmail.continue") : t("verifyEmail.toSettings")}
        </Link>
      </div>
    </div>
  );
}
