import { Trip } from "@/types";

export const mockTrips: Trip[] = [
  {
    id: "trip_tassili_5day",
    title: "5-Day Grand Tassili n'Ajjer & Tamrit Rock Art Expedition",
    slug: "5-day-grand-tassili-najjer-tamrit-rock-art-expedition",
    description:
      "An awe-inspiring 5-day walking and 4x4 expedition through the geological wonderland of Tassili n'Ajjer National Park. Walk among millennia-old cypress trees, camp under unpolluted Saharan skies, and witness prehistoric rock paintings that depict the Sahara when it was green and lush.",
    coverPhoto: "https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9",
    gallery: [
      "https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9",
      "https://images.unsplash.com/photo-1518709268805-4e9042af9f23",
      "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800",
      "https://images.unsplash.com/photo-1488646953014-85cb44e25828",
    ],
    durationDays: 5,
    maxGroupSize: 8,
    minGroupSize: 2,
    pricePerPerson: 85000,
    city: "Djanet",
    locationValue: "Djanet, Illizi",
    meetingPoint: "Djanet Inedbirene Airport (DJA) or Agency Office, Djanet Center",
    cancellationPolicy: "moderate",
    organizationId: "org_atlas_escapes",
    status: "active",
    rating: 4.98,
    reviewsCount: 32,
    departureDates: ["2026-10-25", "2026-11-05", "2026-11-20", "2026-12-05", "2026-12-20"],
    createdAt: "2024-01-15T08:00:00.000Z",
    itinerary: [
      {
        day: 1,
        title: "Djanet Arrival & Ascent to Plateau Base",
        description:
          "Reception at Djanet Inedbirene Airport by our Tuareg expedition team. Briefing over traditional mint tea, 4x4 transfer through golden dunes to the base of the Tassili plateau cliff pass.",
        activities: [
          "Airport greeting & gear verification",
          "4x4 scenic transfer across Admer erg borders",
          "Campfire dinner & stargazing orientation",
        ],
        meals: "Dinner included",
        accommodation: "Desert Bivouac tent at plateau base",
      },
      {
        day: 2,
        title: "Ascent to Tamrit Canyon & Millennium Cypress Trees",
        description:
          "Early morning climb via the ancient donkey trail onto the lunar sandstone plateau. Walk through the canyon of thousand-year-old Dupreziana cypress trees and discover first prehistoric rock engravings.",
        activities: [
          "Scenic 4-hour guided plateau ascent",
          "Exploration of prehistoric pastoralist murals",
          "Tamrit natural rock arch photography",
        ],
        meals: "Breakfast, Picnic Lunch, Campfire Dinner",
        accommodation: "Platform campsite under the stars",
      },
      {
        day: 3,
        title: "Sefar Stone Labyrinth: World's Open-Air Art Museum",
        description:
          "Full-day trek into the surreal stone labyrinth of Sefar. Admire the world-renowned frescoes of the 'Great God of Sefar' and scenes of hunters, giraffes, and ancient rituals.",
        activities: [
          "Guided tour of central Sefar prehistoric shelters",
          "Tuareg geological and archaeological lecture",
          "Traditional Taguella sand-bread preparation",
        ],
        meals: "Breakfast, Trail Lunch, Traditional Taguella Dinner",
        accommodation: "Sandstone alcove sheltered bivouac",
      },
      {
        day: 4,
        title: "Tin Zoumaitek & Jabbaren Panorama",
        description:
          "Traverse the eastern plateau edge toward Tin Zoumaitek to marvel at the famed 'Weeping Cows' bas-reliefs. Breathtaking sunset over the boundless erg dunes below.",
        activities: [
          "Visit the Weeping Cows rock engravings",
          "Panoramic sunset viewpoint over the Grand Erg",
          "Tuareg music and storytelling circle",
        ],
        meals: "Breakfast, Lunch, Nomad Campfire Dinner",
        accommodation: "High plateau campsite",
      },
      {
        day: 5,
        title: "Plateau Descent, Oasis Bath & Djanet Farewell",
        description:
          "Gentle morning descent back to the desert floor. Relaxing warm tea ceremony at Essendilene canyon oasis, souvenir craftsmanship visit in Djanet, and airport transfer.",
        activities: [
          "Descent via scenic mountain pass",
          "Essendilene green palm oasis visit",
          "Traditional farewell banquet in Djanet oasis garden",
        ],
        meals: "Breakfast, Traditional Farewell Lunch",
        accommodation: "End of circuit / airport transfer",
      },
    ],
    inclusions: [
      "All internal 4x4 ground transport in Toyota Land Cruisers",
      "Licensed Tuareg mountain guide and National Park certified ranger",
      "Official Tassili n'Ajjer National Park entry and photography permits",
      "Full board: breakfasts, trail lunches, and hot campfire dinners with chef",
      "Quality two-person tents, thick sleeping mats, and dining mess tent",
      "Mule and porter team for collective luggage and camp supplies",
    ],
    exclusions: [
      "Domestic flights to/from Djanet (Air Algérie / Tassili Airlines)",
      "Personal sleeping bag and trekking poles",
      "Travel, mountain rescue and medical insurance",
      "Gratuities and personal souvenirs",
    ],
  },
  {
    id: "trip_taghit_3day",
    title: "3-Day Golden Dunes & Mudbrick Ksar Caravan of Taghit",
    slug: "3-day-golden-dunes-mudbrick-ksar-caravan-taghit",
    description:
      "Discover the jewel of the Saoura Valley. Climb the highest sand dunes in the Grand Erg Occidental, explore ancient 11th-century mudbrick ksars, and experience sunset camel treks with traditional campfire mint tea.",
    coverPhoto: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23",
    gallery: [
      "https://images.unsplash.com/photo-1518709268805-4e9042af9f23",
      "https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9",
      "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800",
    ],
    durationDays: 3,
    maxGroupSize: 12,
    minGroupSize: 4,
    pricePerPerson: 42000,
    city: "Taghit",
    locationValue: "Taghit, Béchar",
    meetingPoint: "Béchar Airport (CBH) or Taghit Oasis Center",
    cancellationPolicy: "flexible",
    organizationId: "org_atlas_escapes",
    status: "active",
    rating: 4.93,
    reviewsCount: 24,
    departureDates: ["2026-10-28", "2026-11-12", "2026-11-26", "2026-12-10"],
    createdAt: "2024-02-10T10:00:00.000Z",
    itinerary: [
      {
        day: 1,
        title: "Welcome to Saoura Valley & Sunset Camel Trek",
        description:
          "Arrival in Taghit, check-in at our authentic mudbrick guest house. Afternoon camel caravan across the red sands of the Grand Erg Occidental for a 360-degree dune sunset.",
        activities: [
          "Arrival and date milk welcome drink",
          "2-hour camel ride into the high dunes",
          "Sunset dune summit meditation & photography",
        ],
        meals: "Dinner included",
        accommodation: "Traditional adobe lodge in Taghit palm grove",
      },
      {
        day: 2,
        title: "11th-Century Old Ksar & Prehistoric Petroglyphs",
        description:
          "Guided morning walk through the maze of the historic mudbrick Ksar of Taghit. Afternoon excursion to prehistoric rock art stations featuring desert gazelles and ostriches.",
        activities: [
          "Architectural exploration of the Ksar fortifications",
          "Oasis irrigation segregation system tour",
          "Zaouia and petroglyphs archaeological visit",
        ],
        meals: "Breakfast, Lunch, Traditional Couscous Dinner",
        accommodation: "Adobe lodge in Taghit",
      },
      {
        day: 3,
        title: "Béni Abbès Hermitage & Grand Erg Panorama",
        description:
          "Morning excursion to neighboring Béni Abbès, the white pearl of the Saoura. Visit the historical Father de Foucauld hermitage and museum before departure.",
        activities: [
          "Visit Father de Foucauld historic hermitage",
          "Museum of Sahara flora and fauna",
          "Return transfer to Béchar Airport",
        ],
        meals: "Breakfast, Lunch",
        accommodation: "End of circuit",
      },
    ],
    inclusions: [
      "Airport transfers from/to Béchar Airport in air-conditioned 4x4",
      "2 nights accommodation in authentic adobe guesthouse",
      "All meals mentioned in the itinerary (local Saharan gastronomy)",
      "Guided camel ride with local caravaneer",
      "Certified local cultural tour guide",
    ],
    exclusions: [
      "Airfare to Béchar",
      "Quad / buggy rental on the dunes (optional add-on)",
      "Personal shopping and souvenirs",
    ],
  },
  {
    id: "trip_mzab_4day",
    title: "4-Day M'zab Valley & Ghardaïa Millennium Heritage Circuit",
    slug: "4-day-mzab-valley-ghardaia-millennium-heritage-circuit",
    description:
      "A deep cultural journey through the five sacred pentapolis ksars of the UNESCO M'zab Valley. Meet local architects, observe traditional craft carpet auctions in Beni Isguen, and study millennium-old hydraulic oasis systems.",
    coverPhoto: "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800",
    gallery: [
      "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800",
      "https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9",
      "https://images.unsplash.com/photo-1518709268805-4e9042af9f23",
    ],
    durationDays: 4,
    maxGroupSize: 10,
    minGroupSize: 2,
    pricePerPerson: 58000,
    city: "Ghardaïa",
    locationValue: "Ghardaïa",
    meetingPoint: "Ghardaïa Noumérat Airport (GHA)",
    cancellationPolicy: "moderate",
    organizationId: "org_atlas_escapes",
    status: "active",
    rating: 4.97,
    reviewsCount: 19,
    departureDates: ["2026-11-01", "2026-11-15", "2026-12-01", "2026-12-15"],
    createdAt: "2024-03-01T11:00:00.000Z",
    itinerary: [
      {
        day: 1,
        title: "Beni Isguen Silent City & Sunset Auction",
        description:
          "Arrival in Ghardaïa. Afternoon walking tour of the fortified holy city of Beni Isguen, strictly preserved according to Ibadi customs. Watch the famous afternoon silent market auction.",
        activities: [
          "Private tour with a local certified Mozabite guide",
          "Ascent to the Boulila watchtower panoramic viewpoint",
          "Experience the historic carpet and antique open-air auction",
        ],
        meals: "Dinner included",
        accommodation: "Restored Mozabite desert villa",
      },
      {
        day: 2,
        title: "Ghardaïa Old Town & Hydraulic Oasis Ingenuity",
        description:
          "Explore the capital ksar of Ghardaïa with its pyramid-shaped minaret that inspired Le Corbusier. Walk through the millennial subterranean dam network and lush palm groves.",
        activities: [
          "Architecture lecture on functional desert urbanism",
          "Visit the ancient flood distribution water-gates",
          "Traditional mint tea with date growers",
        ],
        meals: "Breakfast, Lunch, Dinner",
        accommodation: "Mozabite desert villa",
      },
      {
        day: 3,
        title: "El Atteuf & Melika: The Oldest Foundations",
        description:
          "Visit El Atteuf, the first ksar founded in 1012 AD, and its world-renowned Mosque of Sidi Brahim. Continue to Melika for royal cemetery views over the wadi.",
        activities: [
          "Visit the UNESCO-listed Sidi Brahim sanctuary",
          "Artisan pottery and textile weaving workshop",
          "Mozabite family dinner experience",
        ],
        meals: "Breakfast, Lunch, Family Dinner",
        accommodation: "Mozabite desert villa",
      },
      {
        day: 4,
        title: "Craft Markets & Farewell to the Pentapolis",
        description:
          "Morning shopping in the vibrant covered souks of Ghardaïa for authentic wool rugs, pure dates, and copperware. Airport transfer.",
        activities: [
          "Shopping in the spice and carpet souks",
          "Farewell lunch with traditional trida dish",
          "Transfer to Ghardaïa Airport",
        ],
        meals: "Breakfast, Lunch",
        accommodation: "End of circuit",
      },
    ],
    inclusions: [
      "Airport transfers and private Mercedes van transport between ksars",
      "3 nights lodging in authentic restored Mozabite villa",
      "Full board including all home-cooked traditional meals",
      "Official certified local Mozabite guide throughout",
      "All community entrance fees and donations",
    ],
    exclusions: [
      "Flights to Ghardaïa",
      "Personal purchases and rug shipping",
      "Travel insurance",
    ],
  },
  {
    id: "trip_tipaza_3day",
    title: "3-Day Roman Caesarea & Mediterranean Coast Heritage Circuit",
    slug: "3-day-roman-caesarea-mediterranean-coast-heritage-circuit",
    description:
      "Explore the ancient Phoenician and Roman maritime ports of Tipaza and Cherchell, climb the majestic Royal Mausoleum of Mauretania, and sample coastal Mediterranean culinary traditions.",
    coverPhoto: "https://images.unsplash.com/photo-1580587771525-78b9dba3b914",
    gallery: [
      "https://images.unsplash.com/photo-1580587771525-78b9dba3b914",
      "https://images.unsplash.com/photo-1512917774080-9991f1c4c750",
      "https://images.unsplash.com/photo-1613977257363-707ba9348227",
    ],
    durationDays: 3,
    maxGroupSize: 14,
    minGroupSize: 4,
    pricePerPerson: 36000,
    city: "Tipaza & Cherchell",
    locationValue: "Tipaza",
    meetingPoint: "Algiers Central Station or Tipaza Port",
    cancellationPolicy: "flexible",
    organizationId: "org_atlas_escapes",
    status: "active",
    rating: 4.89,
    reviewsCount: 28,
    departureDates: ["2026-10-20", "2026-11-03", "2026-11-17", "2026-12-01"],
    createdAt: "2024-03-20T14:00:00.000Z",
    itinerary: [
      {
        day: 1,
        title: "Tipaza UNESCO Roman Ruins & Royal Mausoleum",
        description:
          "Morning departure from Algiers. Visit the enigmatic Royal Mausoleum of Mauretania (Tombeau de la Chrétienne). Afternoon stroll through the maritime Roman amphitheater, basilica, and olive presses overlooking the turquoise Mediterranean.",
        activities: [
          "Guided tour of the Royal Mausoleum",
          "Walk through the seaside Roman ruins praised by Albert Camus",
          "Sunset seafood dinner in Tipaza Port",
        ],
        meals: "Lunch and Dinner included",
        accommodation: "Seaside boutique hotel in Tipaza",
      },
      {
        day: 2,
        title: "Cherchell Antiquities & Juba II's Capital",
        description:
          "Follow the scenic coastal cornice west to Cherchell (ancient Caesarea). Visit the archaeological museum hosting priceless marble statues of Cleopatra Selene and King Juba II.",
        activities: [
          "Cherchell archaeological museum tour",
          "Roman forum and public baths exploration",
          "Traditional coastal fish barbecue",
        ],
        meals: "Breakfast, Seafood Lunch, Dinner",
        accommodation: "Seaside boutique hotel in Tipaza",
      },
      {
        day: 3,
        title: "Mount Chenoua Hike & Artisan Pottery Village",
        description:
          "Morning coastal hike along the cliffs of Mount Chenoua with panoramic views of the bay. Visit the artisan potters of Chenoua village before return transfer to Algiers.",
        activities: [
          "Scenic 2-hour coastal nature walk",
          "Hands-on pottery workshop with local craftswomen",
          "Return drive to Algiers",
        ],
        meals: "Breakfast, Fisherman Lunch",
        accommodation: "End of circuit",
      },
    ],
    inclusions: [
      "Comfortable minibus transport throughout from/to Algiers",
      "2 nights seaside accommodation in Tipaza",
      "All meals including fresh Mediterranean seafood specialties",
      "Certified archaeological tour guide & all museum entrance tickets",
    ],
    exclusions: [
      "Personal alcoholic beverages",
      "Personal purchases & tips",
    ],
  },
];
