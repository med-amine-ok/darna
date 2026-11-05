/**
 * Single source of truth for experience and trip types (one logic everywhere:
 * listing creation, trip creation, search filters, cards, admin).
 *
 * The admin app keeps an identical copy in admin/lib/catalog-types.ts. When you
 * change a list here, change it there too (same ids, same order, same labels).
 *
 * Ids are stable storage keys (they will become backend enum values); labels are
 * shown in the user's language. Order = display order.
 */

export const EXPERIENCE_TYPES = [
  "excursion",
  "guided_tour",
  "nature_adventure",
  "desert",
  "sport",
  "culture_workshop",
  "gastronomy",
  "wellness",
] as const;
export type ExperienceTypeId = (typeof EXPERIENCE_TYPES)[number];

export const TRIP_TYPES = [
  "group_tour",
  "private_trip",
  "adventure",
  "desert_expedition",
  "cultural",
  "hiking",
  "relaxation",
  "religious",
] as const;
export type TripTypeId = (typeof TRIP_TYPES)[number];

type Labels = { en: string; fr: string; ar: string };

export const EXPERIENCE_TYPE_LABELS: Record<ExperienceTypeId, Labels> = {
  excursion: { en: "Excursions", fr: "Excursions", ar: "رحلات قصيرة" },
  guided_tour: { en: "Guided tours", fr: "Visites guidées", ar: "جولات بمرشد" },
  nature_adventure: { en: "Nature & adventure", fr: "Nature & aventure", ar: "طبيعة ومغامرة" },
  desert: { en: "Desert & bivouac", fr: "Désert & bivouac", ar: "الصحراء والمبيت" },
  sport: { en: "Sports activities", fr: "Activités sportives", ar: "أنشطة رياضية" },
  culture_workshop: { en: "Workshops & culture", fr: "Ateliers & culture", ar: "ورشات وثقافة" },
  gastronomy: { en: "Food & gastronomy", fr: "Gastronomie", ar: "فن الطبخ" },
  wellness: { en: "Wellness & hammam", fr: "Bien-être & hammam", ar: "الاسترخاء والحمّام" },
};

export const TRIP_TYPE_LABELS: Record<TripTypeId, Labels> = {
  group_tour: { en: "Group tour", fr: "Circuit en groupe", ar: "جولة جماعية" },
  private_trip: { en: "Private trip", fr: "Séjour privé", ar: "رحلة خاصة" },
  adventure: { en: "Adventure", fr: "Aventure", ar: "مغامرة" },
  desert_expedition: { en: "Saharan expedition", fr: "Expédition saharienne", ar: "رحلة صحراوية" },
  cultural: { en: "Cultural & heritage", fr: "Culturel & patrimoine", ar: "ثقافة وتراث" },
  hiking: { en: "Hiking & trekking", fr: "Randonnée & trek", ar: "مشي وتسلق" },
  relaxation: { en: "Relaxation & seaside", fr: "Séjour détente", ar: "استجمام وبحر" },
  religious: { en: "Religious & spiritual", fr: "Séjour religieux", ar: "رحلة دينية وروحية" },
};

type Locale = "en" | "fr" | "ar";
const pick = (l: string): Locale => (l === "fr" || l === "ar" ? l : "en");

export function experienceTypeLabel(id: string | null | undefined, locale: string): string {
  return id && id in EXPERIENCE_TYPE_LABELS ? EXPERIENCE_TYPE_LABELS[id as ExperienceTypeId][pick(locale)] : "";
}

export function tripTypeLabel(id: string | null | undefined, locale: string): string {
  return id && id in TRIP_TYPE_LABELS ? TRIP_TYPE_LABELS[id as TripTypeId][pick(locale)] : "";
}

export const isExperienceType = (v: unknown): v is ExperienceTypeId =>
  typeof v === "string" && (EXPERIENCE_TYPES as readonly string[]).includes(v);

export const isTripType = (v: unknown): v is TripTypeId =>
  typeof v === "string" && (TRIP_TYPES as readonly string[]).includes(v);

/**
 * What each host type may publish (one rule for UI, server actions and admin):
 * - individual: homes and vehicles
 * - agency: experiences (listings) and trips (Trip entity)
 * - hotel / hostel: their property (hotel vertical, with room types)
 */
export const HOST_ALLOWED_OFFERS = {
  individual: ["home", "vehicle"],
  agency: ["experience", "trip"],
  hotel: ["hotel"],
  hostel: ["hotel"],
} as const;
export type HostOffer = "home" | "vehicle" | "experience" | "trip" | "hotel";

export function canHostOffer(hostType: string | null | undefined, offer: HostOffer): boolean {
  if (!hostType || !(hostType in HOST_ALLOWED_OFFERS)) return false;
  return (HOST_ALLOWED_OFFERS[hostType as keyof typeof HOST_ALLOWED_OFFERS] as readonly string[]).includes(offer);
}
