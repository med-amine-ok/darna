import { redirectToCanonical } from "@/lib/canonical-redirect";

/** Legacy duplicate route, canonical page is /settings/audit-log. */
export default function AuditLogRedirect({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  redirectToCanonical("/settings/audit-log", searchParams);
}
