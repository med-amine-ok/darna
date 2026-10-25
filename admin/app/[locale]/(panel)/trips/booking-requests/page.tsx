import ChangeRequestsClient from "@/components/management/ChangeRequestsClient";

export default function TripBookingRequestsPage() {
  return (
    <ChangeRequestsClient
      title="Demandes de réservation de voyages"
      subtitle="Examinez et approuvez les demandes de participation aux circuits de groupe."
      backRoute="/trips"
    />
  );
}
