import { getLocale } from "next-intl/server";
import TeamClient from "../../team/TeamClient";

export default async function SettingsTeamPage() {
  const locale = await getLocale();
  return <TeamClient locale={locale} />;
}
