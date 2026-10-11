import Container from "@/components/Container";
import { getOrganizationById, getOrganizationMembers } from "@/lib/data/organizations";
import { getHostListings } from "@/lib/data/listings";
import AgencyProfileClient from "@/components/agency/AgencyProfileClient";
import { notFound } from "next/navigation";

export default async function AgencyPublicProfilePage({
  params,
}: {
  params: { organizationId: string };
}) {
  const organization = await getOrganizationById(params.organizationId);

  if (!organization) {
    return notFound();
  }

  const members = await getOrganizationMembers(organization.id);
  const listings = await getHostListings(organization.id);

  return (
    <div className="min-h-screen bg-bg-light/40 py-10">
      <Container>
        <AgencyProfileClient
          organization={organization}
          members={members}
          listings={listings}
        />
      </Container>
    </div>
  );
}
