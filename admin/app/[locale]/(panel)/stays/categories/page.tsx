import CategoriesManagerClient from "@/components/management/CategoriesManagerClient";

export default function StayCategoriesPage() {
  return (
    <CategoriesManagerClient
      title="Catégories d'hébergements"
      subtitle="Configurez les catégories et types de propriétés affichés aux voyageurs."
      backRoute="/stays"
      defaultVertical="home"
      itemTypeLabel="catégorie"
    />
  );
}
