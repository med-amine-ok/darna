import { redirectToCanonical } from "@/lib/canonical-redirect";

/** Legacy duplicate route, canonical page is /moderation/providers. */
export default function ProvidersRedirect({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  redirectToCanonical("/moderation/providers", searchParams);
}
