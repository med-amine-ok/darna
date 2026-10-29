import { guardPage } from "@/lib/auth/page-guard";
import { redirect } from "next/navigation";

export default async function StayAmenitiesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const denied = await guardPage("categories.manage");
  if (denied) return denied;

  const { locale } = await params;
  redirect(`/${locale}/stays/categories`);
}
