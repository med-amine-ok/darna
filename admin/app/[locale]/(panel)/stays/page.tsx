import { guardPage } from "@/lib/auth/page-guard";
import StaysListClient from "./StaysListClient";
import { pageMetadata } from "@/lib/metadata";

export const generateMetadata = pageMetadata("stays");

export default async function StaysPage() {
  const denied = await guardPage("listings.view");
  if (denied) return denied;

  return <StaysListClient />;
}
