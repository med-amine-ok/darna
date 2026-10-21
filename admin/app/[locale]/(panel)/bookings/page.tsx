import { listBookings } from "@/lib/data/bookings";
import BookingsClient from "./BookingsClient";

export default async function BookingsPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const status = typeof searchParams.status === "string" ? searchParams.status : "all";
  const vertical = typeof searchParams.vertical === "string" ? searchParams.vertical : "all";
  const search = typeof searchParams.search === "string" ? searchParams.search : undefined;

  const data = await listBookings({
    status,
    vertical,
    search,
    page: 1,
    pageSize: 12,
  });

  return (
    <BookingsClient
      initialData={data}
      initialStatus={status}
      initialVertical={vertical}
    />
  );
}
