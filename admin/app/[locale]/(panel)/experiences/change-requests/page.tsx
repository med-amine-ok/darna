import { getTranslations } from "next-intl/server";
import { guardPage } from "@/lib/auth/page-guard";
import ChangeRequestsClient from "@/components/management/ChangeRequestsClient";
import { pageMetadata } from "@/lib/metadata";

export const generateMetadata = pageMetadata("experiences_changerequests");

export default async function ExperienceChangeRequestsPage() {
  const denied = await guardPage("listings.approve");
  if (denied) return denied;
  const t = await getTranslations("experiences");

  return (
    <ChangeRequestsClient
      title={t("changeRequestsPage.title")}
      subtitle={t("changeRequestsPage.subtitle")}
      backRoute="/experiences"
    />
  );
}
