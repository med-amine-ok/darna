import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { getTripById } from "@/lib/data/trips";
import { getCurrentUser } from "@/lib/data/auth";
import TripDetailClient from "@/components/trips/TripDetailClient";

export const dynamic = "force-dynamic";

interface TripPageProps {
  params: {
    tripId: string;
    locale: string;
  };
}

export default async function TripDetailPage({ params }: TripPageProps) {
  const trip = await getTripById(params.tripId);

  if (!trip) {
    notFound();
  }

  const cookieStore = cookies();
  const cookieUserId = cookieStore.get("darna_user_id")?.value;
  const currentUser = await getCurrentUser(cookieUserId);

  return (
    <main className="min-h-[100dvh] flex flex-col bg-darnaBg">
      <TripDetailClient trip={trip} currentUser={currentUser} />
    </main>
  );
}
