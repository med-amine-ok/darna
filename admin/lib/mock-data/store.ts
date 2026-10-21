import { generateSeedData } from "./generator";
import {
  Host,
  Listing,
  GuestUser,
  Booking,
  ReviewItem,
  HostWallet,
  WalletTransaction,
  AuditEntry,
  CategoryItem,
  PromotionCoupon,
  PlatformSettings,
  OnboardingConfig,
  AdminUser,
} from "@/lib/types";
import { MOCK_ADMIN_ACCOUNTS } from "@/lib/auth/session";

// Global in-memory singleton for data persistence during runtime
const initialData = generateSeedData();

let hostsStore: Host[] = [...initialData.hosts];
let listingsStore: Listing[] = [...initialData.listings];
let usersStore: GuestUser[] = [...initialData.users];
let bookingsStore: Booking[] = [...initialData.bookings];
let reviewsStore: ReviewItem[] = [...initialData.reviews];
let walletsStore: HostWallet[] = [...initialData.wallets];
let transactionsStore: WalletTransaction[] = [...initialData.transactions];
let auditStore: AuditEntry[] = [...initialData.auditEntries];
let teamStore: AdminUser[] = MOCK_ADMIN_ACCOUNTS.map(({ password, ...u }) => u);

let categoriesStore: CategoryItem[] = [
  { id: "cat_villas", name: { en: "Coastal Villas", fr: "Villas Côtières", ar: "فيلات ساحلية" }, vertical: "home", iconName: "Home", listingCount: 48, isActive: true, order: 1 },
  { id: "cat_riads", name: { en: "Heritage Riads", fr: "Riads Historiques", ar: "رياض أثرية" }, vertical: "home", iconName: "Building", listingCount: 32, isActive: true, order: 2 },
  { id: "cat_sahara", name: { en: "Desert Camps & Bivouacs", fr: "Camps Sahariens", ar: "مخيمات صحراوية" }, vertical: "experience", iconName: "Tent", listingCount: 42, isActive: true, order: 3 },
  { id: "cat_4x4", name: { en: "4x4 Desert Overlanders", fr: "Véhicules Tout-Terrain", ar: "مركبات الدفع الرباعي" }, vertical: "vehicle", iconName: "Truck", listingCount: 28, isActive: true, order: 4 },
  { id: "cat_culinary", name: { en: "Culinary & Crafts", fr: "Ateliers Culinaires", ar: "ورشات الطهي والحرف" }, vertical: "experience", iconName: "Utensils", listingCount: 19, isActive: true, order: 5 },
  { id: "cat_trips", name: { en: "Guided Sahara Expeditions", fr: "Expéditions Sahariennes", ar: "رحلات استكشافية إرشادية" }, vertical: "trip", iconName: "Compass", listingCount: 35, isActive: true, order: 6 },
];

let promotionsStore: PromotionCoupon[] = [
  {
    id: "cpn_sahara2026",
    code: "SAHARA2026",
    discountType: "percentage",
    discountValue: 15,
    minSpendDzd: 50000,
    maxUsage: 100,
    usedCount: 38,
    startDate: "2026-10-01",
    endDate: "2026-12-31",
    status: "active",
    scope: "experience",
  },
  {
    id: "cpn_marhaban",
    code: "MARHABAN",
    discountType: "fixed_dzd",
    discountValue: 5000,
    minSpendDzd: 30000,
    maxUsage: 500,
    usedCount: 214,
    startDate: "2026-06-01",
    endDate: "2026-12-31",
    status: "active",
    scope: "all",
  },
  {
    id: "cpn_oran_sea",
    code: "ORANSEA",
    discountType: "percentage",
    discountValue: 10,
    minSpendDzd: 25000,
    maxUsage: 50,
    usedCount: 50,
    startDate: "2026-07-01",
    endDate: "2026-09-01",
    status: "expired",
    scope: "home",
  },
];

let platformSettingsStore: PlatformSettings = {
  platformName: "DARNA Admin Control Center",
  supportEmail: "support@darna.dz",
  supportPhone: "+213 21 00 00 00",
  defaultLocale: "fr",
  enabledLocales: ["en", "fr", "ar"],
  primaryCurrency: "DZD",
  supportedCurrencies: ["DZD", "EUR", "USD"],
  guestServiceFeePercent: 7.0,
  defaultCommissionRates: {
    individual: 12.0,
    agency: 15.0,
    hotel: 18.0,
    hostel: 10.0,
  },
  instantBookingPlatformWide: true,
  maintenanceMode: false,
  sessionTimeoutMinutes: 480,
  twoFactorAuthEnabled: false,
};

