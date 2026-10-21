import { getAdminCoupons } from "@/lib/data/admin";
import AdminPromotionsClient from "@/components/admin/AdminPromotionsClient";

export default async function AdminPromotionsPage() {
  const coupons = await getAdminCoupons();
  return <AdminPromotionsClient initialCoupons={coupons} />;
}
