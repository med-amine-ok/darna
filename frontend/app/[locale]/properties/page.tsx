import { redirect } from "next/navigation";

/**
 * "Manage properties" used to be a second, local-state-only copy of the host
 * listings manager. The host dashboard (/host/listings) is the single place
 * to manage listings (server actions, ownership checks).
 */
export default function PropertiesPage({ params }: { params: { locale: string } }) {
  redirect(`/${params?.locale || "en"}/host/listings`);
}
