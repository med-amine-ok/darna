import { redirect } from "next/navigation";

export default async function StayAmenitiesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect(`/${locale}/stays/categories`);
}
