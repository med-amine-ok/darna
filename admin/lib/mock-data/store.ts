import "server-only";

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
  PayoutRequest,
} from "@/lib/types";
import { DEFAULT_COMMISSION_RATES, GUEST_SERVICE_FEE_PERCENT } from "@/lib/pricing";

import { SEED_ADMINS } from "./admins";

/**
 * Mock database. All state lives in ONE object on globalThis so that every
 * server entry point (RSC pages, server actions, route handlers) and dev hot
 * reloads share the same "server-side source of truth". Each collection maps
 * to a future DB table; lib/data/* are the only modules allowed to touch it.
 */
function createMockDb() {
  const initialData = generateSeedData();

  const hostsStore: Host[] = [...initialData.hosts];
  const listingsStore: Listing[] = [...initialData.listings];
  const usersStore: GuestUser[] = [...initialData.users];
  const bookingsStore: Booking[] = [...initialData.bookings];
  const reviewsStore: ReviewItem[] = [...initialData.reviews];
  const walletsStore: HostWallet[] = [...initialData.wallets];
  const transactionsStore: WalletTransaction[] = [...initialData.transactions];
  const auditStore: AuditEntry[] = initialData.auditEntries.map((e) => Object.freeze({ ...e }));
  const payoutsStore: PayoutRequest[] = [...initialData.payouts];
  const teamStore: AdminUser[] = SEED_ADMINS.map((u) => ({ ...u }));

  const categoriesStore: CategoryItem[] = [
    { id: "cat_villas", name: { en: "Coastal Villas", fr: "Villas Côtières", ar: "فيلات ساحلية" }, vertical: "home", iconName: "Home", listingCount: 48, isActive: true, order: 1 },
    { id: "cat_sahara", name: { en: "Desert Camps & Bivouacs", fr: "Camps Sahariens", ar: "مخيمات صحراوية" }, vertical: "experience", iconName: "Tent", listingCount: 42, isActive: true, order: 2 },
    { id: "cat_4x4", name: { en: "4x4 Desert Overlanders", fr: "Véhicules Tout-Terrain", ar: "مركبات الدفع الرباعي" }, vertical: "vehicle", iconName: "Truck", listingCount: 28, isActive: true, order: 3 },
  ];

  const promotionsStore: PromotionCoupon[] = [
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

  const platformSettingsStore: PlatformSettings = {
    platformName: "DARNA Admin Control Center",
    supportEmail: "support@darna.dz",
    supportPhone: "+213 21 00 00 00",
    defaultLocale: "fr",
    enabledLocales: ["en", "fr", "ar"],
    primaryCurrency: "DZD",
    supportedCurrencies: ["DZD", "EUR", "USD"],
    guestServiceFeePercent: GUEST_SERVICE_FEE_PERCENT,
    defaultCommissionRates: { ...DEFAULT_COMMISSION_RATES },
    instantBookingPlatformWide: true,
    maintenanceMode: false,
    sessionTimeoutMinutes: 480,
    twoFactorAuthEnabled: false,
  };

  const onboardingConfigStore: OnboardingConfig = {
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

  return {
    hosts: hostsStore,
    listings: listingsStore,
    users: usersStore,
    bookings: bookingsStore,
    reviews: reviewsStore,
    wallets: walletsStore,
    transactions: transactionsStore,
    audit: auditStore,
    payouts: payoutsStore,
    team: teamStore,
    categories: categoriesStore,
    promotions: promotionsStore,
    platformSettings: platformSettingsStore,
    onboardingConfig: onboardingConfigStore,
    /** adminId -> password hash ("scrypt$salt$hash"); seeded lazily by lib/auth/credentials. */
    credentials: new Map<string, string>(),
  };
}

type MockDb = ReturnType<typeof createMockDb>;

const globalForDb = globalThis as unknown as { __darnaMockDb?: MockDb };
const db: MockDb = (globalForDb.__darnaMockDb ??= createMockDb());

export const store = {
  get hosts() { return db.hosts; },
  set hosts(val) { db.hosts = val; },

  get listings() { return db.listings; },
  set listings(val) { db.listings = val; },

  get users() { return db.users; },
  set users(val) { db.users = val; },

  get bookings() { return db.bookings; },
  set bookings(val) { db.bookings = val; },

  get reviews() { return db.reviews; },
  set reviews(val) { db.reviews = val; },

  get wallets() { return db.wallets; },
  set wallets(val) { db.wallets = val; },

  get transactions() { return db.transactions; },
  set transactions(val) { db.transactions = val; },

  /**
   * Audit trail is APPEND-ONLY: read access returns a readonly view of frozen
   * entries, there is no setter, and the only mutator is appendAudit()
   * (called exclusively by lib/data/audit.logAudit).
   */
  get audit(): ReadonlyArray<Readonly<AuditEntry>> { return db.audit; },
  appendAudit(entry: AuditEntry): Readonly<AuditEntry> {
    const frozen = Object.freeze({
      ...entry,
      beforeState: entry.beforeState ? Object.freeze({ ...entry.beforeState }) : undefined,
      afterState: entry.afterState ? Object.freeze({ ...entry.afterState }) : undefined,
    });
    db.audit.unshift(frozen);
    return frozen;
  },

  get payouts() { return db.payouts; },
  set payouts(val) { db.payouts = val; },

  get team() { return db.team; },
  set team(val) { db.team = val; },

  get categories() { return db.categories; },
  set categories(val) { db.categories = val; },

  get promotions() { return db.promotions; },
  set promotions(val) { db.promotions = val; },

  get platformSettings() { return db.platformSettings; },
  set platformSettings(val) { db.platformSettings = val; },

  get onboardingConfig() { return db.onboardingConfig; },
  set onboardingConfig(val) { db.onboardingConfig = val; },

  get credentials() { return db.credentials; },
};
