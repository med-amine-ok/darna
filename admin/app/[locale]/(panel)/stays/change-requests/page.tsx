import ChangeRequestsClient from "@/components/management/ChangeRequestsClient";

export default function StayChangeRequestsPage() {
  return (
    <ChangeRequestsClient
      title="Demandes de modification d'hébergements"
      subtitle="Examinez et validez les modifications demandées par les hôtes sur leurs annonces publiées."
      backRoute="/stays"
    />
  );
}
