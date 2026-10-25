import CategoriesManagerClient from "@/components/management/CategoriesManagerClient";

export default function CarCategoriesPage() {
  return (
    <CategoriesManagerClient
      title="Catégories de véhicules"
      subtitle="Configurez les segments (SUV, Citadines, Berlines, Utilitaires)."
      backRoute="/cars"
      defaultVertical="vehicle"
      itemTypeLabel="catégorie"
    />
  );
}
