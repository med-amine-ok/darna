import type React from "react";
import {
  BrandCompassIcon,
  CategoryHouseIcon,
  CategoryRiadIcon,
  BrandWaterIcon,
  BrandSunIcon,
  CategoryVehicleIcon,
  BrandSparklesIcon,
  BrandWifiIcon,
  BrandSnowIcon,
  BrandKitchenIcon,
  BrandFlameIcon,
} from "@/components/icons";

type IconComponent = React.FC<{ size?: number | string; className?: string }>;

export type TeamInvite = { email: string; role: "admin" | "manager" };
export type BookingMode = "instant" | "request";
export type LatLng = [number, number];

/**
 * Wilayas offered in the location pickers. `value` is the stored (English)
 * name kept for backward compatibility with drafts and listings; the visible
 * label comes from `hostFlow.wilayas.<id>`.
 */
export const WILAYAS: { id: string; value: string; latlng: LatLng }[] = [
  { id: "algiers", value: "Algiers", latlng: [36.7538, 3.0588] },
  { id: "oran", value: "Oran", latlng: [35.6987, -0.6349] },
  { id: "constantine", value: "Constantine", latlng: [36.365, 6.6147] },
  { id: "tipaza", value: "Tipaza", latlng: [36.5897, 2.4475] },
  { id: "djanet", value: "Djanet (Sahara)", latlng: [24.5539, 9.4858] },
  { id: "taghit", value: "Taghit (Bechar)", latlng: [30.9167, -2.0333] },
  { id: "bejaia", value: "Bejaia", latlng: [36.7559, 5.0843] },
  { id: "ghardaia", value: "Ghardaia (M'zab)", latlng: [32.4909, 3.6736] },
  { id: "tlemcen", value: "Tlemcen", latlng: [34.8783, -1.315] },
  { id: "annaba", value: "Annaba", latlng: [36.9, 7.7667] },
];

/** Listing categories: `value` is stored as the listing type; label = `hostFlow.categories.<id>`. */
export const CATEGORIES: {
  id: string;
  value: string;
  vertical: "home" | "vehicle" | "experience";
  icon: IconComponent;
}[] = [
  { id: "villa", value: "Villa", vertical: "home", icon: CategoryHouseIcon },
  { id: "casbahHouse", value: "Casbah Heritage House", vertical: "home", icon: CategoryRiadIcon },
  { id: "seasideApartment", value: "Seaside Apartment", vertical: "home", icon: BrandWaterIcon },
  { id: "saharanKsar", value: "Saharan Ksar", vertical: "home", icon: BrandSunIcon },
  { id: "desertCamp", value: "Desert Camp", vertical: "home", icon: BrandCompassIcon },
  { id: "landCruiser", value: "4x4 Land Cruiser SUV", vertical: "vehicle", icon: CategoryVehicleIcon },
  { id: "saharaExpedition", value: "Sahara 4x4 Expedition", vertical: "experience", icon: BrandCompassIcon },
  { id: "casbahTour", value: "Casbah Architecture Tour", vertical: "experience", icon: BrandSparklesIcon },
];

/** Individual listing amenities; label = `hostFlow.amenities.<id>`. */
export const AMENITIES: { id: string; icon: IconComponent }[] = [
  { id: "wifi", icon: BrandWifiIcon },
  { id: "air_conditioning", icon: BrandSnowIcon },
  { id: "kitchen", icon: BrandKitchenIcon },
  { id: "free_parking", icon: CategoryVehicleIcon },
  { id: "sea_view", icon: BrandWaterIcon },
  { id: "traditional_patio", icon: BrandSparklesIcon },
  { id: "pool", icon: BrandWaterIcon },
  { id: "sahara_fireplace", icon: BrandFlameIcon },
];

/** label = `hostFlow.hotel.amenities.<id>` */
export const HOTEL_AMENITY_IDS = [
  "breakfast",
  "pool",
  "spa",
  "wifi",
  "valet",
  "conference",
  "reception_24_7",
  "shuttle",
] as const;

/** label = `hostFlow.hostel.facilities.<id>` */
export const HOSTEL_FACILITY_IDS = [
  "lockers",
  "shared_kitchen",
  "rooftop",
  "coworking",
  "luggage_storage",
  "breakfast",
] as const;

/** Preset photos; label = `hostFlow.photos.presets.<id>`. */
export type PhotoPreset = { id: string; src: string };

export const LISTING_PHOTO_PRESETS: PhotoPreset[] = [
  { id: "tipazaVilla", src: "https://images.unsplash.com/photo-1570133435807-5feefeb2d196?auto=format&fit=crop&w=1600&q=80" },
  { id: "oranSeaside", src: "https://images.unsplash.com/photo-1653815129496-445487ae0479?auto=format&fit=crop&w=1600&q=80" },
  { id: "constantineBridges", src: "https://images.unsplash.com/photo-1549145177-238518f1ec1a?auto=format&fit=crop&w=1600&q=80" },
  { id: "casbahTerrace", src: "https://images.unsplash.com/photo-1552573033-b7bb437bf953?auto=format&fit=crop&w=1600&q=80" },
];

export const HOTEL_PHOTO_PRESETS: PhotoPreset[] = [
  { id: "grandLobby", src: "https://images.unsplash.com/photo-1552573033-b7bb437bf953?auto=format&fit=crop&w=1600&q=80" },
  { id: "seasideSuite", src: "https://images.unsplash.com/photo-1653815129496-445487ae0479?auto=format&fit=crop&w=1600&q=80" },
  { id: "historicCourtyard", src: "https://images.unsplash.com/photo-1549145177-238518f1ec1a?auto=format&fit=crop&w=1600&q=80" },
  { id: "poolPatio", src: "https://images.unsplash.com/photo-1570133435807-5feefeb2d196?auto=format&fit=crop&w=1600&q=80" },
];

export const HOSTEL_PHOTO_PRESETS: PhotoPreset[] = [
  { id: "rooftopLounge", src: "https://images.unsplash.com/photo-1552573033-b7bb437bf953?auto=format&fit=crop&w=1600&q=80" },
  { id: "saharanOasis", src: "https://images.unsplash.com/photo-1570133435807-5feefeb2d196?auto=format&fit=crop&w=1600&q=80" },
  { id: "historicCourtyard", src: "https://images.unsplash.com/photo-1549145177-238518f1ec1a?auto=format&fit=crop&w=1600&q=80" },
  { id: "socialArea", src: "https://images.unsplash.com/photo-1653815129496-445487ae0479?auto=format&fit=crop&w=1600&q=80" },
];

/** Agency business types: `value` is stored; label = `agencyRegistration.businessTypes.<id>`. */
export const BUSINESS_TYPES: { id: string; value: string }[] = [
  { id: "tourismAgency", value: "Licensed Tourism Agency" },
  { id: "vehicleRental", value: "Vehicle Rental Fleet" },
  { id: "hotelOperator", value: "Hotel & Residence Operator" },
  { id: "saharaOutfitter", value: "Sahara Expedition Outfitter" },
];

export const TEAM_SIZES = ["1", "2-10", "11-50", "50+"] as const;
export type TeamSize = (typeof TEAM_SIZES)[number];

/** Visible focus ring for custom interactive elements. */
export const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2";

/** id of the step-level validation summary (inputs point at it via aria-describedby). */
export const STEP_ERROR_ID = "onboarding-step-error";
