/**
 * Popular Algerian destinations used by the search bar, search modal and footer.
 * `name` is the value sent as `?destination=` (matched against listing cities);
 * the visible name and tagline come from `search.destinations.<key>`.
 */
export interface Destination {
  key: string;
  name: string;
  wilaya: number;
}

export const POPULAR_DESTINATIONS: Destination[] = [
  { key: "algiers", name: "Algiers", wilaya: 16 },
  { key: "oran", name: "Oran", wilaya: 31 },
  { key: "constantine", name: "Constantine", wilaya: 25 },
  { key: "tipaza", name: "Tipaza", wilaya: 42 },
  { key: "tlemcen", name: "Tlemcen", wilaya: 13 },
  { key: "djanet", name: "Djanet", wilaya: 56 },
  { key: "taghit", name: "Taghit", wilaya: 53 },
  { key: "ghardaia", name: "Ghardaïa", wilaya: 47 },
  { key: "bejaia", name: "Béjaïa", wilaya: 6 },
  { key: "annaba", name: "Annaba", wilaya: 23 },
];

export function findDestination(value?: string | null): Destination | undefined {
  if (!value) return undefined;
  const lower = value.trim().toLowerCase();
  return POPULAR_DESTINATIONS.find((d) => d.name.toLowerCase() === lower);
}
