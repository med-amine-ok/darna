import { listListings } from "@/lib/data/listings";
import ListingsClient from "./ListingsClient";

export default async function ListingsPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const status = typeof searchParams.status === "string" ? searchParams.status : "all";
  const vertical = typeof searchParams.vertical === "string" ? searchParams.vertical : "all";
  const search = typeof searchParams.search === "string" ? searchParams.search : undefined;

  const data = await listListings({
    status,
    vertical,
    search,
    page: 1,
    pageSize: 12,
  });

  return (
    <ListingsClient
      initialData={data}
      initialStatus={status}
      initialVertical={vertical}
    />
  );
}
