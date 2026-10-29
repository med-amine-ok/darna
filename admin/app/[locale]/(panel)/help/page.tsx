import { guardPage } from "@/lib/auth/page-guard";
import HelpClient from "./HelpClient";
import { pageMetadata } from "@/lib/metadata";

export const generateMetadata = pageMetadata("help");

export default async function HelpPage() {
  const denied = await guardPage(null);
  if (denied) return denied;

  return <HelpClient />;
}
