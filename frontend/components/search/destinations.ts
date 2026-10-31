/**
 * Popular Algerian destinations used by the search bar, search modal and footer.
 * `name` is the value sent as `?destination=` (matched against listing cities);
 * the visible name and tagline come from `search.destinations.<key>`.
 */
export interface Destination {
  key: string;
  name: string;
  wilaya: number;
  /** Approximate city centre, used to suggest nearby destinations. */
  latlng: [number, number];
}

export const POPULAR_DESTINATIONS: Destination[] = [
  { key: "algiers", name: "Algiers", wilaya: 16, latlng: [36.7538, 3.0588] },
  { key: "oran", name: "Oran", wilaya: 31, latlng: [35.6971, -0.6308] },
  { key: "constantine", name: "Constantine", wilaya: 25, latlng: [36.365, 6.6147] },
  { key: "tipaza", name: "Tipaza", wilaya: 42, latlng: [36.5897, 2.4475] },
  { key: "tlemcen", name: "Tlemcen", wilaya: 13, latlng: [34.8783, -1.315] },
  { key: "djanet", name: "Djanet", wilaya: 56, latlng: [24.5542, 9.4846] },
  { key: "taghit", name: "Taghit", wilaya: 8, latlng: [30.9167, -2.0333] },
  { key: "ghardaia", name: "Ghardaïa", wilaya: 47, latlng: [32.4909, 3.6735] },
  { key: "bejaia", name: "Béjaïa", wilaya: 6, latlng: [36.7509, 5.0567] },
  { key: "annaba", name: "Annaba", wilaya: 23, latlng: [36.9, 7.7667] },
];

export function findDestination(value?: string | null): Destination | undefined {
  if (!value) return undefined;
  const lower = value.trim().toLowerCase();
  return POPULAR_DESTINATIONS.find((d) => d.name.toLowerCase() === lower);
}

export function findDestinationByKey(key: string): Destination | undefined {
  return POPULAR_DESTINATIONS.find((d) => d.key === key);
}

function distanceKm(a: [number, number], b: [number, number]): number {
  const rad = Math.PI / 180;
  const dLat = (b[0] - a[0]) * rad;
  const dLng = (b[1] - a[1]) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a[0] * rad) * Math.cos(b[0] * rad) * Math.sin(dLng / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(h));
}

/**
 * Destinations closest to `value` (a destination name or key), excluding itself.
 * Without a known origin, returns the first popular destinations.
 */
export function nearbyDestinations(value: string | null | undefined, count = 4): Destination[] {
  const origin = findDestination(value) ?? (value ? findDestinationByKey(value) : undefined);
  if (!origin) return POPULAR_DESTINATIONS.slice(0, count);
  return POPULAR_DESTINATIONS.filter((d) => d.key !== origin.key)
    .sort((a, b) => distanceKm(origin.latlng, a.latlng) - distanceKm(origin.latlng, b.latlng))
    .slice(0, count);
}
