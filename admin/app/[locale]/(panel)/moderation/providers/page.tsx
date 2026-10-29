import { guardPage } from "@/lib/auth/page-guard";
import ProvidersValidationClient from "./ProvidersValidationClient";
import { pageMetadata } from "@/lib/metadata";

export const generateMetadata = pageMetadata("moderation_providers");

export default async function ProvidersValidationPage() {
  const denied = await guardPage("hosts.view");
  if (denied) return denied;

  return <ProvidersValidationClient />;
}
