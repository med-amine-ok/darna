/** Client-safe geo helpers for trips (no mock data in here). */
export const ALGERIAN_CITY_COORDINATES: Record<string, [number, number]> = {
  djanet: [24.5539, 9.4858],
  taghit: [30.9167, -2.0333],
  ghardaia: [32.4909, 3.6736],
  "ghardaïa": [32.4909, 3.6736],
  tipaza: [36.5897, 2.4475],
  cherchell: [36.608, 2.195],
  algiers: [36.7538, 3.0588],
  alger: [36.7538, 3.0588],
  oran: [35.6987, -0.6349],
  constantine: [36.365, 6.6147],
  annaba: [36.9, 7.7667],
  tlemcen: [34.8783, -1.315],
  bechar: [31.6167, -2.2167],
  "béchar": [31.6167, -2.2167],
  tamanrasset: [22.785, 5.5228],
  timimoun: [29.2639, 0.2311],
  biskra: [34.8504, 5.7281],
  batna: [35.5558, 6.1741],
  setif: [36.1911, 5.4137],
  "sétif": [36.1911, 5.4137],
  illizi: [26.4833, 8.4667],
};

export function getTripCoordinates(trip: {
  latlng?: [number, number];
  city?: string;
  locationValue?: string;
}): [number, number] {
  if (
    trip.latlng &&
    Array.isArray(trip.latlng) &&
    trip.latlng.length === 2 &&
    !isNaN(trip.latlng[0]) &&
    !isNaN(trip.latlng[1])
  ) {
    return trip.latlng;
  }
  const needle = `${trip.city || ""} ${trip.locationValue || ""}`.toLowerCase();
  for (const [key, coords] of Object.entries(ALGERIAN_CITY_COORDINATES)) {
    if (needle.includes(key)) {
      return coords;
    }
  }
  return [36.5897, 2.4475];
}
