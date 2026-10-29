import { guardPage } from "@/lib/auth/page-guard";
import ExperienceWizardClient from "./ExperienceWizardClient";
import { pageMetadata } from "@/lib/metadata";

export const generateMetadata = pageMetadata("experiences_new");

export default async function NewExperiencePage() {
  const denied = await guardPage("listings.approve");
  if (denied) return denied;

  return <ExperienceWizardClient />;
}
