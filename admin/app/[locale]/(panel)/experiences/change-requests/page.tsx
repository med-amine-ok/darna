import ChangeRequestsClient from "@/components/management/ChangeRequestsClient";

export default function ExperienceChangeRequestsPage() {
  return (
    <ChangeRequestsClient
      title="Demandes de modification d'expériences"
      subtitle="Validez les mises à jour de parcours, de tarifs ou de conditions soumises par les guides."
      backRoute="/experiences"
    />
  );
}
