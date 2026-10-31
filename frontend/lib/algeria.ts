/**
 * Algerian administrative geography used by search filters: the 58 wilayas (official
 * codes, 2019 reform included) and the communes that appear in DARNA listings.
 * Names: French/Latin spelling (used for en and fr, except where English differs) and Arabic.
 */

export interface Wilaya {
  code: number;
  name: string;
  nameEn?: string;
  nameAr: string;
}

export const WILAYAS: Wilaya[] = [
  { code: 1, name: "Adrar", nameAr: "أدرار" },
  { code: 2, name: "Chlef", nameAr: "الشلف" },
  { code: 3, name: "Laghouat", nameAr: "الأغواط" },
  { code: 4, name: "Oum El Bouaghi", nameAr: "أم البواقي" },
  { code: 5, name: "Batna", nameAr: "باتنة" },
  { code: 6, name: "Béjaïa", nameAr: "بجاية" },
  { code: 7, name: "Biskra", nameAr: "بسكرة" },
  { code: 8, name: "Béchar", nameAr: "بشار" },
  { code: 9, name: "Blida", nameAr: "البليدة" },
  { code: 10, name: "Bouira", nameAr: "البويرة" },
  { code: 11, name: "Tamanrasset", nameAr: "تمنراست" },
  { code: 12, name: "Tébessa", nameAr: "تبسة" },
  { code: 13, name: "Tlemcen", nameAr: "تلمسان" },
  { code: 14, name: "Tiaret", nameAr: "تيارت" },
  { code: 15, name: "Tizi Ouzou", nameAr: "تيزي وزو" },
  { code: 16, name: "Alger", nameEn: "Algiers", nameAr: "الجزائر" },
  { code: 17, name: "Djelfa", nameAr: "الجلفة" },
  { code: 18, name: "Jijel", nameAr: "جيجل" },
  { code: 19, name: "Sétif", nameAr: "سطيف" },
  { code: 20, name: "Saïda", nameAr: "سعيدة" },
  { code: 21, name: "Skikda", nameAr: "سكيكدة" },
  { code: 22, name: "Sidi Bel Abbès", nameAr: "سيدي بلعباس" },
  { code: 23, name: "Annaba", nameAr: "عنابة" },
  { code: 24, name: "Guelma", nameAr: "قالمة" },
  { code: 25, name: "Constantine", nameAr: "قسنطينة" },
  { code: 26, name: "Médéa", nameAr: "المدية" },
  { code: 27, name: "Mostaganem", nameAr: "مستغانم" },
  { code: 28, name: "M'Sila", nameAr: "المسيلة" },
  { code: 29, name: "Mascara", nameAr: "معسكر" },
  { code: 30, name: "Ouargla", nameAr: "ورقلة" },
  { code: 31, name: "Oran", nameAr: "وهران" },
  { code: 32, name: "El Bayadh", nameAr: "البيض" },
  { code: 33, name: "Illizi", nameAr: "إليزي" },
  { code: 34, name: "Bordj Bou Arréridj", nameAr: "برج بوعريريج" },
  { code: 35, name: "Boumerdès", nameAr: "بومرداس" },
  { code: 36, name: "El Tarf", nameAr: "الطارف" },
  { code: 37, name: "Tindouf", nameAr: "تندوف" },
  { code: 38, name: "Tissemsilt", nameAr: "تيسمسيلت" },
  { code: 39, name: "El Oued", nameAr: "الوادي" },
  { code: 40, name: "Khenchela", nameAr: "خنشلة" },
  { code: 41, name: "Souk Ahras", nameAr: "سوق أهراس" },
  { code: 42, name: "Tipaza", nameAr: "تيبازة" },
  { code: 43, name: "Mila", nameAr: "ميلة" },
  { code: 44, name: "Aïn Defla", nameAr: "عين الدفلى" },
  { code: 45, name: "Naâma", nameAr: "النعامة" },
  { code: 46, name: "Aïn Témouchent", nameAr: "عين تموشنت" },
  { code: 47, name: "Ghardaïa", nameAr: "غرداية" },
  { code: 48, name: "Relizane", nameAr: "غليزان" },
  { code: 49, name: "Timimoun", nameAr: "تيميمون" },
  { code: 50, name: "Bordj Badji Mokhtar", nameAr: "برج باجي مختار" },
  { code: 51, name: "Ouled Djellal", nameAr: "أولاد جلال" },
  { code: 52, name: "Béni Abbès", nameAr: "بني عباس" },
  { code: 53, name: "In Salah", nameAr: "عين صالح" },
  { code: 54, name: "In Guezzam", nameAr: "عين قزام" },
  { code: 55, name: "Touggourt", nameAr: "تقرت" },
  { code: 56, name: "Djanet", nameAr: "جانت" },
  { code: 57, name: "El M'Ghair", nameAr: "المغير" },
  { code: 58, name: "El Meniaa", nameAr: "المنيعة" },
];

