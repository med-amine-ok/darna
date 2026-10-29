import { guardPage } from "@/lib/auth/page-guard";
import ExperiencesListClient from "./ExperiencesListClient";
import { pageMetadata } from "@/lib/metadata";

export const generateMetadata = pageMetadata("experiences");

export default async function ExperiencesPage() {
  const denied = await guardPage("listings.view");
  if (denied) return denied;

  return <ExperiencesListClient />;
}
