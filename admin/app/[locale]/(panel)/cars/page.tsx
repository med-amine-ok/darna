import { guardPage } from "@/lib/auth/page-guard";
import CarsListClient from "./CarsListClient";
import { pageMetadata } from "@/lib/metadata";

export const generateMetadata = pageMetadata("cars");

export default async function CarsPage() {
  const denied = await guardPage("listings.view");
  if (denied) return denied;

  return <CarsListClient />;
}
