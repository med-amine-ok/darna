import { guardPage } from "@/lib/auth/page-guard";
import { redirect } from "@/navigation";

export default async function CarRentalsPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const denied = await guardPage("bookings.view");
  if (denied) return denied;

  // Saved view redirect to bookings with vertical=cars
  const status = typeof searchParams.status === "string" ? searchParams.status : "all";
  redirect(`/bookings?vertical=cars${status !== "all" ? `&status=${status}` : ""}`);
}
