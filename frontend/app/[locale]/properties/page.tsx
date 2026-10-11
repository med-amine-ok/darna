import Container from "@/components/Container";
import { getListings } from "@/lib/data/listings";
import PropertiesClient from "@/components/properties/PropertiesClient";

export default async function PropertiesPage() {
  const listings = await getListings();

  return (
    <div className="min-h-screen bg-bg-light/40 py-10">
      <Container>
        <PropertiesClient initialListings={listings} />
      </Container>
    </div>
  );
}
