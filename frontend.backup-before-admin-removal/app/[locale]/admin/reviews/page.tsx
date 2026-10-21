import { getAdminReviews } from "@/lib/data/admin";
import AdminReviewsClient from "@/components/admin/AdminReviewsClient";

export default async function AdminReviewsPage() {
  const reviews = await getAdminReviews();
  return <AdminReviewsClient initialReviews={reviews} />;
}