let onboardingConfigStore: OnboardingConfig = {
  version: 1,
  updatedAt: "2026-10-20T08:00:00Z",
  publishedBy: "DARNA Administrator",
  flows: {
    individual: {
      maxPagesAllowed: 2, // Strict solo flow capped at 2 pages
      steps: [
        {
          id: "step_ind_1",
          stepNumber: 1,
          isCore: true,
          isActive: true,
          title: { en: "Property Basics & Space", fr: "Informations Générales", ar: "المعلومات الأساسية" },
          description: { en: "Describe your home and space type", fr: "Décrivez votre hébergement", ar: "حدد نوع السكن وتفاصيل المساحة" },
          fields: [
            { id: "vertical", label: { en: "Vertical", fr: "Type", ar: "الفئة" }, type: "select", required: true, order: 1, isCore: true },
            { id: "propertyType", label: { en: "Property Type", fr: "Type de bien", ar: "نوع العقار" }, type: "text", required: true, order: 2 },
            { id: "wilaya", label: { en: "Wilaya", fr: "Wilaya", ar: "الولاية" }, type: "location", required: true, order: 3, isCore: true },
          ],
        },
        {
          id: "step_ind_2",
          stepNumber: 2,
          isCore: true,
          isActive: true,
          title: { en: "Pricing & Photos", fr: "Tarifs & Photographies", ar: "الأسعار والصور" },
          description: { en: "Set your nightly price in DZD and upload property photos", fr: "Fixez votre tarif par nuitée en DZD", ar: "حدد السعر بالدينار الجزائري وأضف الصور" },
          fields: [
            { id: "priceDzd", label: { en: "Nightly Price (DZD)", fr: "Prix par nuit (DZD)", ar: "سعر الليلة (د.ج)" }, type: "number", required: true, order: 1, isCore: true },
            { id: "photos", label: { en: "Property Photos", fr: "Photographies du bien", ar: "صور العقار" }, type: "file", required: true, order: 2, isCore: true },
          ],
        },
      ],
    },
    agency: {
      steps: [
        {
          id: "step_ag_1",
          stepNumber: 1,
          isCore: true,
          isActive: true,
          title: { en: "Agency Registration", fr: "Agrément & Statut de l'Agence", ar: "معلومات الوكالة السياحية" },
          description: { en: "Provide your commercial register and Ministry license", fr: "Renseignez le numéro CNRC et licence de tourisme", ar: "أدخل السجل التجاري ورخصة وزارة السياحة" },
          fields: [
            { id: "tradeRegister", label: { en: "CNRC Trade Register", fr: "Registre de Commerce CNRC", ar: "السجل التجاري" }, type: "text", required: true, order: 1, isCore: true },
            { id: "tourismLicense", label: { en: "Tourism License", fr: "Licence d'exploitation touristique", ar: "رخصة استغلال سياحية" }, type: "text", required: true, order: 2, isCore: true },
          ],
        },
      ],
    },
    hotel: {
      steps: [
        {
          id: "step_htl_1",
          stepNumber: 1,
          isCore: true,
          isActive: true,
          title: { en: "Hotel Classification", fr: "Classement Hôtelier & Étoiles", ar: "تصنيف الفندق والنجوم" },
          description: { en: "Specify star rating and room capacity", fr: "Précisez la classification en étoiles et capacité", ar: "حدد تصنيف النجوم وسعة الغرف" },
          fields: [
            { id: "starRating", label: { en: "Star Rating", fr: "Nombre d'étoiles", ar: "عدد النجوم" }, type: "number", required: true, order: 1, isCore: true },
            { id: "roomCount", label: { en: "Total Rooms", fr: "Nombre total de chambres", ar: "إجمالي عدد الغرف" }, type: "number", required: true, order: 2, isCore: true },
          ],
        },
      ],
    },
    hostel: {
      steps: [
        {
          id: "step_hst_1",
          stepNumber: 1,
          isCore: true,
          isActive: true,
          title: { en: "Hostel & Dormitory Details", fr: "Dortoirs & Capacité Lits", ar: "تفاصيل المهاجع والأسرة" },
          description: { en: "Setup shared dormitories and bed counts", fr: "Configurez les dortoirs partagés et capacité en lits", ar: "حدد المهاجع المشتركة وسعة الأسرة" },
          fields: [
            { id: "bedCount", label: { en: "Total Bed Count", fr: "Nombre total de lits", ar: "إجمالي الأسرة" }, type: "number", required: true, order: 1, isCore: true },
          ],
        },
      ],
    },
  },
};

export const store = {
  get hosts() { return hostsStore; },
  set hosts(val) { hostsStore = val; },

  get listings() { return listingsStore; },
  set listings(val) { listingsStore = val; },

  get users() { return usersStore; },
  set users(val) { usersStore = val; },

  get bookings() { return bookingsStore; },
  set bookings(val) { bookingsStore = val; },

  get reviews() { return reviewsStore; },
  set reviews(val) { reviewsStore = val; },

  get wallets() { return walletsStore; },
  set wallets(val) { walletsStore = val; },

  get transactions() { return transactionsStore; },
  set transactions(val) { transactionsStore = val; },

  get audit() { return auditStore; },
  set audit(val) { auditStore = val; },

  get team() { return teamStore; },
  set team(val) { teamStore = val; },

  get categories() { return categoriesStore; },
  set categories(val) { categoriesStore = val; },

  get promotions() { return promotionsStore; },
  set promotions(val) { promotionsStore = val; },

  get platformSettings() { return platformSettingsStore; },
  set platformSettings(val) { platformSettingsStore = val; },

  get onboardingConfig() { return onboardingConfigStore; },
  set onboardingConfig(val) { onboardingConfigStore = val; },
};
