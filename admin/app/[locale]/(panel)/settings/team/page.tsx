import { guardPage } from "@/lib/auth/page-guard";
import { getLocale } from "next-intl/server";
import TeamClient from "./TeamClient";
import { pageMetadata } from "@/lib/metadata";

export const generateMetadata = pageMetadata("settings_team");

export default async function SettingsTeamPage() {
  const denied = await guardPage("team.manage");
  if (denied) return denied;

  const locale = await getLocale();
  return <TeamClient locale={locale} />;
}
