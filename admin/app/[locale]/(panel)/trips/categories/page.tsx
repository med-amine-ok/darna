import CategoriesManagerClient from "@/components/management/CategoriesManagerClient";

export default function TripCategoriesPage() {
  return (
    <CategoriesManagerClient
      title="Catégories de voyages organisés"
      subtitle="Gérez les types de circuits (Sahara, Bivouac, Séjours culturels)."
      backRoute="/trips"
      defaultVertical="trip"
      itemTypeLabel="catégorie"
    />
  );
}
