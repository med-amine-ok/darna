/**
 * DARNA Admin — Plain-Language Glossary & Semantic Dictionary
 * Implements IHM course rules (§3.2, T3: Hick's Law, Langage employé)
 * 
 * Strict rule: Never display raw system jargon, database codes, or cryptic abbreviations.
 * Always translate system entities to human, plain-language terms.
 */

export interface GlossaryEntry {
  term: string;
  plainTerm: {
    en: string;
    fr: string;
    ar: string;
  };
  definition: {
    en: string;
    fr: string;
    ar: string;
  };
  howItIsCounted?: {
    en: string;
    fr: string;
    ar: string;
  };
}

export const GLOSSARY: Record<string, GlossaryEntry> = {
  // Financial Metrics
  gmv: {
    term: "GMV / Gross Volume",
    plainTerm: {
      en: "Money paid by guests",
      fr: "Argent payé par les voyageurs",
      ar: "المبالغ المدفوعة من الضيوف",
    },
    definition: {
      en: "The total payment made in Algerian Dinars by guests for all stays and experiences.",
      fr: "Le montant total en Dinars Algériens réglé par les voyageurs pour leurs séjours et activités.",
      ar: "إجمالي المبالغ المدفوعة بالدينار الجزائري من قبل الضيوف لكافة الإقامات والأنشطة.",
    },
    howItIsCounted: {
      en: "Sum of nightly stay rates, cleaning fees, and service charges across confirmed bookings.",
      fr: "Somme des tarifs de nuitées, frais de ménage et services sur les réservations confirmées.",
      ar: "مجموع أسعار الإقامة والخدمات على الحجوزات المؤكدة.",
    },
  },
  commission: {
    term: "Commission revenue",
    plainTerm: {
      en: "DARNA earnings",
      fr: "Revenus de DARNA",
      ar: "أرباح دارنا",
    },
    definition: {
      en: "The platform service fee kept by DARNA to operate support, servers, and marketing.",
      fr: "La commission conservée par DARNA pour faire fonctionner le service, le support et la promotion.",
      ar: "العمولة المقتطعة لتشغيل المنصة، الدعم الفني، وخدمة العملاء في الجزائر.",
    },
    howItIsCounted: {
      en: "The platform commission tier (e.g., 10% to 15%) applied to each booking transaction.",
      fr: "Pourcentage de commission (ex. 10% à 15%) appliqué sur chaque réservation.",
      ar: "نسبة العمولة المطبقة (مثل 10% إلى 15%) على كل عملية حجز.",
    },
  },
  bookingsCount: {
    term: "Total Bookings",
    plainTerm: {
      en: "Bookings",
      fr: "Réservations",
      ar: "الحجوزات",
    },
    definition: {
      en: "Total reservations created by guests for family stays, hotels, or Sahara expeditions.",
      fr: "Nombre total de séjours réservés par les voyageurs (villas, hôtels ou circuits).",
      ar: "العدد الإجمالي للحجوزات التي قام بها المسافرون للإقامات والرحلات.",
    },
    howItIsCounted: {
      en: "Count of all confirmed, completed, and in-progress guest reservations.",
      fr: "Total des réservations confirmées, en cours ou terminées sur la période choisie.",
      ar: "مجموع الحجوزات المؤكدة أو المكتملة خلال الفترة المحددة.",
    },
  },
  newHosts: {
    term: "New Hosts",
    plainTerm: {
      en: "New hosts",
      fr: "Nouveaux hôtes",
      ar: "المضيفون الجدد",
    },
    definition: {
      en: "New Algerian individuals, tourism agencies, hotels, and hostels that joined DARNA.",
      fr: "Nouveaux partenaires algériens (particuliers, agences, hôtels, auberges) ayant rejoint la plateforme.",
      ar: "الشركاء الجدد في الجزائر (أفراد، وكالات سياحة، فنادق، وبيوت شباب) المنضمون إلى دارنا.",
    },
    howItIsCounted: {
      en: "Count of newly registered and approved host profiles during the period.",
      fr: "Nombre de nouveaux profils d'hôtes validés durant la période sélectionnée.",
      ar: "عدد حسابات المضيفين الجديدة التي تمت مراجعتها وقبولها خلال الفترة.",
    },
  },
  occupancy: {
    term: "Occupancy Rate",
    plainTerm: {
      en: "Nights booked out of nights available",
      fr: "Nuits réservées sur les nuits disponibles",
      ar: "الليالي المحجوزة من الليالي المتاحة",
    },
    definition: {
      en: "Percentage of calendar days that accommodation listings were occupied by guests.",
      fr: "Pourcentage des nuits ouvertes au calendrier qui ont effectivement fait l'objet d'un séjour.",
      ar: "نسبة الأيام التي كانت فيها أماكن الإقامة محجوزة فعلياً مقارنة بالأيام المتاحة.",
    },
    howItIsCounted: {
      en: "(Nights booked ÷ total available nights on host calendars) × 100.",
      fr: "(Nuits réservées ÷ total des nuits ouvertes à la réservation) × 100.",
      ar: "(الليالي المحجوزة ÷ إجمالي الليالي المتاحة) × 100.",
    },
  },
  cancellationRate: {
    term: "Cancellation / Churn Rate",
    plainTerm: {
      en: "Bookings cancelled",
      fr: "Réservations annulées",
      ar: "الحجوزات الملغاة",
    },
    definition: {
      en: "Percentage of booked reservations that were cancelled before check-in.",
      fr: "Proportion des réservations ayant été annulées avant l'arrivée du voyageur.",
      ar: "نسبة الحجوزات التي ألغيت قبل موعد الوصول.",
    },
  },
  payout: {
    term: "Payout",
    plainTerm: {
      en: "Payment to host",
      fr: "Versement à l'hôte",
      ar: "دفع المستحقات للمضيف",
    },
    definition: {
      en: "Net funds transferred to a partner's bank or CCP account after DARNA commission.",
      fr: "Fonds nets versés sur le compte bancaire ou CCP du partenaire après déduction de la commission.",
      ar: "المستحقات الصافية المحولة إلى الحساب البنكي أو حساب بريدي موب/CCP الخاص بالمضيف.",
    },
  },
  auditLog: {
    term: "Audit Log",
    plainTerm: {
      en: "History of actions",
      fr: "Historique des actions",
      ar: "سجل العمليات",
    },
    definition: {
      en: "Chronological record of every administrative action, approval, and balance adjustment.",
      fr: "Relevé chronologique et infalsifiable de toutes les décisions prises par l'équipe d'administration.",
      ar: "سجل زمني دقيق لكافة القرارات الإدارية، الاعتمادات، وتعديلات الأرصدة.",
    },
  },
  onboardingConfig: {
    term: "Onboarding Config",
    plainTerm: {
      en: "Host sign-up steps",
      fr: "Étapes d'inscription des hôtes",
      ar: "خطوات تسجيل المضيفين",
    },
    definition: {
      en: "The required documents and profile questions that hosts must complete before going live.",
      fr: "La liste des documents et pièces d'identité que chaque catégorie d'hôte doit fournir.",
      ar: "المستندات والمعلومات المطلوبة التي يجب على المضيف إرفاقها قبل اعتماد حسابه.",
    },
  },
  pendingReview: {
    term: "Pending Review",
    plainTerm: {
      en: "Waiting for your decision",
      fr: "En attente de votre décision",
      ar: "في انتظار قراركم",
    },
    definition: {
      en: "An application or listing awaiting review and decision by a staff moderator.",
      fr: "Un dossier ou une annonce en attente de vérification par un modérateur.",
      ar: "ملف مضيف أو إعلان في انتظار مراجعة وتأكيد فريق الإشراف.",
    },
  },
  users: {
    term: "Users",
    plainTerm: {
      en: "Guests",
      fr: "Voyageurs",
      ar: "الضيوف",
    },
    definition: {
      en: "Algerian and international travelers who book accommodations and tours on DARNA.",
      fr: "Voyageurs algériens et internationaux qui réservent des séjours sur DARNA.",
      ar: "المسافرون الجزائريون والأجانب الذين يقومون بالحجز والتنقل عبر دارنا.",
    },
  },
};

