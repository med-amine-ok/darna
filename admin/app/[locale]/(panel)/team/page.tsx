import { redirectToCanonical } from "@/lib/canonical-redirect";

/** Legacy duplicate route — canonical page is /settings/team. */
export default function TeamRedirect({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  redirectToCanonical("/settings/team", searchParams);
}
