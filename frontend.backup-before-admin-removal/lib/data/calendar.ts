// TODO: replace with Supabase query
import { DateAvailabilityOverride } from "@/types";

export const mockAvailabilityOverrides: DateAvailabilityOverride[] = [
  {
    id: "ovr_01",
    listingId: "lst_tipaza_villa",
    date: "2026-11-15",
    isBlocked: true,
    note: "Host maintenance",
  },
  {
    id: "ovr_02",
    listingId: "lst_tipaza_villa",
    date: "2026-11-20",
    isBlocked: false,
    customPrice: 22000,
    note: "Peak weekend",
  },
];

export async function getAvailabilityOverrides(
  listingId: string
): Promise<DateAvailabilityOverride[]> {
  await new Promise((resolve) => setTimeout(resolve, 60));
  return mockAvailabilityOverrides.filter((ov) => ov.listingId === listingId);
}
