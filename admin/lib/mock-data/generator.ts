import "server-only";

import {
  Host,
  Listing,
  GuestUser,
  Booking,
  BookingStatus,
  ReviewItem,
  HostWallet,
  WalletTransaction,
  AuditEntry,
  PayoutRequest,
  ModerationCase,
  CategoryItem,
  PromotionCoupon,
  PlatformSettings,
  OnboardingConfig,
  HostType,
  ListingVertical,
} from "@/lib/types";
import { WILAYAS } from "@/lib/utils/wilayas";
import { DEFAULT_COMMISSION_RATES, computeBookingAmounts } from "@/lib/pricing";

// Simple LCG pseudo-random number generator for deterministic seed
function createRng(seed: number) {
  let s = seed;
  return function () {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

const rng = createRng(20261020);

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}

const FIRST_NAMES = [
  "Amina", "Karim", "Yacine", "Meriem", "Sofiane", "Fatima", "Mehdi", "Nour", "Rachid", "Amel",
  "Tarek", "Houda", "Walid", "Samia", "Billel", "Leila", "Farid", "Zineb", "Khaled", "Ines",
  "Hamza", "Nassima", "Anis", "Chahinez", "Adel", "Soraya", "Hichem", "Khadidja", "Nabil", "Ryma"
];

const LAST_NAMES = [
  "Benali", "Mansouri", "Cherif", "Bouzid", "Hadj", "Touati", "Benaissa", "Saadi", "Khelifi", "Mebarki",
  "Zerrouki", "Brahimi", "Ould", "Belkacem", "Larbi", "Djebbar", "Boudiaf", "Amrani", "Hammadi", "Rahmouni",
  "Guerfi", "Boumaza", "Belhadj", "Zitouni", "Madani", "Ferhat", "Benamara", "Ghezali", "Chaib", "Messaoudi"
];

const AGENCY_NAMES = [
  "Atlas Escapes Tourism SARL", "Hoggar Expeditions & Travel", "Numidia Sahara Voyages",
  "Casbah Heritage Tours", "Tassili Nomads Adventure", "Bahia Voyage Oran", "Rhumel Gorges Travel",
  "Djanet Oasis Bivouacs", "El Aurassi Prestige Tours", "Ghardaïa M'zab Explorers", "Cap Caxine Maritime",
  "Tipaza Roman Coast Agency", "Djurdjura Alpine Treks", "Taghit Golden Dunes Travels"
];

const HOTEL_NAMES = [
  "Hôtel Les Zianides", "Palais El Manzah", "Grand Hôtel Cirta", "Sheraton Club des Pins Resort",
  "Hôtel Royal d'Oran", "L'Hôtel des Dunes Timimoun", "Hôtel Seybouse International",
  "Hôtel Le Caïd Bou Saâda", "Auberge Oasis Taghit", "Le Méridien Bahia", "Hôtel Belvédère Tipaza",
  "Hôtel Dar Diaf Bouchaoui", "Complexe Touristique Matares", "Hôtel Tassili Djanet"
];

const HOSTEL_NAMES = [
  "Auberge de Jeunesse Casbah Algiers", "Casbah Nomads Backpacker Hostel", "Oran Waterfront Youth Hostel",
  "Ghardaïa Desert Stargazers Lodge", "Constantine Bridges Backpackers", "Djanet Caravan Oasis Hostel",
  "Tipaza Coastal Backpackers Inn", "Timimoun Ksar Youth Hostel", "Bejaia Corniche Backpacker Haven"
];

export function generateSeedData() {
  // 1. Generate ≥ 320 Users (Guests)
  const users: GuestUser[] = [];
  for (let i = 1; i <= 320; i++) {
    const fn = randomItem(FIRST_NAMES);
    const ln = randomItem(LAST_NAMES);
    const wilaya = randomItem(WILAYAS);
    const statusRoll = rng();
    const status = statusRoll < 0.85 ? "active" : statusRoll < 0.94 ? "suspended" : statusRoll < 0.98 ? "banned" : "deleted";
    const bookingsCount = randomInt(0, 18);
    const totalSpentDzd = bookingsCount * randomInt(12000, 65000);

    users.push({
      id: `usr_${i.toString().padStart(3, "0")}`,
      name: `${fn} ${ln}`,
      email: `${fn.toLowerCase()}.${ln.toLowerCase()}${i}@example.dz`,
      phone: `+213 ${randomItem(["5", "6", "7"])}${randomInt(10, 99)} ${randomInt(10, 99)} ${randomInt(10, 99)}`,
      avatar: `/assets/avatar.png`,
      status,
      role: i <= 80 ? "both" : "guest",
      emailVerified: rng() > 0.1,
      idVerified: rng() > 0.3,
      wilayaCode: wilaya.code,
      preferredLanguage: randomItem(["fr", "ar", "en"]),
      bookingsCount,
      totalSpentDzd,
      walletBalanceDzd: randomInt(0, 45000),
      reviewsWrittenCount: randomInt(0, 8),
      favoritesCount: randomInt(1, 24),
      joinedAt: new Date(Date.now() - randomInt(10, 750) * 86400000).toISOString(),
      lastActiveAt: new Date(Date.now() - randomInt(0, 30) * 86400000).toISOString(),
      isFlagged: rng() < 0.05,
      adminNotes: i % 15 === 0 ? ["Identity verified via biometric Algerian passport."] : [],
    });
  }

  // 2. Generate ≥ 125 Hosts (Balanced 4 Types)
  const hostTypes: HostType[] = ["individual", "agency", "hotel", "hostel"];
  const hosts: Host[] = [];

  for (let i = 1; i <= 128; i++) {
    const hostType = hostTypes[(i - 1) % 4];
    const fn = randomItem(FIRST_NAMES);
    const ln = randomItem(LAST_NAMES);
    const wilaya = randomItem(WILAYAS);
    const statusRoll = rng();
    const status =
      statusRoll < 0.65 ? "approved" :
      statusRoll < 0.78 ? "under_review" :
      statusRoll < 0.88 ? "applied" :
      statusRoll < 0.94 ? "suspended" :
      statusRoll < 0.98 ? "rejected" : "banned";

    const verifRoll = rng();
    const verificationStatus =
      verifRoll < 0.7 ? "verified" : verifRoll < 0.85 ? "pending" : verifRoll < 0.95 ? "missing" : "expired";

    let ownerName = `${fn} ${ln}`;
    let businessName: string | undefined = undefined;

    if (hostType === "agency") {
      businessName = AGENCY_NAMES[(i - 1) % AGENCY_NAMES.length] + ` (#${i})`;
    } else if (hostType === "hotel") {
      businessName = HOTEL_NAMES[(i - 1) % HOTEL_NAMES.length] + ` (#${i})`;
    } else if (hostType === "hostel") {
      businessName = HOSTEL_NAMES[(i - 1) % HOSTEL_NAMES.length] + ` (#${i})`;
    }

    const defaultCommissions: Record<HostType, number> = DEFAULT_COMMISSION_RATES;

    const isOverridden = rng() < 0.15;
    const commissionRate = isOverridden
      ? defaultCommissions[hostType] + (rng() > 0.5 ? 2.5 : -2.0)
      : defaultCommissions[hostType];

    const verticals: ListingVertical[] =
      hostType === "agency" ? ["trip", "experience", "vehicle"] :
      hostType === "hotel" ? ["hotel", "home"] :
      hostType === "hostel" ? ["hotel"] :
      ["home", "experience"];

    const documents = [
      {
        id: `doc_${i}_id`,
        type: "id_card" as const,
        title: "National Identity Card (Biometric)",
        fileUrl: "/assets/template.jpeg",
        status: "approved" as const,
        uploadedAt: "2026-03-12T10:00:00Z",
      },
      ...(hostType !== "individual"
        ? [
            {
              id: `doc_${i}_rc`,
              type: "commercial_register" as const,
              title: "CNRC Trade Register Certificate",
              fileUrl: "/assets/template.jpeg",
              status: verificationStatus === "verified" ? ("approved" as const) : ("pending" as const),
              uploadedAt: "2026-03-14T11:30:00Z",
            },
            {
              id: `doc_${i}_tax`,
              type: "tax_card" as const,
              title: "NIF Fiscal Tax Card (Direction des Impôts)",
              fileUrl: "/assets/template.jpeg",
              status: verificationStatus === "verified" ? ("approved" as const) : ("pending" as const),
              uploadedAt: "2026-03-14T11:35:00Z",
            },
            {
              id: `doc_${i}_license`,
              type: "tourism_licence" as const,
              title: "Ministry of Tourism Operating License",
              fileUrl: "/assets/template.jpeg",
              status: verificationStatus === "verified" ? ("approved" as const) : ("pending" as const),
              uploadedAt: "2026-03-15T09:20:00Z",
            },
          ]
        : []),
    ];

    hosts.push({
      id: `hst_${i.toString().padStart(3, "0")}`,
      ownerName,
      businessName,
      email: `${fn.toLowerCase()}.${ln.toLowerCase()}${i}@${hostType === "individual" ? "gmail.com" : "bladus-partner.dz"}`,
      phone: `+213 ${randomItem(["5", "6", "7"])}${randomInt(10, 99)} ${randomInt(10, 99)} ${randomInt(10, 99)}`,
      hostType,
      status,
      verificationStatus,
      wilayaCode: wilaya.code,
      city: wilaya.nameEn,
      address: `Boulevard ${fn} ${ln}, ${wilaya.nameEn}`,
      rating: parseFloat((4.2 + rng() * 0.8).toFixed(2)),
      reviewsCount: randomInt(4, 95),
      listingsCount: hostType === "individual" ? randomInt(1, 4) : randomInt(3, 16),
      bookingsCount: randomInt(8, 140),
      // Placeholder: overwritten below with the balance derived from the ledger.
      walletBalance: randomInt(-15000, 380000),
      commissionRate,
      isCommissionOverridden: isOverridden,
      joinedAt: new Date(Date.now() - randomInt(20, 600) * 86400000).toISOString(),
      lastActiveAt: new Date(Date.now() - randomInt(0, 15) * 86400000).toISOString(),
      bookingApprovalMode: rng() > 0.4 ? "instant" : "request",
      verticalsOffered: verticals,
      documents,
      adminNotes: i % 8 === 0 ? ["Host documents inspected in person during wilaya tourism roadshow."] : [],
      agencyMetadata:
        hostType === "agency"
          ? { teamSize: randomInt(4, 25), hasTrips: true, licenseNumber: `DZ-TOUR-2023-B-${8000 + i}` }
          : undefined,
      hotelMetadata:
        hostType === "hotel"
          ? {
              starRating: randomInt(3, 5),
              roomCount: randomInt(18, 120),
              amenities: ["Swimming Pool", "Restaurant Buffet", "Meeting Rooms", "Valet Parking", "Fitness Center"],
            }
          : undefined,
      hostelMetadata:
        hostType === "hostel"
          ? { bedCount: randomInt(24, 80), dormTypes: ["4-Bed Mixed Dorm", "6-Bed Female Dorm", "8-Bed Explorer Dorm"] }
          : undefined,
    });
  }

  // 3. Generate ≥ 420 Listings
  const listings: Listing[] = [];
  // Names and types per vertical, so a car is never called "Seaside Villa".
  const NAMES: Record<string, string[]> = {
    home: [
      "Mediterranean Seaside Villa", "Dar El Bahdja Heritage House", "Modern Heights Apartment",
      "Traditional M'zab House", "Roman Ruins Heritage Stay", "Corniche Luxury Penthouse",
      "Cedar Forest Mountain Chalet", "Gorge View Heritage Suite", "Casbah Rooftop Riad", "Olive Grove Family Home",
    ],
    hotel: [
      "Heritage Boutique Hotel", "Seafront Hotel & Spa", "Casbah Riad Hotel", "Saharan Oasis Ecolodge",
      "Youth Hostel & Rooftop", "City Centre Business Hotel", "Palm Grove Desert Lodge", "Backpackers Medina Hostel",
    ],
    experience: [
      "Tassili Rock Art Trek", "Casbah Street Food Walk", "Sunset Dune Camel Ride", "M'zab Valley Guided Tour",
      "Hammam & Henna Workshop", "Djurdjura Hiking Day", "Couscous Cooking Class", "Tipaza Roman Ruins Tour",
    ],
    trip: [
      "Grand Sahara Circuit", "Hoggar & Assekrem Expedition", "Kabylie Villages Tour", "Coast to Casbah Week",
      "Taghit Oasis Escape", "Roman Algeria Heritage Route",
    ],
    vehicle: [
      "Toyota Land Cruiser Prado", "Nissan Patrol 4x4", "Dacia Duster 4WD", "Renault Clio 5",
      "Hyundai Tucson", "Volkswagen Golf 8", "Toyota Hilux Double Cab", "Peugeot 208",
    ],
  };
  const TYPES: Record<string, string[]> = {
    home: ["villa", "appartement", "maison traditionnelle", "chalet", "studio", "bungalow"],
    hotel: ["hôtel", "hostel"],
    experience: ["Desert adventure", "Culture & heritage", "Food & cooking", "Hiking & nature", "Workshop"],
    trip: ["Desert circuit", "Heritage route", "Mountains & villages", "Coastal escape"],
    vehicle: ["SUV / 4x4", "City car", "Crossover", "Pickup"],
  };

  for (let i = 1; i <= 430; i++) {
    const host = randomItem(hosts);
    const wilaya = WILAYAS.find((w) => w.code === host.wilayaCode) || randomItem(WILAYAS);
    const category: ListingVertical =
      host.hostType === "agency" ? randomItem(["trip", "experience", "vehicle"]) :
      host.hostType === "hotel" ? "hotel" :
      host.hostType === "hostel" ? "hotel" :
      randomItem(["home", "experience"]);

    const statusRoll = rng();
    const status =
      statusRoll < 0.65 ? "approved" :
      statusRoll < 0.78 ? "pending_review" :
      statusRoll < 0.86 ? "changes_requested" :
      statusRoll < 0.92 ? "rejected" :
      statusRoll < 0.96 ? "suspended" :
      statusRoll < 0.98 ? "draft" : "archived";

    const basePrice =
      category === "hotel" ? (host.hostType === "hostel" ? randomInt(2500, 6000) : randomInt(14000, 48000)) :
      category === "home" ? randomInt(7500, 45000) :
      category === "vehicle" ? randomInt(12000, 35000) :
      category === "trip" ? randomInt(35000, 160000) :
      randomInt(4500, 18000);

    const rooms = (host.hostType === "hotel" || host.hostType === "hostel") ? [
      {
        id: `rm_${i}_1`,
        propertyListingId: `lst_${i.toString().padStart(3, "0")}`,
        name: host.hostType === "hostel" ? "Standard Shared Dorm Bed" : "Deluxe King Room",
        description: host.hostType === "hostel" ? "Includes personal reading lamp and secure locker." : "Spacious room with king bed and city/sea view.",
        price: basePrice,
        bookingUnit: host.hostType === "hostel" ? ("bed" as const) : ("room" as const),
        totalInventory: randomInt(4, 20),
        availableInventory: randomInt(1, 15),
        capacity: host.hostType === "hostel" ? 1 : 2,
        amenities: ["Air Conditioning", "WiFi", "Ensuite Bathroom", "Safety Deposit Box"],
        imageSrc: ["/assets/house.png"],
      },
      {
        id: `rm_${i}_2`,
        propertyListingId: `lst_${i.toString().padStart(3, "0")}`,
        name: host.hostType === "hostel" ? "Private Twin Room" : "Executive Suite",
        description: "Premium comfort with upgraded amenities.",
        price: Math.round(basePrice * 1.6),
        bookingUnit: "room" as const,
        totalInventory: randomInt(2, 8),
        availableInventory: randomInt(1, 6),
        capacity: host.hostType === "hostel" ? 2 : 4,
        amenities: ["Air Conditioning", "WiFi", "Balcony", "Minibar", "Private Lounge"],
        imageSrc: ["/assets/house.png"],
      }
    ] : undefined;

    listings.push({
      id: `lst_${i.toString().padStart(3, "0")}`,
      title: `${randomItem(NAMES[category] ?? NAMES.home)} - ${wilaya.nameEn} #${i}`,
      description: `Authentic Algerian accommodation in the heart of ${wilaya.nameEn}. Fully equipped with local craftsmanship, modern amenities, and warm Mediterranean hospitality.`,
      category,
      propertyType: randomItem(TYPES[category] ?? TYPES.home),
      hostId: host.id,
      hostName: host.businessName || host.ownerName,
      hostType: host.hostType,
      status,
      price: basePrice,
      originalPrice: rng() > 0.7 ? Math.round(basePrice * 1.2) : undefined,
      imageSrc: [category === "vehicle" ? "/assets/car.png" : "/assets/house.png"],
      createdAt: new Date(Date.now() - randomInt(10, 400) * 86400000).toISOString(),
      updatedAt: new Date(Date.now() - randomInt(0, 30) * 86400000).toISOString(),
      wilayaCode: wilaya.code,
      city: wilaya.nameEn,
      address: `Rue de l'Indépendance, ${wilaya.nameEn}`,
      coordinates: {
        lat: 28.0339 + (rng() - 0.5) * 8.0,
        lng: 1.6596 + (rng() - 0.5) * 8.0,
      },
      guestCapacity: randomInt(1, 10),
      bedroomCount: category === "home" ? randomInt(1, 5) : undefined,
      bathroomCount: randomInt(1, 3),
      rating: parseFloat((4.3 + rng() * 0.7).toFixed(2)),
      reviewsCount: randomInt(3, 85),
      bookingsCount: randomInt(5, 110),
      amenities: ["Fast WiFi", "Air Conditioning", "Free Parking", "Traditional Breakfast", "Kitchen", "Security Cameras"],
      bookingApprovalMode: host.bookingApprovalMode,
      isFeatured: rng() < 0.12,
      isReported: rng() < 0.04,
      adminNotes: i % 12 === 0 ? ["Listing photos verified via physical site visit."] : [],
      moderationChecklist: {
        photosOk: true,
        locationAccurate: true,
        priceReasonable: true,
        policiesPresent: true,
        descriptionAppropriate: true,
      },
      rooms,
    });
  }

  // 4. Generate ≥ 820 Bookings
  const bookings: Booking[] = [];
  const bookingStatuses: BookingStatus[] = ["confirmed", "completed", "pending", "cancelled", "disputed", "refunded"];

  for (let i = 1; i <= 840; i++) {
    const listing = randomItem(listings);
    const host = hosts.find((h) => h.id === listing.hostId) || randomItem(hosts);
    const guest = randomItem(users);
    const statusRoll = rng();
    const status =
      statusRoll < 0.50 ? "completed" :
      statusRoll < 0.75 ? "confirmed" :
      statusRoll < 0.85 ? "pending" :
      statusRoll < 0.92 ? "cancelled" :
      statusRoll < 0.97 ? "disputed" : "refunded";

    const nights = randomInt(1, 7);
    const basePrice = Math.round(listing.price * nights);
    const commRate = host.commissionRate;
    const amounts = computeBookingAmounts(basePrice, commRate);
    const serviceFee = amounts.serviceFeeDzd;
    const totalAmount = amounts.totalAmountDzd;
    const commAmount = amounts.commissionAmountDzd;
    const hostPayout = amounts.hostPayoutDzd;

    const checkInOffset = randomInt(-120, 60);
    const checkIn = new Date(Date.now() + checkInOffset * 86400000);
    const checkOut = new Date(checkIn.getTime() + nights * 86400000);

    bookings.push({
      id: `bkg_${i.toString().padStart(4, "0")}`,
      reference: `BLD-2026-${(8000 + i).toString()}`,
      listingId: listing.id,
      listingTitle: listing.title,
      listingImage: listing.imageSrc[0] || "/assets/house.png",
      vertical: listing.category,
      hostId: host.id,
      hostName: host.businessName || host.ownerName,
      hostType: host.hostType,
      guestId: guest.id,
      guestName: guest.name,
      guestEmail: guest.email,
      guestPhone: guest.phone || "+213 555 12 34 56",
      wilayaCode: listing.wilayaCode,
      status,
      approvalMode: listing.bookingApprovalMode,
      checkInDate: checkIn.toISOString().split("T")[0],
      checkOutDate: checkOut.toISOString().split("T")[0],
      nightsCount: nights,
      guestsCount: randomInt(1, 4),
      basePriceDzd: basePrice,
      serviceFeeDzd: serviceFee,
      totalAmountDzd: totalAmount,
      commissionRate: commRate,
      commissionAmountDzd: commAmount,
      hostPayoutDzd: hostPayout,
      paymentStatus: status === "refunded" ? "refunded" : status === "pending" ? "pending" : "paid",
      refundedAmountDzd: status === "refunded" ? totalAmount : 0,
      paymentMethod: randomItem(["cib_edahabia", "baridimob", "ccp_transfer"]),
      createdAt: new Date(checkIn.getTime() - randomInt(5, 30) * 86400000).toISOString(),
      disputeReason: status === "disputed" ? "Discrepancy regarding arrival check-in access." : undefined,
      adminNotes: status === "disputed" ? ["Customer support representative contacted host."] : [],
    });
  }

  // 5. Generate ≥ 320 Reviews
  const reviews: ReviewItem[] = [];
  const reviewComments = [
    "Un séjour mémorable à Tipaza, vue sur mer et accueil chaleureux.",
    "Very peaceful and authentically decorated. Host was extremely helpful.",
    "إقامة رائعة ومريحة جدا، كل التسهيلات متوفرة والمعاملة في القمة.",
    "Expérience saharienne inoubliable, les tentes et le feu de camp étaient parfaits.",
    "Clean room, good location near the historic Casbah. Highly recommended.",
    "رحلة ممتازة مع دليل سياحي محترف، سنكرر التجربة بإذن الله.",
    "Disputed check-in hour, but otherwise the place was clean and spacious."
  ];

  for (let i = 1; i <= 330; i++) {
    const bkg = randomItem(bookings);
    const statusRoll = rng();
    const status =
      statusRoll < 0.85 ? "published" :
      statusRoll < 0.94 ? "flagged" :
      statusRoll < 0.98 ? "hidden" : "deleted";

    reviews.push({
      id: `rev_${i.toString().padStart(3, "0")}`,
      listingId: bkg.listingId,
      listingTitle: bkg.listingTitle,
      vertical: bkg.vertical,
      guestId: bkg.guestId,
      guestName: bkg.guestName,
      guestAvatar: "/assets/avatar.png",
      hostId: bkg.hostId,
      hostName: bkg.hostName,
      hostType: bkg.hostType,
      wilayaCode: bkg.wilayaCode,
      rating: status === "flagged" ? randomInt(1, 2) : randomInt(4, 5),
      comment: randomItem(reviewComments),
      status,
      flagReason: status === "flagged" ? "Host reported personal conflict or inaccurate checkout claim." : undefined,
      createdAt: new Date(Date.now() - randomInt(1, 180) * 86400000).toISOString(),
      adminNotes: status === "flagged" ? ["Review flagged for mediation."] : [],
    });
  }

  // 6. Generate ≥ 1,550 Wallet Transactions
  // Strict Ledger Rule: balances derived from transactions only. Entries are
  // drafted first, then sorted chronologically so that each balanceAfter is
  // the running balance at that point in time.
  const drafts: Omit<WalletTransaction, "balanceAfter" | "id" | "reference">[] = [];

  for (let i = 1; i <= 1550; i++) {
    const host = randomItem(hosts);
    const txTypeRoll = rng();
    let type: WalletTransaction["type"];
    let amount: number;
    let desc: string;

    if (txTypeRoll < 0.50) {
      // Booking payout credit
      type = "booking_payment";
      amount = randomInt(15000, 85000);
      desc = `Settlement payout for completed reservation BLD-2026-${randomInt(1000, 9999)}`;
    } else if (txTypeRoll < 0.75) {
      // Commission deduction
      type = "commission_deduction";
      amount = -Math.round(randomInt(2000, 15000));
      desc = `Platform commission deduction (${host.commissionRate}%)`;
    } else if (txTypeRoll < 0.90) {
      // Host withdrawal / payout
      type = "host_payout";
      amount = -randomInt(20000, 100000);
      desc = `BaridiMob / CCP scheduled wire withdrawal`;
    } else {
      // Admin offline recharge
      type = "wallet_recharge";
      amount = randomInt(20000, 150000);
      desc = `Offline bank transfer credited by Admin (Ref: SATIM-DEP-${randomInt(10000, 99999)})`;
    }

    drafts.push({
      walletId: `wlt_${host.id}`,
      hostId: host.id,
      hostName: host.businessName || host.ownerName,
      hostType: host.hostType,
      type,
      amount,
      description: desc,
      bookingRef: type === "booking_payment" ? `BLD-2026-${randomInt(1000, 9999)}` : undefined,
      createdAt: new Date(Date.now() - randomInt(0, 180) * 86400000 - randomInt(0, 86399) * 1000).toISOString(),
    });
  }

  drafts.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const hostBalances: Record<string, number> = {};
  hosts.forEach((h) => (hostBalances[h.id] = 0));
  const chronological: WalletTransaction[] = drafts.map((d, idx) => {
    hostBalances[d.hostId] = (hostBalances[d.hostId] || 0) + d.amount;
    const n = idx + 1;
    return {
      ...d,
      id: `tx_${n.toString().padStart(4, "0")}`,
      reference: `TXN-DZ-${(10000 + n).toString()}`,
      balanceAfter: hostBalances[d.hostId],
    };
  });
  // Store newest first (the order every ledger view displays).
  const transactions: WalletTransaction[] = chronological.reverse();

  // Host profiles show the ledger-derived balance, never an independent number.
  hosts.forEach((h) => {
    h.walletBalance = hostBalances[h.id] || 0;
  });

  // Create Wallets using strictly derived balances
  const wallets: HostWallet[] = hosts.map((h) => {
    const hostTxs = transactions.filter((t) => t.hostId === h.id);
    const balance = hostTxs.reduce((sum, t) => sum + t.amount, 0);
    const totalEarned = hostTxs.filter((t) => t.type === "booking_payment").reduce((s, t) => s + t.amount, 0);
    const totalCommissionsPaid = Math.abs(hostTxs.filter((t) => t.type === "commission_deduction").reduce((s, t) => s + t.amount, 0));
    const totalPayouts = Math.abs(hostTxs.filter((t) => t.type === "host_payout").reduce((s, t) => s + t.amount, 0));

    return {
      id: `wlt_${h.id}`,
      hostId: h.id,
      ownerName: h.ownerName,
      businessName: h.businessName,
      hostType: h.hostType,
      wilayaCode: h.wilayaCode,
      balance,
      totalEarned,
      totalCommissionsPaid,
      totalPayouts,
      lastTransactionAt: hostTxs.length > 0 ? hostTxs[0].createdAt : h.joinedAt,
      isNegative: balance < 0,
    };
  });

  // 7. Generate ≥ 210 Audit Entries
  const auditEntries: AuditEntry[] = [];
  const auditActions = [
    { action: "HOST_APPROVE", entityType: "host" as const, details: "Approved host tourism operating verification" },
    { action: "LISTING_APPROVE", entityType: "listing" as const, details: "Approved listing following moderation checklist" },
    { action: "WALLET_RECHARGE", entityType: "wallet" as const, details: "Processed SATIM offline bank deposit" },
    { action: "COMMISSION_CHANGE", entityType: "setting" as const, details: "Adjusted commission override rate" },
    { action: "DISPUTE_RESOLVE", entityType: "booking" as const, details: "Issued SATIM refund after dispute arbitration" },
    { action: "REVIEW_HIDE", entityType: "review" as const, details: "Hidden review flagged for policy breach" },
    { action: "USER_SUSPEND", entityType: "user" as const, details: "Suspended guest account due to repeated no-shows" }
  ];

  for (let i = 1; i <= 215; i++) {
    const template = randomItem(auditActions);
    auditEntries.push({
      id: `aud_${i.toString().padStart(3, "0")}`,
      timestamp: new Date(Date.now() - randomInt(0, 90) * 86400000).toISOString(),
      actorId: "adm_01",
      actorName: "Nadia Benkhaled",
      actorRole: "super_admin",
      action: template.action,
      entityType: template.entityType,
      entityId: `${template.entityType}_${randomInt(1, 100)}`,
      details: template.details,
      ipAddress: `197.200.${randomInt(10, 80)}.${randomInt(1, 254)} (Algiers, DZ)`,
    });
  }

  // 8. Payout requests (hosts asking to withdraw their wallet balance)
  const payouts: PayoutRequest[] = [];
  const methods: PayoutRequest["payoutMethod"][] = ["ccp", "bank_wire", "baridimob"];
  const payoutHosts = hosts.filter((h) => h.status === "approved").slice(0, 14);
  payoutHosts.forEach((h, idx) => {
    const balance = hostBalances[h.id] || 0;
    const method = methods[idx % methods.length];
    const accountDetails: PayoutRequest["accountDetails"] =
      method === "ccp"
        ? { ccpRip: `00799999${randomInt(1000, 9999)}${randomInt(100000, 999999)}${randomInt(10, 99)}` }
        : method === "bank_wire"
          ? { rib: `00200${randomInt(100, 999)}${randomInt(1000000, 9999999)}${randomInt(10000, 99999)}` }
          : { phone: `+213 ${randomItem(["5", "6", "7"])}${randomInt(10, 99)} ${randomInt(10, 99)} ${randomInt(10, 99)} ${randomInt(10, 99)}` };
    // Most pending requests fit the balance; a couple deliberately exceed it
    // so the "insufficient balance" guard is visible in the demo.
    const status: PayoutRequest["status"] = idx < 9 ? "pending" : idx < 12 ? "approved" : "rejected";
    const exceeds = status === "pending" && idx % 4 === 3;
    const amountDzd =
      exceeds || balance <= 10000
        ? Math.max(10000, Math.round(Math.abs(balance) + randomInt(20000, 80000)))
        : Math.round(Math.min(balance, randomInt(15000, 250000)) / 100) * 100;
    const requestedAt = new Date(Date.now() - randomInt(1, 12) * 86400000).toISOString();
    payouts.push({
      id: `pay_${(idx + 1).toString().padStart(3, "0")}`,
      hostId: h.id,
      hostName: h.businessName || h.ownerName,
      hostType: h.hostType,
      amountDzd,
      payoutMethod: method,
      accountDetails,
      status,
      requestedAt,
      ...(status !== "pending"
        ? {
            processedAt: new Date(new Date(requestedAt).getTime() + 86400000).toISOString(),
            processedBy: "Nadia Benkhaled",
            rejectionReason: status === "rejected" ? "Account holder name does not match host identity" : undefined,
          }
        : {}),
    });
  });

  return {
    users,
    hosts,
    listings,
    bookings,
    reviews,
    wallets,
    transactions,
    auditEntries,
    payouts,
  };
}
