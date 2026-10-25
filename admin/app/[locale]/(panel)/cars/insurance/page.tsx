import CategoriesManagerClient from "@/components/management/CategoriesManagerClient";

export default function CarInsurancePage() {
  return (
    <CategoriesManagerClient
      title="Formules d'assurance automobile"
      subtitle="Gérez les contrats d'assurance tous risques, franchise et options de couverture."
      backRoute="/cars"
      defaultVertical="vehicle"
      itemTypeLabel="formule d'assurance"
    />
  );
}
