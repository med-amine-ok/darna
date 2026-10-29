import { guardPage } from "@/lib/auth/page-guard";
import ExperienceWizardClient from "../../../(panel)/experiences/new/ExperienceWizardClient";
import { pageMetadata } from "@/lib/metadata";

export const generateMetadata = pageMetadata("trips_new");

export default async function NewTripPage() {
  const denied = await guardPage("listings.approve");
  if (denied) return denied;

  return <ExperienceWizardClient />;
}
