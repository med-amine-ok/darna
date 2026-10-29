import { guardPage } from "@/lib/auth/page-guard";
import TripsListClient from "./TripsListClient";
import { pageMetadata } from "@/lib/metadata";

export const generateMetadata = pageMetadata("trips");

export default async function TripsPage() {
  const denied = await guardPage("listings.view");
  if (denied) return denied;

  return <TripsListClient />;
}
