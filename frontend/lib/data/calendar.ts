// TODO: replace with Supabase query
import { DateAvailabilityOverride } from "@/types";

export const mockAvailabilityOverrides: DateAvailabilityOverride[] = [
  {
    id: "ovr_01",
    listingId: "lst_tipaza_villa",
    date: "2024-06-25",
    isBlocked: true,
    note: "Host maintenance",
  },
  {
    id: "ovr_02",
    listingId: "lst_tipaza_villa",
    date: "2024-07-05",
    isBlocked: false,
    customPrice: 22000,
    note: "Peak summer weekend",
  },
];

export async function getAvailabilityOverrides(
  listingId: string
): Promise<DateAvailabilityOverride[]> {
  await new Promise((resolve) => setTimeout(resolve, 60));
  return mockAvailabilityOverrides.filter((ov) => ov.listingId === listingId);
}
