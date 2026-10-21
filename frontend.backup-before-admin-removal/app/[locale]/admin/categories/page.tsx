import { getAdminCategories } from "@/lib/data/admin";
import AdminCategoriesClient from "@/components/admin/AdminCategoriesClient";

export default async function AdminCategoriesPage() {
  const categories = await getAdminCategories();
  return <AdminCategoriesClient initialCategories={categories} />;
}
