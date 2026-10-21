export interface Wilaya {
  code: string;
  nameEn: string;
  nameFr: string;
  nameAr: string;
  region: "north" | "high_plateaus" | "south";
}

export const WILAYAS: Wilaya[] = [
  { code: "01", nameEn: "Adrar", nameFr: "Adrar", nameAr: "أدرار", region: "south" },
  { code: "02", nameEn: "Chlef", nameFr: "Chlef", nameAr: "الشلف", region: "north" },
  { code: "03", nameEn: "Laghouat", nameFr: "Laghouat", nameAr: "الأغواط", region: "high_plateaus" },
  { code: "04", nameEn: "Oum El Bouaghi", nameFr: "Oum El Bouaghi", nameAr: "أم البواقي", region: "high_plateaus" },
  { code: "05", nameEn: "Batna", nameFr: "Batna", nameAr: "باتنة", region: "high_plateaus" },
  { code: "06", nameEn: "Béjaïa", nameFr: "Béjaïa", nameAr: "بجاية", region: "north" },
  { code: "07", nameEn: "Biskra", nameFr: "Biskra", nameAr: "بسكرة", region: "south" },
  { code: "08", nameEn: "Béchar", nameFr: "Béchar", nameAr: "بشار", region: "south" },
  { code: "09", nameEn: "Blida", nameFr: "Blida", nameAr: "البليدة", region: "north" },
  { code: "10", nameEn: "Bouira", nameFr: "Bouira", nameAr: "البويرة", region: "north" },
  { code: "11", nameEn: "Tamanrasset", nameFr: "Tamanrasset", nameAr: "تمنراست", region: "south" },
  { code: "12", nameEn: "Tébessa", nameFr: "Tébessa", nameAr: "تبسة", region: "high_plateaus" },
  { code: "13", nameEn: "Tlemcen", nameFr: "Tlemcen", nameAr: "تلمسان", region: "north" },
  { code: "14", nameEn: "Tiaret", nameFr: "Tiaret", nameAr: "تيارت", region: "high_plateaus" },
  { code: "15", nameEn: "Tizi Ouzou", nameFr: "Tizi Ouzou", nameAr: "تيزي وزو", region: "north" },
  { code: "16", nameEn: "Algiers", nameFr: "Alger", nameAr: "الجزائر", region: "north" },
  { code: "17", nameEn: "Djelfa", nameFr: "Djelfa", nameAr: "الجلفة", region: "high_plateaus" },
  { code: "18", nameEn: "Jijel", nameFr: "Jijel", nameAr: "جيجل", region: "north" },
  { code: "19", nameEn: "Sétif", nameFr: "Sétif", nameAr: "سطيف", region: "high_plateaus" },
  { code: "20", nameEn: "Saïda", nameFr: "Saïda", nameAr: "سعيدة", region: "high_plateaus" },
  { code: "21", nameEn: "Skikda", nameFr: "Skikda", nameAr: "سكيكدة", region: "north" },
  { code: "22", nameEn: "Sidi Bel Abbès", nameFr: "Sidi Bel Abbès", nameAr: "سيدي بلعباس", region: "north" },
  { code: "23", nameEn: "Annaba", nameFr: "Annaba", nameAr: "عنابة", region: "north" },
  { code: "24", nameEn: "Guelma", nameFr: "Guelma", nameAr: "قالمة", region: "north" },
  { code: "25", nameEn: "Constantine", nameFr: "Constantine", nameAr: "قسنطينة", region: "north" },
  { code: "26", nameEn: "Médéa", nameFr: "Médéa", nameAr: "المدية", region: "north" },
  { code: "27", nameEn: "Mostaganem", nameFr: "Mostaganem", nameAr: "مستغانم", region: "north" },
  { code: "28", nameEn: "M'Sila", nameFr: "M'Sila", nameAr: "المسيلة", region: "high_plateaus" },
  { code: "29", nameEn: "Mascara", nameFr: "Mascara", nameAr: "معسكر", region: "north" },
  { code: "30", nameEn: "Ouargla", nameFr: "Ouargla", nameAr: "ورقلة", region: "south" },
  { code: "31", nameEn: "Oran", nameFr: "Oran", nameAr: "وهران", region: "north" },
  { code: "32", nameEn: "El Bayadh", nameFr: "El Bayadh", nameAr: "البيض", region: "high_plateaus" },
  { code: "33", nameEn: "Illizi", nameFr: "Illizi", nameAr: "إليزي", region: "south" },
  { code: "34", nameEn: "Bordj Bou Arréridj", nameFr: "Bordj Bou Arréridj", nameAr: "برج بوعريريج", region: "high_plateaus" },
  { code: "35", nameEn: "Boumerdès", nameFr: "Boumerdès", nameAr: "بومرداس", region: "north" },
  { code: "36", nameEn: "El Tarf", nameFr: "El Tarf", nameAr: "الطارف", region: "north" },
  { code: "37", nameEn: "Tindouf", nameFr: "Tindouf", nameAr: "تندوف", region: "south" },
  { code: "38", nameEn: "Tissemsilt", nameFr: "Tissemsilt", nameAr: "تيسمسيلت", region: "high_plateaus" },
  { code: "39", nameEn: "El Oued", nameFr: "El Oued", nameAr: "الوادي", region: "south" },
  { code: "40", nameEn: "Khenchela", nameFr: "Khenchela", nameAr: "خنشلة", region: "high_plateaus" },
  { code: "41", nameEn: "Souk Ahras", nameFr: "Souk Ahras", nameAr: "سوق أهراس", region: "high_plateaus" },
  { code: "42", nameEn: "Tipaza", nameFr: "Tipaza", nameAr: "تيبازة", region: "north" },
  { code: "43", nameEn: "Mila", nameFr: "Mila", nameAr: "ميلة", region: "north" },
  { code: "44", nameEn: "Aïn Defla", nameFr: "Aïn Defla", nameAr: "عين الدفلى", region: "north" },
  { code: "45", nameEn: "Naâma", nameFr: "Naâma", nameAr: "النعامة", region: "high_plateaus" },
  { code: "46", nameEn: "Aïn Témouchent", nameFr: "Aïn Témouchent", nameAr: "عين تموشنت", region: "north" },
  { code: "47", nameEn: "Ghardaïa", nameFr: "Ghardaïa", nameAr: "غرداية", region: "south" },
  { code: "48", nameEn: "Relizane", nameFr: "Relizane", nameAr: "غليزان", region: "north" },
  { code: "49", nameEn: "Timimoun", nameFr: "Timimoun", nameAr: "تيميمون", region: "south" },
  { code: "50", nameEn: "Bordj Badji Mokhtar", nameFr: "Bordj Badji Mokhtar", nameAr: "برج باجي مختار", region: "south" },
  { code: "51", nameEn: "Ouled Djellal", nameFr: "Ouled Djellal", nameAr: "أولاد جلال", region: "south" },
  { code: "52", nameEn: "Béni Abbès", nameFr: "Béni Abbès", nameAr: "بني عباس", region: "south" },
  { code: "53", nameEn: "In Salah", nameFr: "In Salah", nameAr: "عين صالح", region: "south" },
  { code: "54", nameEn: "In Guezzam", nameFr: "In Guezzam", nameAr: "عين قزام", region: "south" },
  { code: "55", nameEn: "Touggourt", nameFr: "Touggourt", nameAr: "تقرت", region: "south" },
  { code: "56", nameEn: "Djanet", nameFr: "Djanet", nameAr: "جانت", region: "south" },
  { code: "57", nameEn: "El M'Ghair", nameFr: "El M'Ghair", nameAr: "المغير", region: "south" },
  { code: "58", nameEn: "El Meniaa", nameFr: "El Meniaa", nameAr: "المنيعة", region: "south" },
  { code: "59", nameEn: "Aflou", nameFr: "Aflou", nameAr: "أفلو", region: "high_plateaus" },
  { code: "60", nameEn: "Barika", nameFr: "Barika", nameAr: "بريكة", region: "high_plateaus" },
  { code: "61", nameEn: "El Kantara", nameFr: "El Kantara", nameAr: "القنطرة", region: "high_plateaus" },
  { code: "62", nameEn: "Bir El Ater", nameFr: "Bir El Ater", nameAr: "بئر العاتر", region: "high_plateaus" },
  { code: "63", nameEn: "El Aricha", nameFr: "El Aricha", nameAr: "العريشة", region: "high_plateaus" },
  { code: "64", nameEn: "Ksar Chellala", nameFr: "Ksar Chellala", nameAr: "قصر الشلالة", region: "high_plateaus" },
  { code: "65", nameEn: "Aïn Ouessara", nameFr: "Aïn Ouessara", nameAr: "عين وسارة", region: "high_plateaus" },
  { code: "66", nameEn: "Messaad", nameFr: "Messaad", nameAr: "مسعد", region: "high_plateaus" },
  { code: "67", nameEn: "Ksar El Boukhari", nameFr: "Ksar El Boukhari", nameAr: "قصر البخاري", region: "high_plateaus" },
  { code: "68", nameEn: "Bou Saâda", nameFr: "Bou Saâda", nameAr: "بوسعادة", region: "high_plateaus" },
  { code: "69", nameEn: "El Abiodh Sidi Cheikh", nameFr: "El Abiodh Sidi Cheikh", nameAr: "الأبيض سيدي الشيخ", region: "south" },
];

export const WILAYAS_MAP = new Map(WILAYAS.map((w) => [w.code, w]));

export function getWilayaName(code: string, locale: "en" | "fr" | "ar" = "en"): string {
  const wilaya = WILAYAS_MAP.get(code);
  if (!wilaya) return code;
  if (locale === "ar") return `${wilaya.code} - ${wilaya.nameAr}`;
  if (locale === "fr") return `${wilaya.code} - ${wilaya.nameFr}`;
  return `${wilaya.code} - ${wilaya.nameEn}`;
}

export function getWilayasByRegion(region: "north" | "high_plateaus" | "south"): Wilaya[] {
  return WILAYAS.filter((w) => w.region === region);
}
