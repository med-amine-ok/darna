/**
 * Curated, visually verified photography of Algeria (Unsplash, free licence)
 * for editorial surfaces: hero, wilaya tiles, section bands, empty states.
 * Listing photos stay in the data layer. All hosts are allowed in next.config.js.
 */
const u = (id: string) => `https://images.unsplash.com/photo-${id}`;

export const imagery = {
  tassiliArch: u("1610217889481-a3637938262a"),
  tassiliRock: u("1583024274313-cfb3f1bc43c8"),
  hoggar: u("1582638682484-02feebeafc3e"),
  dunesGolden: u("1638732984528-f255c9714619"),
  dunesBlueSky: u("1672754521539-49de145445a6"),
  caravan: u("1535190823090-3c159ed10a97"),
  desertCampNight: u("1527419105721-af1f23c86dec"),
  ghardaia: u("1599373527966-9a2c9e33ea9d"),
  ghardaiaStreet: u("1681445714444-123678aa1220"),
  algiersBay: u("1706002027900-a1be40d0627e"),
  algiersSunset: u("1642215104060-86e252b2cb69"),
  algiersPort: u("1656978310683-d415ee895c2c"),
  maqamEchahid: u("1580913709631-8de3edebfd2e"),
  constantineBridge: u("1549145177-238518f1ec1a"),
  constantineGorge: u("1588676449872-3eaa8b242e69"),
  kabylieVillage: u("1602496252172-8030f4df6ed0"),
  timgad: u("1595168318069-217391d91943"),
  oranSantaCruz: u("1653815129496-445487ae0479"),
  riadCourtyard: u("1552573033-b7bb437bf953"),
  riadPool: u("1570133435807-5feefeb2d196"),
  carvedArch: u("1684514570876-c671a6b6efa6"),
  desert4x4: u("1624062999726-083e5268525d"),
} as const;

/** Image tile per destination key used in search (lib/destinations). */
export const wilayaImagery: Record<string, string> = {
  algiers: imagery.algiersBay,
  oran: imagery.oranSantaCruz,
  constantine: imagery.constantineBridge,
  ghardaia: imagery.ghardaia,
  djanet: imagery.tassiliArch,
  taghit: imagery.dunesGolden,
  tamanrasset: imagery.hoggar,
};

/** Unsplash sizing helper: request the width we render (next/image adds its own w=). */
export function withParams(url: string, params = "auto=format&fit=crop&q=80") {
  return url.includes("?") ? url : `${url}?${params}`;
}