export interface Commune {
  name: string;
  nameAr: string;
  wilaya: number;
}

/** Communes that DARNA listings and trips are in (extend as hosts add places). */
export const COMMUNES: Commune[] = [
  { name: "Casbah", nameAr: "القصبة", wilaya: 16 },
  { name: "Alger Centre", nameAr: "الجزائر الوسطى", wilaya: 16 },
  { name: "El Mouradia", nameAr: "المرادية", wilaya: 16 },
  { name: "Tipaza", nameAr: "تيبازة", wilaya: 42 },
  { name: "Cherchell", nameAr: "شرشال", wilaya: 42 },
  { name: "Oran", nameAr: "وهران", wilaya: 31 },
  { name: "Constantine", nameAr: "قسنطينة", wilaya: 25 },
  { name: "Tlemcen", nameAr: "تلمسان", wilaya: 13 },
  { name: "Ghardaïa", nameAr: "غرداية", wilaya: 47 },
  { name: "Djanet", nameAr: "جانت", wilaya: 56 },
  { name: "Taghit", nameAr: "تاغيت", wilaya: 8 },
  { name: "Béjaïa", nameAr: "بجاية", wilaya: 6 },
  { name: "Annaba", nameAr: "عنابة", wilaya: 23 },
];

/** Listing `city` values (English, as stored) to their wilaya, for places without a commune. */
const CITY_WILAYA: Record<string, number> = {
  algiers: 16,
  alger: 16,
  tipaza: 42,
  cherchell: 42,
  oran: 31,
  constantine: 25,
  tlemcen: 13,
  ghardaia: 47,
  djanet: 56,
  taghit: 8,
  bejaia: 6,
  annaba: 23,
};

const norm = (v: string) =>
  v
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();

export function findCommune(name?: string | null): Commune | undefined {
  if (!name) return undefined;
  const n = norm(name);
  return COMMUNES.find((c) => norm(c.name) === n);
}

export function findWilaya(code?: number | null): Wilaya | undefined {
  return code ? WILAYAS.find((w) => w.code === code) : undefined;
}

/**
 * Where a listing or trip is: explicit `commune` first, else the first known commune or
 * city in `city` ("Tipaza & Cherchell" → Tipaza).
 */
export function locatePlace(place: { commune?: string | null; city?: string | null }): { wilaya?: number; commune?: string } {
  const commune = findCommune(place.commune);
  if (commune) return { wilaya: commune.wilaya, commune: commune.name };
  const parts = (place.city ?? "").split(/[&,/]| et | and /i).map((p) => p.trim()).filter(Boolean);
  for (const part of parts) {
    const c = findCommune(part);
    if (c) return { wilaya: c.wilaya, commune: c.name };
    const w = CITY_WILAYA[norm(part)];
    if (w) return { wilaya: w };
  }
  return {};
}

export function wilayaLabel(w: Wilaya, locale: string): string {
  return locale === "ar" ? w.nameAr : locale === "en" ? w.nameEn ?? w.name : w.name;
}

export function communeLabel(name: string, locale: string): string {
  const c = findCommune(name);
  return locale === "ar" && c ? c.nameAr : name;
}
