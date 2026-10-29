import { guardPage } from "@/lib/auth/page-guard";
import StayWizardClient from "./StayWizardClient";
import { pageMetadata } from "@/lib/metadata";

export const generateMetadata = pageMetadata("stays_new");

export default async function NewStayPage() {
  const denied = await guardPage("listings.approve");
  if (denied) return denied;

  return <StayWizardClient />;
}
