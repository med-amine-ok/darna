// TODO: replace with Supabase query
import { HostType, OnboardingStepConfig, HostTypeOnboardingConfig } from "@/types";

export const defaultOnboardingConfigs: Record<HostType, OnboardingStepConfig[]> = {
  individual: [
    {
      id: "category_vertical",
      stepNumber: 1,
      isCore: true,
      isActive: true,
      title: {
        en: "Property Category & Vertical",
        fr: "Catégorie et Type de Propriété",
        ar: "فئة ونوع العقار",
      },
      description: {
        en: "Choose the vertical and architectural category that best fits your listing.",
        fr: "Choisissez la catégorie verticale et architecturale la plus adaptée.",
        ar: "اختر الفئة المعمارية والنوع الأنسب لعقارك.",
      },
      fields: [
        {
          id: "vertical",
          label: { en: "Vertical", fr: "Type vertical", ar: "نوع العرض" },
          type: "select",
          required: true,
          order: 1,
          isCore: true,
          options: [
            { value: "home", label: { en: "Home / Stay", fr: "Hébergement", ar: "إقامة / سكن" } },
            { value: "vehicle", label: { en: "Vehicle Rental", fr: "Location de véhicule", ar: "تأجير سيارة" } },
            { value: "experience", label: { en: "Experience / Tour", fr: "Expérience / Visite", ar: "تجربة سياحية" } },
          ],
        },
        {
          id: "category",
          label: { en: "Listing Category", fr: "Catégorie", ar: "التصنيف" },
          type: "select",
          required: true,
          order: 2,
          isCore: true,
          options: [
            { value: "Villa", label: { en: "Villa", fr: "Villa", ar: "فيلا" } },
            { value: "Casbah Heritage House", label: { en: "Casbah Heritage House", fr: "Maison Traditionnelle Casbah", ar: "دار قصبية عريقة" } },
            { value: "Seaside Apartment", label: { en: "Seaside Apartment", fr: "Appartement Front de Mer", ar: "شقة مطلة على البحر" } },
            { value: "Saharan Ksar", label: { en: "Saharan Ksar", fr: "Ksar Saharien", ar: "قصر صحراوي" } },
            { value: "Desert Camp", label: { en: "Desert Camp", fr: "Campement Bivouac", ar: "مخيم صحراوي" } },
          ],
        },
      ],
    },
    {
      id: "placement",
      stepNumber: 2,
      isCore: false,
      isActive: true,
      title: {
        en: "Privacy & Space Type",
        fr: "Type d'Espace et Intimité",
        ar: "نوع المساحة والخصوصية",
      },
      description: {
        en: "Specify what kind of space guests will have during their stay.",
        fr: "Précisez l'espace dont disposeront les voyageurs.",
        ar: "حدد طبيعة المساحة المتاحة للضيوف.",
      },
      fields: [
        {
          id: "placement",
          label: { en: "Space Privacy", fr: "Intimité du logement", ar: "مستوى الخصوصية" },
          type: "select",
          required: true,
          order: 1,
          options: [
            { value: "entire", label: { en: "An entire place", fr: "Logement entier", ar: "مسكن كامل" } },
            { value: "private_room", label: { en: "A private room", fr: "Chambre privée", ar: "غرفة خاصة" } },
            { value: "shared_room", label: { en: "A shared room", fr: "Chambre partagée", ar: "غرفة مشتركة" } },
          ],
        },
      ],
    },
    {
      id: "location",
      stepNumber: 3,
      isCore: true,
      isActive: true,
      title: {
        en: "Location & Address",
        fr: "Emplacement et Adresse",
        ar: "الموقع والعنوان",
      },
      description: {
        en: "Pin your property in Algeria so guests can easily find it.",
        fr: "Indiquez l'emplacement de votre bien en Algérie.",
        ar: "حدد موقع عقارك في الجزائر ليتمكن الضيوف من الوصول إليه.",
      },
      fields: [
        {
          id: "wilaya",
          label: { en: "Wilaya (Province)", fr: "Wilaya", ar: "الولاية" },
          type: "select",
          required: true,
          order: 1,
          isCore: true,
          options: [
            { value: "Algiers", label: { en: "Algiers (Alger)", fr: "Alger", ar: "الجزائر" } },
            { value: "Oran", label: { en: "Oran (Wahran)", fr: "Oran", ar: "وهران" } },
            { value: "Constantine", label: { en: "Constantine", fr: "Constantine", ar: "قسنطينة" } },
            { value: "Tipaza", label: { en: "Tipaza", fr: "Tipaza", ar: "تيبازة" } },
            { value: "Djanet (Sahara)", label: { en: "Djanet (Sahara)", fr: "Djanet", ar: "جانت (الصحراء)" } },
            { value: "Taghit (Bechar)", label: { en: "Taghit (Bechar)", fr: "Taghit", ar: "تاغيت (بشار)" } },
            { value: "Bejaia", label: { en: "Bejaia", fr: "Béjaïa", ar: "بجاية" } },
            { value: "Ghardaia (M'zab)", label: { en: "Ghardaia (M'zab)", fr: "Ghardaïa", ar: "غرداية" } },
            { value: "Tlemcen", label: { en: "Tlemcen", fr: "Tlemcen", ar: "تلمسان" } },
            { value: "Annaba", label: { en: "Annaba", fr: "Annaba", ar: "عنابة" } },
          ],
        },
        {
          id: "city",
          label: { en: "City / District", fr: "Commune / Quartier", ar: "البلدية / الحي" },
          type: "text",
          required: true,
          order: 2,
          isCore: true,
          placeholder: { en: "e.g. Hydra, El Biar, Sidi M'Hamed", fr: "ex. Hydra, El Biar", ar: "مثال: حيدرة، الأبيار" },
        },
        {
          id: "address",
          label: { en: "Street Address", fr: "Adresse exacte", ar: "العنوان بالشارع" },
          type: "text",
          required: true,
          order: 3,
          placeholder: { en: "e.g. 14 Rue Didouche Mourad", fr: "ex. 14 Rue Didouche Mourad", ar: "مثال: 14 شارع ديدوش مراد" },
        },
      ],
    },
    {
      id: "capacity",
      stepNumber: 4,
      isCore: false,
      isActive: true,
      title: {
        en: "Floor Plan & Capacity",
        fr: "Capacité d'Accueil et Chambres",
        ar: "سعة الاستقبال والغرف",
      },
      description: {
        en: "Share the basics about how many guests and beds your place accommodates.",
        fr: "Indiquez le nombre de voyageurs et de lits disponibles.",
        ar: "حدد عدد الضيوف والأسرة التي يتسع لها عقارك.",
      },
      fields: [
        {
          id: "guestCount",
          label: { en: "Maximum Guests", fr: "Voyageurs max", ar: "أقصى عدد للضيوف" },
          type: "number",
          required: true,
          order: 1,
          defaultValue: 4,
        },
        {
          id: "bedroomCount",
          label: { en: "Bedrooms", fr: "Chambres", ar: "غرف النوم" },
          type: "number",
          required: true,
          order: 2,
          defaultValue: 2,
        },
        {
          id: "bedsCount",
          label: { en: "Beds", fr: "Lits", ar: "الأسرة" },
          type: "number",
          required: true,
          order: 3,
          defaultValue: 3,
        },
        {
          id: "bathroomCount",
          label: { en: "Bathrooms", fr: "Salles de bain", ar: "الحمامات" },
          type: "number",
          required: true,
          order: 4,
          defaultValue: 1,
        },
      ],
    },
    {
      id: "amenities",
      stepNumber: 5,
      isCore: false,
      isActive: true,
      title: {
        en: "Amenities & Comforts",
        fr: "Équipements et Confort",
        ar: "المرافق ووسائل الراحة",
      },
      description: {
        en: "Select key features that elevate the Algerian guest experience.",
        fr: "Sélectionnez les équipements majeurs offerts à vos invités.",
        ar: "حدد الميزات الأساسية لراحة الضيوف.",
      },
      fields: [
        {
          id: "selectedAmenities",
          label: { en: "Offered Amenities", fr: "Équipements", ar: "المرافق المتوفرة" },
          type: "multi-select",
          required: false,
          order: 1,
          options: [
            { value: "wifi", label: { en: "Fast WiFi", fr: "WiFi haut débit", ar: "واي فاي سريع" } },
            { value: "air_conditioning", label: { en: "Air Conditioning", fr: "Climatisation", ar: "مكيف هواء" } },
            { value: "kitchen", label: { en: "Equipped Kitchen", fr: "Cuisine équipée", ar: "مطبخ مجهز" } },
            { value: "free_parking", label: { en: "Free Parking", fr: "Parking gratuit", ar: "موقف مجاني" } },
            { value: "sea_view", label: { en: "Sea View", fr: "Vue sur mer", ar: "إطلالة بحرية" } },
            { value: "traditional_patio", label: { en: "Traditional Patio", fr: "Patio traditionnel", ar: "فناء تقليدي" } },
            { value: "pool", label: { en: "Swimming Pool", fr: "Piscine privée", ar: "مسبح خاص" } },
          ],
        },
      ],
    },
    {
      id: "photos",
      stepNumber: 6,
      isCore: true,
      isActive: true,
      title: {
        en: "High-Resolution Photos",
        fr: "Galerie Photos Haute Définition",
        ar: "معرض الصور عالي الجودة",
      },
      description: {
        en: "Upload at least 4 clear photos showing living spaces, bedrooms and views.",
        fr: "Ajoutez au minimum 4 photos lumineuses de votre logement.",
        ar: "أضف ما لا يقل عن 4 صور واضحة لمسكنك.",
      },
      fields: [
        {
          id: "photos",
          label: { en: "Photo Gallery", fr: "Galerie photos", ar: "معرض الصور" },
          type: "image-upload",
          required: true,
          order: 1,
          isCore: true,
          helpText: {
            en: "Minimum 4 photos required for verified listings.",
            fr: "Au moins 4 photos nécessaires pour validation.",
            ar: "يلزم 4 صور كحد أدنى للمطابقة.",
          },
        },
      ],
    },
    {
      id: "title_description",
      stepNumber: 7,
      isCore: true,
      isActive: true,
      title: {
        en: "Listing Title & Story",
        fr: "Titre et Description",
        ar: "العنوان والوصف",
      },
      description: {
        en: "Craft a captivating headline and descriptive story for your property.",
        fr: "Rédigez un titre accrocheur et une description chaleureuse.",
        ar: "اكتب عنواناً جذاباً ووصفاً وافياً لتجربة الضيوف في عقارك.",
      },
      fields: [
        {
          id: "title",
          label: { en: "Headline Title", fr: "Titre principal", ar: "العنوان الرئيسي" },
          type: "text",
          required: true,
          order: 1,
          isCore: true,
          placeholder: {
            en: "e.g. Stunning Mediterranean Villa with Private Garden",
            fr: "ex. Splendide Villa Méditerranéenne avec Jardin",
            ar: "مثال: فيلا ساحلية فاخرة مع حديقة خاصة",
          },
        },
        {
          id: "description",
          label: { en: "Detailed Description", fr: "Description détaillée", ar: "الوصف التفصيلي" },
          type: "textarea",
          required: true,
          order: 2,
          isCore: true,
          placeholder: {
            en: "Highlight the surroundings, proximity to transport, and atmosphere...",
            fr: "Décrivez les atouts, la proximité des transports et l'ambiance...",
            ar: "وضح محيط العقار وقربه من وسائل النقل وطابعه المميز...",
          },
        },
      ],
    },
    {
      id: "approval_mode",
      stepNumber: 8,
      isCore: true,
      isActive: true,
      title: {
        en: "Booking Approval Mode",
        fr: "Mode d'Approbation des Réservations",
        ar: "طريقة تأكيد الحجوزات",
      },
      description: {
        en: "Choose how you want to handle incoming guest booking requests.",
        fr: "Définissez comment vous traitez les demandes de réservation reçues.",
        ar: "اختر الكيفية التي ترغب بها في إدارة طلبات الحجز القادمة.",
      },
      fields: [
        {
          id: "instantBook",
          label: { en: "Approval Setting", fr: "Paramètre d'approbation", ar: "خيار الموافقة" },
          type: "select",
          required: true,
          order: 1,
          isCore: true,
          options: [
            {
              value: "instant",
              label: {
                en: "Instant Book (Automated Confirmation)",
                fr: "Réservation Instantanée (Automatique)",
                ar: "حجز فوري (تأكيد تلقائي فوري)",
              },
            },
            {
              value: "request",
              label: {
                en: "Request to Book (Manual Host Approval)",
                fr: "Demande de Réservation (Validation manuelle)",
                ar: "طلب حجز (موافقة يدوية مسبقة من المضيف)",
              },
            },
          ],
        },
      ],
    },
    {
      id: "pricing",
      stepNumber: 9,
      isCore: true,
      isActive: true,
      title: {
        en: "Nightly Pricing (DZD)",
        fr: "Tarification par Nuitée (DZD)",
        ar: "سعر الليلة (د.ج)",
      },
      description: {
        en: "Set your competitive base nightly rate in Algerian Dinars.",
        fr: "Fixez votre tarif de base par nuitée en Dinars Algériens.",
        ar: "حدد سعرك الأساسي لكل ليلة بالدينار الجزائري.",
      },
      fields: [
        {
          id: "price",
          label: { en: "Base Nightly Price (DZD)", fr: "Prix par nuitée (DZD)", ar: "سعر الليلة الواحدة (د.ج)" },
          type: "number",
          required: true,
          order: 1,
          isCore: true,
          defaultValue: 18500,
        },
      ],
    },
    {
      id: "policies",
      stepNumber: 10,
      isCore: false,
      isActive: true,
      title: {
        en: "Cancellation Policy & Rules",
        fr: "Politique d'Annulation et Règlement",
        ar: "سياسة الإلغاء والقواعد",
      },
      description: {
        en: "Specify refund policies and house guidelines for visiting guests.",
        fr: "Précisez vos conditions d'annulation et règles du logement.",
        ar: "حدد شروط الإلغاء وقواعد الإقامة للضيوف.",
      },
      fields: [
        {
          id: "cancellationPolicy",
          label: { en: "Cancellation Policy", fr: "Politique d'annulation", ar: "سياسة الإلغاء" },
          type: "select",
          required: true,
          order: 1,
          options: [
            { value: "flexible", label: { en: "Flexible (Full refund up to 24h before)", fr: "Flexible (Remboursement jusqu'à 24h)", ar: "مرنة (استرداد كامل حتى 24 ساعة)" } },
            { value: "moderate", label: { en: "Moderate (Full refund up to 5 days before)", fr: "Modérée (Remboursement jusqu'à 5 jours)", ar: "معتدلة (استرداد حتى 5 أيام)" } },
            { value: "strict", label: { en: "Strict (50% refund up to 7 days before)", fr: "Stricte (50% jusqu'à 7 jours)", ar: "صارمة (50% حتى 7 أيام)" } },
          ],
        },
      ],
    },
    {
      id: "review",
      stepNumber: 11,
      isCore: true,
      isActive: true,
      title: {
        en: "Summary Review",
        fr: "Révision Complète",
        ar: "مراجعة البيانات",
      },
      description: {
        en: "Review all listing details before publishing live to travelers.",
        fr: "Vérifiez les informations avant la mise en ligne.",
        ar: "راجع كافة التفاصيل قبل نشر الإعلان للزوار.",
      },
      fields: [],
    },
    {
      id: "publish",
      stepNumber: 12,
      isCore: true,
      isActive: true,
      title: {
        en: "Publish & Launch",
        fr: "Publication et Mise en Ligne",
        ar: "نشر وإطلاق الإعلان",
      },
      description: {
        en: "Activate your listing in the DARNA marketplace.",
        fr: "Activez votre annonce sur le marché DARNA.",
        ar: "تفعيل إعلانك على منصة دارنا.",
      },
      fields: [],
    },
  ],

  agency: [
    {
      id: "agency_basics",
      stepNumber: 1,
      isCore: true,
      isActive: true,
      title: {
        en: "Agency Identity & Category",
        fr: "Identité de l'Agence & Catégorie",
        ar: "هوية الوكالة والتصنيف",
      },
      description: {
        en: "Provide your commercial tourism agency registered trade name.",
        fr: "Renseignez la dénomination commerciale de votre agence de tourisme.",
        ar: "أدخل الاسم التجاري المسجل لوكالتك السياحية.",
      },
      fields: [
        {
          id: "businessName",
          label: { en: "Agency Name", fr: "Nom de l'agence", ar: "اسم الوكالة" },
          type: "text",
          required: true,
          order: 1,
          isCore: true,
          placeholder: { en: "e.g. Atlas Escapes Voyages SARL", fr: "ex. Atlas Escapes Voyages SARL", ar: "مثال: وكالة أطلس للسياحة والأسفار" },
        },
        {
          id: "businessType",
          label: { en: "Agency Type", fr: "Type d'agence", ar: "نوع النشاط" },
          type: "select",
          required: true,
          order: 2,
          isCore: true,
          options: [
            { value: "Licensed Tourism Agency", label: { en: "Licensed Tourism Agency (Catégorie A)", fr: "Agence de Voyage Agréée (Catégorie A)", ar: "وكالة سياحة وأسفار معتمدة (فئة أ)" } },
            { value: "Inbound Tour Operator", label: { en: "Inbound Tour Operator", fr: "Tour Opérateur Réceptif", ar: "وكيل سياحي منظم للرحلات" } },
            { value: "Property Management Agency", label: { en: "Property Management Agency", fr: "Gestionnaire Immobilier Saisonnier", ar: "وكالة تسيير عقاري سياحي" } },
          ],
        },
      ],
    },
    {
      id: "agency_details",
      stepNumber: 2,
      isCore: true,
      isActive: true,
      title: {
        en: "Registration & Legal Verification",
        fr: "Immatriculation & Vérification Légale",
        ar: "السجل التجاري والبيانات الرسمية",
      },
      description: {
        en: "Official CNRC commercial register and administrative headquarters.",
        fr: "Numéro de registre du commerce CNRC et coordonnées du siège.",
        ar: "رقم السجل التجاري الرسمي وعنوان المقر الرئيسي.",
      },
      fields: [
        {
          id: "regNumber",
          label: { en: "Trade Registry (CNRC)", fr: "N° Registre Commerce (CNRC)", ar: "رقم السجل التجاري (CNRC)" },
          type: "text",
          required: true,
          order: 1,
          isCore: true,
          placeholder: { en: "e.g. DZ-ALG-2024-B-08921", fr: "ex. DZ-ALG-2024-B-08921", ar: "مثال: DZ-ALG-2024-B-08921" },
        },
        {
          id: "businessEmail",
          label: { en: "Professional Email", fr: "Email professionnel", ar: "البريد الإلكتروني المهني" },
          type: "text",
          required: true,
          order: 2,
          isCore: true,
          placeholder: { en: "contact@atlasescapes.dz", fr: "contact@atlasescapes.dz", ar: "contact@atlasescapes.dz" },
        },
        {
          id: "businessPhone",
          label: { en: "Headquarters Phone", fr: "Téléphone du siège", ar: "هاتف المقر" },
          type: "text",
          required: true,
          order: 3,
          isCore: true,
          placeholder: { en: "+213 21 69 45 12", fr: "+213 21 69 45 12", ar: "+213 21 69 45 12" },
        },
        {
          id: "headquarters",
          label: { en: "Address & City", fr: "Adresse et Ville", ar: "العنوان والمدينة" },
          type: "text",
          required: true,
          order: 4,
          placeholder: { en: "14 Rue Didouche Mourad, Algiers", fr: "14 Rue Didouche Mourad, Alger", ar: "14 شارع ديدوش مراد، الجزائر" },
        },
      ],
    },
    {
      id: "agency_team",
      stepNumber: 3,
      isCore: false,
      isActive: true,
      title: {
        en: "Team Size & Workspace Access",
        fr: "Taille d'Équipe & Accès Collaborateurs",
        ar: "حجم الفريق وصلاحيات الأعضاء",
      },
      description: {
        en: "Configure team collaboration and manage listing management roles.",
        fr: "Paramétrez les accès de vos collaborateurs pour gérer l'espace.",
        ar: "حدد حجم الفريق ودعوة الأعضاء لإدارة العقارات والرحلات.",
      },
      fields: [
        {
          id: "teamSize",
          label: { en: "Team Size", fr: "Taille de l'équipe", ar: "حجم الفريق" },
          type: "select",
          required: true,
          order: 1,
          options: [
            { value: "1", label: { en: "Solo Owner (1 person)", fr: "Propriétaire Unique (1 pers)", ar: "مؤسس منفرد (شخص واحد)" } },
            { value: "2-10", label: { en: "Small Agency (2-10 staff)", fr: "Petite Agence (2-10 pers)", ar: "وكالة صغيرة (2-10 موظفين)" } },
            { value: "11-50", label: { en: "Growing Enterprise (11-50 staff)", fr: "Moyenne Agence (11-50 pers)", ar: "مؤسسة نامية (11-50 موظفاً)" } },
            { value: "50+", label: { en: "Large Firm (50+ staff)", fr: "Grande Entreprise (50+ pers)", ar: "شركة كبرى (أكثر من 50)" } },
          ],
        },
      ],
    },
    {
      id: "agency_approval",
      stepNumber: 4,
      isCore: true,
      isActive: true,
      title: {
        en: "Default Booking Approval Mode",
        fr: "Mode d'Approbation par Défaut",
        ar: "طريقة تأكيد الحجوزات الافتراضية",
      },
      description: {
        en: "Set how your agency will process booking requests across all inventory and circuits.",
        fr: "Définissez le mode d'acceptation des réservations pour votre agence.",
        ar: "حدد طريقة قبول الحجوزات لجميع عروض ورحلات الوكالة.",
      },
      fields: [
        {
          id: "agencyBookingMode",
          label: { en: "Approval Setting", fr: "Mode d'approbation", ar: "طريقة الموافقة" },
          type: "select",
          required: true,
          order: 1,
          isCore: true,
          options: [
            { value: "instant", label: { en: "Instant Book (Automated Confirmation)", fr: "Réservation Instantanée (Automatique)", ar: "حجز فوري (تأكيد تلقائي)" } },
            { value: "request", label: { en: "Request to Book (Agency Staff Review)", fr: "Demande de Réservation (Validation manuelle)", ar: "طلب حجز (مراجعة فريق الوكالة)" } },
          ],
        },
      ],
    },
    {
      id: "agency_review",
      stepNumber: 5,
      isCore: true,
      isActive: true,
      title: {
        en: "Review & Activate Agency Workspace",
        fr: "Révision & Activation de l'Espace",
        ar: "المراجعة وتفعيل مساحة الوكالة",
      },
      description: {
        en: "Complete registration to unlock Agency Listings, Circuits, and Team tools.",
        fr: "Finalisez pour accéder à la gestion des annonces, circuits et collaborateurs.",
        ar: "أكمل التسجيل للوصول إلى إدارة العقارات والرحلات وفريق العمل.",
      },
      fields: [],
    },
  ],

  hotel: [
    {
      id: "hotel_basics",
      stepNumber: 1,
      isCore: true,
      isActive: true,
      title: {
        en: "Hotel Property Identity",
        fr: "Identité de l'Établissement Hôtelier",
        ar: "بيانات الفندق والمنشأة",
      },
      description: {
        en: "Enter official hotel name, classification and overall property scale.",
        fr: "Indiquez le nom officiel, le classement étoilé et la capacité globale.",
        ar: "أدخل الاسم الرسمي وتصنيف النجوم وسعة الغرف الكلية.",
      },
      fields: [
        {
          id: "hotelName",
          label: { en: "Hotel Name", fr: "Nom de l'hôtel", ar: "اسم الفندق" },
          type: "text",
          required: true,
          order: 1,
          isCore: true,
          placeholder: { en: "e.g. El Djazair Grand Palace Hotel", fr: "ex. El Djazair Grand Palace Hotel", ar: "مثال: فندق الجزائر جراند بالاس" },
        },
        {
          id: "hotelStarRating",
          label: { en: "Star Rating", fr: "Classement étoilé", ar: "تصنيف النجوم" },
          type: "select",
          required: true,
          order: 2,
          isCore: true,
          options: [
            { value: "5", label: { en: "5 Stars (Luxury Palace)", fr: "5 Étoiles (Luxe Palace)", ar: "5 نجوم (فاخر)" } },
            { value: "4", label: { en: "4 Stars (Premium)", fr: "4 Étoiles (Haut de gamme)", ar: "4 نجوم (ممتاز)" } },
            { value: "3", label: { en: "3 Stars (Comfort)", fr: "3 Étoiles (Confort)", ar: "3 نجوم (مريح)" } },
            { value: "2", label: { en: "2 Stars (Standard)", fr: "2 Étoiles (Standard)", ar: "نجمتان (اقتصادي)" } },
          ],
        },
        {
          id: "hotelTotalRooms",
          label: { en: "Total Room Inventory", fr: "Nombre total de chambres", ar: "إجمالي عدد الغرف" },
          type: "number",
          required: true,
          order: 3,
          defaultValue: 48,
        },
      ],
    },
    {
      id: "hotel_details",
      stepNumber: 2,
      isCore: true,
      isActive: true,
      title: {
        en: "Location, Contact & Licensing",
        fr: "Emplacement, Contact & Fiscalité",
        ar: "الموقع ومعلومات الاتصال والرخصة",
      },
      description: {
        en: "Physical address, reception contacts and official tax identification number.",
        fr: "Adresse physique, contact réception et identifiant fiscal (NIF).",
        ar: "العنوان الفعلي ومعلومات مكتب الاستقبال والرمز الجبائي.",
      },
      fields: [
        {
          id: "hotelCity",
          label: { en: "Wilaya / City", fr: "Ville / Wilaya", ar: "المدينة / الولاية" },
          type: "text",
          required: true,
          order: 1,
          isCore: true,
          placeholder: { en: "Algiers", fr: "Alger", ar: "الجزائر" },
        },
        {
          id: "hotelAddress",
          label: { en: "Exact Street Address", fr: "Adresse complète", ar: "العنوان بالكامل" },
          type: "text",
          required: true,
          order: 2,
          isCore: true,
          placeholder: { en: "24 Avenue Souidani Boujemaa", fr: "24 Avenue Souidani Boujemaa", ar: "24 شارع سويداني بوجمعة" },
        },
        {
          id: "hotelRegNumber",
          label: { en: "Trade Register Number", fr: "N° Registre de Commerce", ar: "رقم السجل التجاري" },
          type: "text",
          required: true,
          order: 3,
          isCore: true,
          placeholder: { en: "DZ-ALG-2023-B-04192", fr: "DZ-ALG-2023-B-04192", ar: "DZ-ALG-2023-B-04192" },
        },
        {
          id: "hotelTaxId",
          label: { en: "Tax ID (NIF)", fr: "N° Identification Fiscale (NIF)", ar: "رقم التعريف الجبائي (NIF)" },
          type: "text",
          required: true,
          order: 4,
          placeholder: { en: "002316098765432", fr: "002316098765432", ar: "002316098765432" },
        },
      ],
    },
    {
      id: "hotel_policies",
      stepNumber: 3,
      isCore: false,
      isActive: true,
      title: {
        en: "Hotel Policies & Amenities",
        fr: "Règlement & Équipements Hôteliers",
        ar: "سياسات ومرافق الفندق",
      },
      description: {
        en: "Check-in/out windows and hotel-wide facilities.",
        fr: "Horaires de check-in/out et prestations générales de l'hôtel.",
        ar: "مواعيد تسجيل الوصول والمغادرة والمرافق العامة للفندق.",
      },
      fields: [
        {
          id: "checkInTime",
          label: { en: "Check-in Time", fr: "Heure d'arrivée", ar: "وقت تسجيل الوصول" },
          type: "text",
          required: true,
          order: 1,
          placeholder: { en: "15:00", fr: "15:00", ar: "15:00" },
        },
        {
          id: "checkOutTime",
          label: { en: "Check-out Time", fr: "Heure de départ", ar: "وقت تسجيل المغادرة" },
          type: "text",
          required: true,
          order: 2,
          placeholder: { en: "12:00", fr: "12:00", ar: "12:00" },
        },
        {
          id: "hotelAmenities",
          label: { en: "Property Amenities", fr: "Équipements de l'hôtel", ar: "مرافق المنشأة" },
          type: "multi-select",
          required: false,
          order: 3,
          options: [
            { value: "breakfast", label: { en: "Buffet Breakfast", fr: "Petit-déjeuner inclus", ar: "فطور بوفيه" } },
            { value: "pool", label: { en: "Swimming Pool", fr: "Piscine", ar: "مسبح" } },
            { value: "spa", label: { en: "Spa & Wellness", fr: "Spa & Bien-être", ar: "سبا وصحة" } },
            { value: "wifi", label: { en: "High-Speed WiFi", fr: "WiFi haut débit", ar: "واي فاي عالي السرعة" } },
            { value: "valet", label: { en: "Valet Parking", fr: "Service Voiturier", ar: "خدمة ركن السيارات" } },
            { value: "reception_24_7", label: { en: "24/7 Front Desk", fr: "Réception 24h/24", ar: "استقبال على مدار الساعة" } },
          ],
        },
      ],
    },
    {
      id: "hotel_team",
      stepNumber: 4,
      isCore: false,
      isActive: true,
      title: {
        en: "Management Team & Staff",
        fr: "Équipe de Direction & Réception",
        ar: "فريق الإدارة وموظفو الاستقبال",
      },
      description: {
        en: "Invite front desk managers and operations staff to the hotel extranet.",
        fr: "Invitez les gestionnaires de réception sur l'extranet hôtel.",
        ar: "دعوة مديري الاستقبال والمشرفين إلى نظام الفندق.",
      },
      fields: [],
    },
    {
      id: "hotel_approval",
      stepNumber: 5,
      isCore: true,
      isActive: true,
      title: {
        en: "Hotel Booking Approval Mode",
        fr: "Mode d'Approbation Hôtelier",
        ar: "طريقة تأكيد الحجوزات الفندقية",
      },
      description: {
        en: "Configure automated Instant Booking vs front desk reservation confirmation.",
        fr: "Choisissez entre réservation immédiate automatique et confirmation par la réception.",
        ar: "اختر بين الحجز الفوري التلقائي أو التأكيد المسبق من الاستقبال.",
      },
      fields: [
        {
          id: "hotelBookingMode",
          label: { en: "Booking Mode", fr: "Mode de réservation", ar: "نظام الحجز" },
          type: "select",
          required: true,
          order: 1,
          isCore: true,
          options: [
            { value: "instant", label: { en: "Instant Book (Recommended for Hotels)", fr: "Réservation Instantanée (Recommandé)", ar: "حجز فوري (موصى به للفنادق)" } },
            { value: "request", label: { en: "Request to Book (Requires Front Desk Approval)", fr: "Sur Demande (Validation réception)", ar: "طلب حجز (يتطلب موافقة الاستقبال)" } },
          ],
        },
      ],
    },
    {
      id: "hotel_rooms",
      stepNumber: 6,
      isCore: true,
      isActive: true,
      title: {
        en: "Initial Room Types & Inventory",
        fr: "Types de Chambres & Inventaire",
        ar: "أنواع الغرف والوحدات المتاحة",
      },
      description: {
        en: "Configure bookable room types (Deluxe Suite, Standard Double, Superior Twin).",
        fr: "Configurez vos types de chambres réservables et leurs tarifs.",
        ar: "إعداد أنواع الغرف القابلة للحجز وأسعارها وسعتها.",
      },
      fields: [],
    },
    {
      id: "hotel_review",
      stepNumber: 7,
      isCore: true,
      isActive: true,
      title: {
        en: "Review & Launch Hotel Extranet",
        fr: "Révision & Lancement Extranet Hôtel",
        ar: "مراجعة وإطلاق لوحة تحكم الفندق",
      },
      description: {
        en: "Activate your hotel profile in the DARNA hospitality network.",
        fr: "Activez votre profil hôtelier sur le réseau d'accueil DARNA.",
        ar: "تفعيل ملف فندقك على شبكة دارنا للضيافة.",
      },
      fields: [],
    },
  ],

  hostel: [
    {
      id: "hostel_basics",
      stepNumber: 1,
      isCore: true,
      isActive: true,
      title: {
        en: "Hostel Identity & Bed Inventory",
        fr: "Identité de l'Auberge & Capacité",
        ar: "هوية نزل الشباب وسعة الأسرة",
      },
      description: {
        en: "Enter official youth hostel name and dorm/private room distribution.",
        fr: "Nom officiel de l'auberge et répartition dortoirs / chambres privées.",
        ar: "الاسم الرسمي لنزل الشباب وتوزيع أسرة العنابر والغرف الخاصة.",
      },
      fields: [
        {
          id: "hostelName",
          label: { en: "Hostel Name", fr: "Nom de l'auberge", ar: "اسم النزل" },
          type: "text",
          required: true,
          order: 1,
          isCore: true,
          placeholder: { en: "e.g. Casbah Heritage Backpacker Hostel", fr: "ex. Casbah Heritage Backpacker Hostel", ar: "مثال: نزل القصبة العريق للشباب" },
        },
        {
          id: "hostelDormBeds",
          label: { en: "Dormitory Beds Count", fr: "Lits en dortoir", ar: "عدد أسرة العنابر المشتركة" },
          type: "number",
          required: true,
          order: 2,
          isCore: true,
          defaultValue: 24,
        },
        {
          id: "hostelPrivateRooms",
          label: { en: "Private Rooms Count", fr: "Chambres privées", ar: "عدد الغرف الخاصة" },
          type: "number",
          required: true,
          order: 3,
          defaultValue: 4,
        },
      ],
    },
    {
      id: "hostel_details",
      stepNumber: 2,
      isCore: true,
      isActive: true,
      title: {
        en: "Address, Contact & Licensing",
        fr: "Adresse, Contact & Immatriculation",
        ar: "العنوان والاتصال والسجل التجاري",
      },
      description: {
        en: "Provide city location, contact details and business registration number.",
        fr: "Indiquez la ville, les contacts et le numéro de registre de commerce.",
        ar: "حدد المدينة ومعلومات الاتصال ورقم السجل التجاري.",
      },
      fields: [
        {
          id: "hostelCity",
          label: { en: "City / Wilaya", fr: "Ville / Wilaya", ar: "المدينة / الولاية" },
          type: "text",
          required: true,
          order: 1,
          isCore: true,
          placeholder: { en: "Algiers", fr: "Alger", ar: "الجزائر" },
        },
        {
          id: "hostelAddress",
          label: { en: "Street Address", fr: "Adresse exacte", ar: "العنوان بالتفصيل" },
          type: "text",
          required: true,
          order: 2,
          isCore: true,
          placeholder: { en: "12 Rue Sidi Ramdane, Casbah, Algiers", fr: "12 Rue Sidi Ramdane, Casbah, Alger", ar: "12 شارع سيدي رمضان، القصبة، الجزائر" },
        },
        {
          id: "hostelRegNumber",
          label: { en: "Trade Registry (CNRC)", fr: "N° Registre Commerce", ar: "رقم السجل التجاري" },
          type: "text",
          required: true,
          order: 3,
          placeholder: { en: "DZ-ALG-2024-B-07114", fr: "DZ-ALG-2024-B-07114", ar: "DZ-ALG-2024-B-07114" },
        },
      ],
    },
    {
      id: "hostel_facilities",
      stepNumber: 3,
      isCore: false,
      isActive: true,
      title: {
        en: "Shared Facilities & House Rules",
        fr: "Installations Partagées & Règlement",
        ar: "المرافق المشتركة وقواعد النزل",
      },
      description: {
        en: "Backpacker facilities, communal spaces, curfew and age policies.",
        fr: "Espaces partagés pour routards, couvre-feu et politique d'âge.",
        ar: "المساحات المشتركة وسياسات الدخول والمبيت للرحالة.",
      },
      fields: [
        {
          id: "curfewPolicy",
          label: { en: "Curfew & Keycard Policy", fr: "Couvre-feu & Accès", ar: "سياسة حظر التجول والدخول" },
          type: "text",
          required: true,
          order: 1,
          placeholder: { en: "No curfew · 24h keycard access", fr: "Pas de couvre-feu · Accès 24h/24", ar: "لا حظر تجول · بطاقة دخول 24 ساعة" },
        },
        {
          id: "agePolicy",
          label: { en: "Age Policy", fr: "Politique d'âge", ar: "سياسة الفئات العمرية" },
          type: "text",
          required: true,
          order: 2,
          placeholder: { en: "All ages welcome (min 18 in dorms)", fr: "Tous âges bienvenus (min 18 ans en dortoir)", ar: "مرحباً بالجميع (18+ في العنابر المشتركة)" },
        },
        {
          id: "hostelFacilities",
          label: { en: "Shared Facilities", fr: "Installations partagées", ar: "المرافق والخدمات المشتركة" },
          type: "multi-select",
          required: false,
          order: 3,
          options: [
            { value: "lockers", label: { en: "Secure Backpack Lockers", fr: "Casiers sécurisés", ar: "خزانات أمتعة مؤمنة" } },
            { value: "shared_kitchen", label: { en: "Communal Kitchen", fr: "Cuisine partagée", ar: "مطبخ مشترك للنزلاء" } },
            { value: "rooftop", label: { en: "Scenic Rooftop Terrace", fr: "Terrasse panoramique", ar: "شرفة علوية مطلة" } },
            { value: "coworking", label: { en: "Coworking Space", fr: "Espace Coworking", ar: "مساحة عمل مشتركة" } },
            { value: "wifi", label: { en: "High-Speed WiFi", fr: "WiFi rapide", ar: "واي فاي سريع" } },
            { value: "luggage_storage", label: { en: "Free Luggage Storage", fr: "Consigne bagages gratuite", ar: "حفظ الأمتعة مجاناً" } },
          ],
        },
      ],
    },
    {
      id: "hostel_team",
      stepNumber: 4,
      isCore: false,
      isActive: true,
      title: {
        en: "Staff & Reception Contacts",
        fr: "Personnel & Accueil",
        ar: "موظفو الاستقبال والدعم",
      },
      description: {
        en: "Invite hostel reception and volunteer managers.",
        fr: "Invitez l'équipe d'accueil de l'auberge.",
        ar: "دعوة مسؤولي الاستقبال والمشرفين على النزل.",
      },
      fields: [],
    },
    {
      id: "hostel_approval",
      stepNumber: 5,
      isCore: true,
      isActive: true,
      title: {
        en: "Hostel Booking Approval Mode",
        fr: "Mode d'Approbation des Lits & Chambres",
        ar: "طريقة تأكيد حجوزات الأسرة والغرف",
      },
      description: {
        en: "Instant Book per-bed vs manual reception confirmation.",
        fr: "Réservation instantanée par lit vs confirmation manuelle.",
        ar: "حجز فوري لكل سرير مقابل مراجعة الاستقبال.",
      },
      fields: [
        {
          id: "hostelBookingMode",
          label: { en: "Approval Setting", fr: "Mode d'approbation", ar: "نظام الموافقة" },
          type: "select",
          required: true,
          order: 1,
          isCore: true,
          options: [
            { value: "instant", label: { en: "Instant Book (Automatic per-bed reservation)", fr: "Réservation Instantanée par lit", ar: "حجز فوري (تلقائي لكل سرير)" } },
            { value: "request", label: { en: "Request to Book (Reception Review)", fr: "Sur Demande (Validation réception)", ar: "طلب حجز (مراجعة الاستقبال)" } },
          ],
        },
      ],
    },
    {
      id: "hostel_beds",
      stepNumber: 6,
      isCore: true,
      isActive: true,
      title: {
        en: "Dorm Beds & Private Rooms Setup",
        fr: "Configuration Dortoirs & Chambres Privées",
        ar: "إعداد أسرة العنابر والغرف الخاصة",
      },
      description: {
        en: "Configure per-bed pricing in mixed/female dorms and private rooms.",
        fr: "Définissez les tarifs par lit en dortoir et chambres privées.",
        ar: "تحديد أسعار السرير الواحد في العنابر والغرف الخاصة.",
      },
      fields: [],
    },
    {
      id: "hostel_review",
      stepNumber: 7,
      isCore: true,
      isActive: true,
      title: {
        en: "Review & Launch Hostel Extranet",
        fr: "Révision & Lancement Auberge",
        ar: "مراجعة وإطلاق لوحة تحكم النزل",
      },
      description: {
        en: "Complete registration to unlock Hostel Bed Management.",
        fr: "Finalisez pour accéder à la gestion des lits et réservations.",
        ar: "أكمل التسجيل للوصول إلى إدارة الأسرة والحجوزات.",
      },
      fields: [],
    },
  ],
};

