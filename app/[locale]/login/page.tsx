import { locales } from "@/i18n";
import getCurrentUser from "@/app/actions/getCurrentUser";
import { redirect } from "@/navigation";
import LoginClient from "./LoginClient";

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function LoginPage() {
  const currentUser = await getCurrentUser();

  return <LoginClient currentUser={currentUser} />;
}
