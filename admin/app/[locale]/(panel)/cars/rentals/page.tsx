import { redirect } from "@/navigation";

export default function CarRentalsPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  // Saved view redirect to bookings with vertical=cars
  const status = typeof searchParams.status === "string" ? searchParams.status : "all";
  redirect(`/bookings?vertical=cars${status !== "all" ? `&status=${status}` : ""}`);
}
