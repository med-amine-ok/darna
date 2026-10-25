import CategoriesManagerClient from "@/components/management/CategoriesManagerClient";

export default function ExperienceCategoriesPage() {
  return (
    <CategoriesManagerClient
      title="Catégories d'expériences"
      subtitle="Organisez les thématiques d'activités (Aventure, Culture, Gastronomie, etc.)."
      backRoute="/experiences"
      defaultVertical="experience"
      itemTypeLabel="catégorie"
    />
  );
}
