import { redirectToCanonical } from "@/lib/canonical-redirect";

/** Legacy duplicate route — canonical page is /payments. */
export default function FinanceRedirect({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  redirectToCanonical("/payments", searchParams);
}
