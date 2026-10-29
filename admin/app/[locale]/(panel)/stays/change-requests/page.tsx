import { getTranslations } from "next-intl/server";
import { guardPage } from "@/lib/auth/page-guard";
import ChangeRequestsClient from "@/components/management/ChangeRequestsClient";
import { pageMetadata } from "@/lib/metadata";

export const generateMetadata = pageMetadata("stays_changerequests");

export default async function StayChangeRequestsPage() {
  const denied = await guardPage("listings.approve");
  if (denied) return denied;

  const t = await getTranslations("stays");

  return (
    <ChangeRequestsClient
      title={t("changeRequestsPage.title")}
      subtitle={t("changeRequestsPage.subtitle")}
      backRoute="/stays"
    />
  );
}
