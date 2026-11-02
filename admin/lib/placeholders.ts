/**
 * On-brand image placeholders (public/placeholders/*.svg: sand tile, faint rosette, arch line art).
 * The mock data uses generic icons ("/assets/house.png", "/assets/car.png") as listing photos and
 * some screens referenced "/placeholder-*.jpg" files that never existed (400 from /_next/image).
 * UI only: data is untouched, the image is swapped at render time. When a `seed` (listing id)
 * is given, a real photo is picked from a small curated pool per kind (same seed, same photo),
 * so tables and galleries show Algeria instead of empty tiles.
 */
export type PlaceholderKind = "stay" | "experience" | "trip" | "car" | "booking";

const GENERIC_ICONS = new Set(["/assets/house.png", "/assets/car.png", "/assets/icon.png"]);

const u = (id: string) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=600&q=70`;

/** Curated photography (same verified set as the guest site), per listing kind. */
const PHOTO_POOLS: Record<PlaceholderKind, string[]> = {
  stay: [
    "1552573033-b7bb437bf953",
    "1570133435807-5feefeb2d196",
    "1681445714444-123678aa1220",
    "1706002027900-a1be40d0627e",
    "1653815129496-445487ae0479",
    "1602496252172-8030f4df6ed0",
    "1684514570876-c671a6b6efa6",
    "1642215104060-86e252b2cb69",
  ].map(u),
  experience: [
    "1610217889481-a3637938262a",
    "1535190823090-3c159ed10a97",
    "1527419105721-af1f23c86dec",
    "1638732984528-f255c9714619",
    "1582638682484-02feebeafc3e",
    "1595168318069-217391d91943",
  ].map(u),
  trip: [
    "1672754521539-49de145445a6",
    "1583024274313-cfb3f1bc43c8",
    "1549145177-238518f1ec1a",
    "1588676449872-3eaa8b242e69",
    "1599373527966-9a2c9e33ea9d",
    "1580913709631-8de3edebfd2e",
  ].map(u),
  car: [
    "1624062999726-083e5268525d",
    "1533473359331-0135ef1b58bf",
    "1549399542-7e3f8b79c341",
    "1503376780353-7e6692767b70",
    "1541899481282-d53bffe3c35d",
    "1502877338535-766e1452684a",
  ].map(u),
  booking: [],
};
PHOTO_POOLS.booking = [...PHOTO_POOLS.stay, ...PHOTO_POOLS.experience];

function hash(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return h;
}

export function placeholderFor(kind: PlaceholderKind, seed?: string | number): string {
  const pool = PHOTO_POOLS[kind];
  if (seed !== undefined && seed !== null && pool.length) return pool[hash(String(seed)) % pool.length];
  return `/placeholders/${kind}.svg`;
}

/** True when `src` is missing, a generic icon or a legacy placeholder path. */
export function isPlaceholderSrc(src?: string | null): boolean {
  if (!src) return true;
  return GENERIC_ICONS.has(src) || src.startsWith("/placeholder-") || src.startsWith("/placeholders/");
}

/** Real photo when there is one, otherwise the branded placeholder for that kind. */
export function listingImageSrc(src: string | null | undefined, kind: PlaceholderKind, seed?: string | number): string {
  if (!src || isPlaceholderSrc(src)) {
    if (src === "/assets/car.png") return placeholderFor("car", seed);
    return placeholderFor(kind, seed);
  }
  return src;
}

/** Same for an image list (carousels, galleries). */
export function listingImages(
  list: (string | null | undefined)[] | null | undefined,
  kind: PlaceholderKind,
  seed?: string | number
): string[] {
  const real = (list ?? []).filter((s): s is string => Boolean(s) && !isPlaceholderSrc(s));
  if (real.length) return real;
  if (seed !== undefined && seed !== null) {
    // Three photos from the pool, starting at the seeded one, for galleries and carousels.
    const pool = PHOTO_POOLS[kind];
    const start = hash(String(seed)) % pool.length;
    return [0, 1, 2].map((i) => pool[(start + i) % pool.length]);
  }
  return [listingImageSrc(list?.[0], kind)];
}
