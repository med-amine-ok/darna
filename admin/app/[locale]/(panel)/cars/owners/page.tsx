import { guardPage } from "@/lib/auth/page-guard";
import { redirect } from "@/navigation";

export default async function CarOwnersPage() {
  const denied = await guardPage("hosts.view");
  if (denied) return denied;

  // Pre-filtered provider list to rental agencies
  redirect("/moderation/providers?category=rental_agency&status=all");
}
