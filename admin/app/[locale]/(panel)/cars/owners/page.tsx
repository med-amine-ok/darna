import { redirect } from "@/navigation";

export default function CarOwnersPage() {
  // Pre-filtered provider list to rental agencies
  redirect("/moderation/providers?category=rental_agency&status=all");
}
