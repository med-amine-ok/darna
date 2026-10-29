import { guardPage } from "@/lib/auth/page-guard";
import { redirect } from "@/navigation";

export default async function ModerationIndexPage() {
  const denied = await guardPage("hosts.view");
  if (denied) return denied;

  redirect("/moderation/providers");
}