/**
 * Get plain term for a specific language
 */
export function getPlainTerm(key: string, locale: "en" | "fr" | "ar" = "en"): string {
  const entry = GLOSSARY[key];
  if (!entry) return key;
  return entry.plainTerm[locale] || entry.plainTerm.en;
}

/**
 * Get full definition for a specific language
 */
export function getDefinition(key: string, locale: "en" | "fr" | "ar" = "en"): string {
  const entry = GLOSSARY[key];
  if (!entry) return "";
  return entry.definition[locale] || entry.definition.en;
}

/**
 * Get how it is counted explanation
 */
export function getHowItIsCounted(key: string, locale: "en" | "fr" | "ar" = "en"): string {
  const entry = GLOSSARY[key];
  if (!entry?.howItIsCounted) return "";
  return entry.howItIsCounted[locale] || entry.howItIsCounted.en;
}

/**
 * Where Did It Go? Migration mapping for existing staff
 * Accompanies change to avoid "Syndrome de l'oisillon" (T6)
 */
export interface MigrationItem {
  oldName: { en: string; fr: string; ar: string };
  newName: { en: string; fr: string; ar: string };
  location: { en: string; fr: string; ar: string };
  href: string;
  description: { en: string; fr: string; ar: string };
}

export const WHERE_DID_IT_GO_ITEMS: MigrationItem[] = [
  {
    oldName: {
      en: "Users / User Management",
      fr: "Utilisateurs / Gestion utilisateurs",
      ar: "المستخدمين / إدارة المستخدمين",
    },
    newName: {
      en: "Guests",
      fr: "Voyageurs",
      ar: "الضيوف",
    },
    location: {
      en: "Main Navigation (#4)",
      fr: "Menu principal (#4)",
      ar: "القائمة الرئيسية (#4)",
    },
    href: "/users",
    description: {
      en: "Renamed to 'Guests' to use the language of our marketplace. Manages guest profiles, booking history, and accounts.",
      fr: "Renommé « Voyageurs » pour parler le langage du terrain. Permet de consulter les comptes voyageurs et leurs réservations.",
      ar: "تمت التسمية بـ 'الضيوف' تماشياً مع طبيعة الخدمة. لإدارة حسابات المسافرين وسجلات حجوزاتهم.",
    },
  },
  {
    oldName: {
      en: "Onboarding Config",
      fr: "Configuration Onboarding",
      ar: "إعدادات التسجيل",
    },
    newName: {
      en: "Host sign-up steps",
      fr: "Étapes d'inscription des hôtes",
      ar: "خطوات تسجيل المضيفين",
    },
    location: {
      en: "Sidebar > Manage > Host sign-up steps",
      fr: "Menu > Gérer > Étapes d'inscription des hôtes",
      ar: "القائمة > إدارة > خطوات تسجيل المضيفين",
    },
    href: "/onboarding",
    description: {
      en: "Configure the identity documents and verification steps required for Solo hosts, Agencies, Hotels, and Hostels.",
      fr: "Configurez les pièces d'identité et étapes requises pour chaque type d'hôte (Particulier, Agence, Hôtel, Auberge).",
      ar: "تحديد الوثائق والخطوات المطلوبة لكل فئة من المضيفين قبل تفعيل حساباتهم.",
    },
  },
  {
    oldName: {
      en: "Audit Log",
      fr: "Journal d'audit (Audit Log)",
      ar: "سجل التدقيق (Audit)",
    },
    newName: {
      en: "History of actions",
      fr: "Historique des actions",
      ar: "سجل العمليات",
    },
    location: {
      en: "Sidebar > Manage > Settings > History of actions",
      fr: "Menu > Gérer > Paramètres > Historique des actions",
      ar: "القائمة > إدارة > الإعدادات > سجل العمليات",
    },
    href: "/audit-log",
    description: {
      en: "Complete chronological timeline of all staff decisions, wallet top-ups, and approvals.",
      fr: "Historique complet de toutes les décisions de modération, validations et recharges de portefeuilles.",
      ar: "السجل التاريخي الشامل لكافة الإجراءات الإدارية، التحويلات المالية، والاعتمادات.",
    },
  },
  {
    oldName: {
      en: "Treasury & Finance",
      fr: "Trésorerie & Finance",
      ar: "الخزينة والمالية",
    },
    newName: {
      en: "Money",
      fr: "Finances",
      ar: "المعاملات المالية",
    },
    location: {
      en: "Main Navigation (#7)",
      fr: "Menu principal (#7)",
      ar: "القائمة الرئيسية (#7)",
    },
    href: "/finance",
    description: {
      en: "Host wallets, balance top-ups via CCP/bank, platform commission earnings, and payout approvals.",
      fr: "Portefeuilles des hôtes, recharges manuelles CCP/virement, commissions DARNA et validation des versements.",
      ar: "محافظ المضيفين، الشحن اليدوي عبر CCP/البنك، عمولات دارنا، واعتماد الدفعات.",
    },
  },
  {
    oldName: {
      en: "Team & Permissions",
      fr: "Équipe & Rôles",
      ar: "فريق العمل والصلاحيات",
    },
    newName: {
      en: "Team",
      fr: "Équipe",
      ar: "فريق العمل",
    },
    location: {
      en: "Sidebar > Manage > Settings > Team",
      fr: "Menu > Gérer > Paramètres > Équipe",
      ar: "القائمة > إدارة > الإعدادات > فريق العمل",
    },
    href: "/team",
    description: {
      en: "Manage staff accounts, moderator access, finance officers, and supervisor roles.",
      fr: "Gestion des comptes modérateurs, agents de support et responsables financiers.",
      ar: "إدارة حسابات موظفي الإشراف والدعم الفني والمسؤولين الماليين.",
    },
  },
  {
    oldName: {
      en: "Dispute Arbitration",
      fr: "Arbitrage des litiges",
      ar: "التحكيم في النزاعات",
    },
    newName: {
      en: "Disputed Bookings",
      fr: "Litiges de réservations",
      ar: "نزاعات الحجوزات",
    },
    location: {
      en: "Sidebar > Bookings (Disputes tab) or Home card",
      fr: "Menu > Réservations (Onglet Litiges) ou Carte d'accueil",
      ar: "القائمة > الحجوزات (تبويب النزاعات) أو بطاقة الرئيسية",
    },
    href: "/bookings?tab=disputed",
    description: {
      en: "Inspect booking conflicts, review evidence, and decide on guest refunds or host payouts.",
      fr: "Résoudre les conflits de séjour entre hôtes et voyageurs avec remboursement ou maintien du versement.",
      ar: "متابعة الخلافات بين الضيوف والمضيفين واتخاذ قرارات استرداد المبالغ أو صرفها.",
    },
  },
];
