import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const messagesDir = path.join(__dirname, "..", "messages");

const additions = {
  nav: {
    home: { en: "Home", fr: "Accueil", ar: "الرئيسية" },
    toReview: { en: "To review", fr: "À vérifier", ar: "قيد المراجعة" },
    guests: { en: "Guests", fr: "Voyageurs", ar: "الضيوف" },
    money: { en: "Money", fr: "Finances", ar: "المعاملات المالية" },
    manage: { en: "Manage", fr: "Gérer", ar: "إدارة" },
    hostSignUpSteps: { en: "Host sign-up steps", fr: "Étapes d'inscription des hôtes", ar: "خطوات تسجيل المضيفين" },
    whereDidItGo: { en: "Where did it go?", fr: "Où est passée ma page ?", ar: "أين ذهبت صفحتي؟" },
  },
  header: {
    pageHelp: { en: "Help & Guides", fr: "Aide & Guides", ar: "المساعدة والأدلة" },
    trainingMode: { en: "Training Mode", fr: "Mode entraînement", ar: "وضع التدريب" },
    trainingActive: { en: "Training Active", fr: "Entraînement actif", ar: "التدريب مفعّل" },
    simpleView: { en: "Simple view", fr: "Vue simple", ar: "عرض مبسط" },
    detailedView: { en: "Detailed view", fr: "Vue détaillée", ar: "عرض مفصل" },
  },
  dashboard: {
    greeting: { en: "Good morning, {name}", fr: "Bonjour, {name}", ar: "صباح الخير، {name}" },
    daySummaryNeeds: {
      en: "{hosts} hosts and {listings} listings are waiting for your decision.",
      fr: "{hosts} hôtes et {listings} annonces sont en attente de votre décision.",
      ar: "{hosts} مضيفين و {listings} إعلانات في انتظار قراركم.",
    },
    daySummaryCaughtUp: {
      en: "You're all caught up. Nothing needs your attention.",
      fr: "Tout est à jour. Aucune tâche urgente ne nécessite votre attention.",
      ar: "كل الأمور منجزة. لا توجد أي مهام معلقة تحتاج انتباهكم.",
    },
    reviewHosts: { en: "Review hosts", fr: "Examiner les hôtes", ar: "مراجعة المضيفين" },
    reviewListings: { en: "Review listings", fr: "Examiner les annonces", ar: "مراجعة الإعلانات" },
    checkReviews: { en: "Check reviews", fr: "Examiner les avis", ar: "فحص التقييمات" },
    seeBookings: { en: "See bookings", fr: "Voir les réservations", ar: "معاينة الحجوزات" },
    oldestWaiting: { en: "Oldest waiting: {time}", fr: "Plus ancien en attente : {time}", ar: "الأقدم في الانتظار: {time}" },
    allCaughtUp: { en: "All caught up", fr: "Tout est traité", ar: "الكل منجز" },
    kpiMoneyPaid: { en: "Money paid by guests", fr: "Argent payé par les voyageurs", ar: "المبالغ المدفوعة من الضيوف" },
    kpiEarnings: { en: "DARNA earnings", fr: "Revenus de DARNA", ar: "أرباح دارنا" },
    kpiNewHosts: { en: "New hosts", fr: "Nouveaux hôtes", ar: "المضيفون الجدد" },
    comparisonMore: { en: "{percent}% more than previous {period}", fr: "{percent}% de plus que la période précédente", ar: "أكثر بـ {percent}% من الفترة السابقة" },
    comparisonFewer: { en: "{percent}% fewer than previous {period}", fr: "{percent}% de moins que la période précédente", ar: "أقل بـ {percent}% من الفترة السابقة" },
    comparisonSame: { en: "Same as previous {period}", fr: "Identique à la période précédente", ar: "مماثل للفترة السابقة" },
    chartBookingsTitle: { en: "Bookings are up 12% this month", fr: "Les réservations sont en hausse de 12% ce mois-ci", ar: "الحجوزات ارتفعت بنسبة 12% هذا الشهر" },
    chartWilayasTitle: { en: "Oran, Algiers and Tipaza bring the most bookings", fr: "Oran, Alger et Tipaza génèrent le plus de réservations", ar: "وهران والجزائر وتيبازة تسجل أعلى نسبة حجوزات" },
    viewAsTable: { en: "View as table", fr: "Afficher en tableau", ar: "عرض كجدول" },
    viewAsChart: { en: "View as chart", fr: "Afficher en graphique", ar: "عرض كرسم بياني" },
    seeAllWilayas: { en: "See all wilayas", fr: "Voir toutes les wilayas", ar: "عرض كل الولايات" },
    axisBookings: { en: "Number of bookings", fr: "Nombre de réservations", ar: "عدد الحجوزات" },
    axisDay: { en: "Day", fr: "Jour", ar: "اليوم" },
    recentActivityTitle: { en: "Recent activity", fr: "Activité récente", ar: "العمليات الأخيرة" },
    seeAllHistory: { en: "See all history", fr: "Voir tout l'historique", ar: "عرض كامل السجل" },
    moreDetails: { en: "More details", fr: "Détails avancés", ar: "تفاصيل إضافية" },
    hideDetails: { en: "Hide details", fr: "Masquer les détails", ar: "إخفاء التفاصيل" },
  },
};

const periodsAddition = {
  today: { en: "Today", fr: "Aujourd'hui", ar: "اليوم" },
};

for (const loc of ["en", "fr", "ar"]) {
  const filePath = path.join(messagesDir, `${loc}.json`);
  const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));

  // merge additions
  for (const [section, keys] of Object.entries(additions)) {
    if (!data[section]) data[section] = {};
    for (const [k, translations] of Object.entries(keys)) {
      data[section][k] = translations[loc];
    }
  }

  if (data.dashboard && data.dashboard.periods) {
    data.dashboard.periods.today = periodsAddition.today[loc];
  }

  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n", "utf-8");
  console.log(`Updated ${loc}.json`);
}

console.log("✅ Successfully injected plain-language keys!");
