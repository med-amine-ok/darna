import CategoriesManagerClient from "@/components/management/CategoriesManagerClient";

export default function CarPricingPage() {
  return (
    <CategoriesManagerClient
      title="Grille tarifaire des locations"
      subtitle="Configurez les remises dégressives selon la durée de réservation (1-3j, 4-7j, +15j)."
      backRoute="/cars"
      defaultVertical="vehicle"
      itemTypeLabel="paliers de durée"
    />
  );
}