const STORAGE_PREFIX = "darna_onboarding_config_";

export function getOnboardingSteps(hostType: HostType): OnboardingStepConfig[] {
  if (typeof window !== "undefined") {
    try {
      const saved = localStorage.getItem(`${STORAGE_PREFIX}${hostType}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.error(`Error loading onboarding steps for ${hostType}:`, e);
    }
  }
  return defaultOnboardingConfigs[hostType] || defaultOnboardingConfigs.individual;
}

export function saveOnboardingSteps(hostType: HostType, steps: OnboardingStepConfig[]): void {
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(`${STORAGE_PREFIX}${hostType}`, JSON.stringify(steps));
    } catch (e) {
      console.error(`Error saving onboarding steps for ${hostType}:`, e);
    }
  }
}

export function resetOnboardingSteps(hostType: HostType): OnboardingStepConfig[] {
  const defaults = defaultOnboardingConfigs[hostType] || defaultOnboardingConfigs.individual;
  if (typeof window !== "undefined") {
    try {
      localStorage.removeItem(`${STORAGE_PREFIX}${hostType}`);
    } catch (e) {
      console.error(`Error resetting onboarding steps for ${hostType}:`, e);
    }
  }
  return defaults;
}

export function getAllOnboardingConfigs(): Record<HostType, OnboardingStepConfig[]> {
  const result: Record<HostType, OnboardingStepConfig[]> = {
    individual: getOnboardingSteps("individual"),
    agency: getOnboardingSteps("agency"),
    hotel: getOnboardingSteps("hotel"),
    hostel: getOnboardingSteps("hostel"),
  };
  return result;
}
