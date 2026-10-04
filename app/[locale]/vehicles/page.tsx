import ClientOnly from "@/components/ClientOnly";
import getCurrentUser from "@/app/actions/getCurrentUser";
import getListings from "@/app/actions/getListings";
import VehiclesClient from "@/components/vehicles/VehiclesClient";

export const metadata = {
  title: "Vehicles & 4x4 Rentals in Algeria | DARNA",
  description:
    "Rent 4x4 desert cruisers, luxury SUVs, and city cars across Algeria with comprehensive insurance and airport pick-up.",
};

export default async function VehiclesPage() {
  const allListings = await getListings();
  const currentUser = await getCurrentUser();

  const vehicleListings = allListings.filter(
    (l) => l.type === "Vehicles" || l.category === "Vehicles"
  );

  return (
    <ClientOnly>
      <VehiclesClient listings={vehicleListings} currentUser={currentUser} />
    </ClientOnly>
  );
}
