"""
The extra, generated part of the demo world (deterministic).

The admin panel mock generator (``admin/lib/mock-data/generator.ts``) built
hundreds of random users, hosts, listings and bookings. The seed keeps the
same spirit and the same name lists but a moderate size, and a fixed random
seed so every run builds the same world: about 24 guests, 12 hosts of the
four types, about 30 listings, a few trips and about 50 bookings (the
bookings are planned in ``seeder.py``, which needs the database rows).

Everything here is plain data built from :data:`SEED`; nothing touches the
database.
"""

import random
import unicodedata

# Same seed as the admin generator, so the demo is the same on every machine.
SEED = 20261020

FIRST_NAMES = [
    "Meriem", "Fatima", "Mehdi", "Nour", "Rachid", "Amel", "Tarek", "Houda", "Walid", "Samia",
    "Billel", "Farid", "Zineb", "Khaled", "Ines", "Hamza", "Nassima", "Anis", "Chahinez", "Adel",
    "Soraya", "Hichem", "Khadidja", "Nabil", "Ryma",
]
LAST_NAMES = [
    "Bouzid", "Touati", "Benaissa", "Saadi", "Khelifi", "Zerrouki", "Brahimi", "Belkacem", "Larbi", "Djebbar",
    "Boudiaf", "Amrani", "Hammadi", "Rahmouni", "Guerfi", "Boumaza", "Belhadj", "Zitouni", "Madani", "Ferhat",
    "Benamara", "Ghezali", "Chaib", "Messaoudi",
]

# (commune name as in apps.geo, wilaya code, English city label, latitude, longitude)
PLACES = [
    ("Bejaia", 6, "Bejaia", 36.7509, 5.0567),
    ("Annaba", 23, "Annaba", 36.9000, 7.7667),
    ("Setif", 19, "Setif", 36.1911, 5.4137),
    ("Tizi Ouzou", 15, "Tizi Ouzou", 36.7169, 4.0497),
    ("Blida", 9, "Blida", 36.4700, 2.8277),
    ("Mostaganem", 27, "Mostaganem", 35.9311, 0.0892),
    ("Biskra", 7, "Biskra", 34.8500, 5.7333),
    ("Timimoun", 49, "Timimoun", 29.2639, 0.2306),
    ("Jijel", 18, "Jijel", 36.8206, 5.7667),
    ("Tamanrasset", 11, "Tamanrasset", 22.7850, 5.5228),
]

AGENCY_NAMES = ["Hoggar Expeditions & Travel", "Numidia Sahara Voyages", "Casbah Heritage Tours"]
HOTEL_NAMES = ["Hôtel Les Zianides", "Palais El Manzah", "Grand Hôtel Cirta"]
HOSTEL_NAMES = ["Oran Waterfront Youth Hostel", "Constantine Bridges Backpackers"]

HOME_NAMES = [
    "Mediterranean Seaside Villa", "Dar El Bahdja Heritage House", "Modern Heights Apartment",
    "Traditional M'zab House", "Corniche Luxury Penthouse", "Cedar Forest Mountain Chalet",
    "Gorge View Heritage Suite", "Olive Grove Family Home",
]
# (title, make, model, year, seats, transmission, fuel, property type slug)
VEHICLES = [
    ("Hyundai Tucson", "Hyundai", "Tucson", 2022, 5, "automatic", "diesel", "suv_4x4"),
    ("Volkswagen Golf 8", "Volkswagen", "Golf 8", 2021, 5, "manual", "petrol", "car"),
    ("Toyota Hilux Double Cab", "Toyota", "Hilux", 2023, 5, "manual", "diesel", "suv_4x4"),
    ("Peugeot 208", "Peugeot", "208", 2022, 5, "manual", "petrol", "car"),
]
# Experience names with their canonical type (admin generator EXPERIENCE_TYPE_BY_NAME).
EXPERIENCES = [
    ("Tassili Rock Art Trek", "desert"),
    ("Sunset Dune Camel Ride", "desert"),
    ("M'zab Valley Guided Tour", "guided_tour"),
    ("Hammam & Henna Workshop", "wellness"),
    ("Djurdjura Hiking Day", "nature_adventure"),
    ("Couscous Cooking Class", "gastronomy"),
    ("Chiffa Gorges Day Excursion", "excursion"),
    ("Bejaia Sea Kayak Session", "sport"),
    ("Pottery & Carpet Weaving Workshop", "culture_workshop"),
]
# Trip names with their canonical type (admin generator TRIP_TYPE_BY_NAME).
TRIPS = [
    ("Hoggar & Assekrem Expedition", "desert_expedition"),
    ("Kabylie Villages Trek", "hiking"),
    ("Roman Algeria Heritage Route", "cultural"),
    ("Zaouias Spiritual Route", "religious"),
]

# Photos reused from the website mocks (the admin generator's /assets/house.png
# does not exist in the website's public folder).
HOME_PHOTOS = [
    "https://images.unsplash.com/photo-1580587771525-78b9dba3b914",
    "https://images.unsplash.com/photo-1512917774080-9991f1c4c750",
    "https://images.unsplash.com/photo-1613977257363-707ba9348227",
    "https://images.unsplash.com/photo-1600585154340-be6161a56a0c",
    "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688",
    "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267",
]
VEHICLE_PHOTOS = [
    "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf",
    "https://images.unsplash.com/photo-1549399542-7e3f8b79c341",
]
EXPERIENCE_PHOTOS = [
    "https://images.unsplash.com/photo-1610217889481-a3637938262a",
    "https://images.unsplash.com/photo-1535190823090-3c159ed10a97",
    "https://images.unsplash.com/photo-1638732984528-f255c9714619",
]
HOTEL_PHOTOS = [
    "https://images.unsplash.com/photo-1566073771259-6a8506099945",
    "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b",
    "https://images.unsplash.com/photo-1591088398332-8a7791972843",
]
HOSTEL_PHOTOS = [
    "https://images.unsplash.com/photo-1555854877-bab0e564b8d5",
    "https://images.unsplash.com/photo-1552573033-b7bb437bf953",
]

# Review comments of the admin generator, with their language code.
REVIEW_COMMENTS = [
    ("Un séjour mémorable, vue sur mer et accueil chaleureux.", "fr"),
    ("Very peaceful and authentically decorated. Host was extremely helpful.", "en"),
    ("إقامة رائعة ومريحة جدا، كل التسهيلات متوفرة والمعاملة في القمة.", "ar"),
    ("Expérience saharienne inoubliable, les tentes et le feu de camp étaient parfaits.", "fr"),
    ("Clean room, good location near the historic Casbah. Highly recommended.", "en"),
    ("رحلة ممتازة مع دليل سياحي محترف، سنكرر التجربة بإذن الله.", "ar"),
    ("Disputed check-in hour, but otherwise the place was clean and spacious.", "en"),
]
HOST_REVIEW_COMMENTS = [
    ("Respectful guests who left the place spotless. Welcome back anytime.", "en"),
    ("Invités ponctuels et très agréables, je recommande.", "fr"),
]


def ascii_slug(text: str) -> str:
    """Lower-case ASCII form of a name, for demo email addresses (Zineb Saâdi -> zineb.saadi)."""
    flat = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode()
    return "".join(c for c in flat.lower() if c.isalnum())


def make_rng() -> random.Random:
    """A fresh random generator on the fixed seed."""
    return random.Random(SEED)


def guests(rng: random.Random, count: int = 24) -> list[dict]:
    """Generated guest accounts: ``firstname.lastnameN@example.dz`` like the admin generator."""
    rows = []
    for i in range(1, count + 1):
        first, last = FIRST_NAMES[(i - 1) % len(FIRST_NAMES)], rng.choice(LAST_NAMES)
        place = rng.choice(PLACES)
        rows.append({
            "key": f"guest_{i:02d}",
            "first_name": first,
            "last_name": last,
            "email": f"{ascii_slug(first)}.{ascii_slug(last)}{i}@example.dz",
            "phone": f"+2135{50000000 + i * 7919:08d}",
            "locale": rng.choice(["fr", "ar", "en"]),
            "languages": rng.choice([["ar", "fr"], ["ar", "fr", "en"], ["fr", "en"]]),
            "place": place,
            "days_ago": rng.randint(30, 700),
        })
    return rows


# (host type, business name or None, verification target)
HOST_PLAN = [
    ("individual", None, "approved"),
    ("individual", None, "approved"),
    ("individual", None, "under_review"),
    ("individual", None, "applied"),
    ("agency", AGENCY_NAMES[0], "approved"),
    ("agency", AGENCY_NAMES[1], "approved"),
    ("agency", AGENCY_NAMES[2], "changes_requested"),
    ("hotel", HOTEL_NAMES[0], "approved"),
    ("hotel", HOTEL_NAMES[1], "approved"),
    ("hotel", HOTEL_NAMES[2], "under_review"),
    ("hostel", HOSTEL_NAMES[0], "approved"),
    ("hostel", HOSTEL_NAMES[1], "suspended"),
]


def hosts(rng: random.Random) -> list[dict]:
    """Generated hosts of the four types with their owner person and verification target."""
    rows = []
    for i, (host_type, business, target) in enumerate(HOST_PLAN, start=1):
        first, last = rng.choice(FIRST_NAMES), rng.choice(LAST_NAMES)
        domain = "gmail.com" if host_type == "individual" else "bladus-partner.dz"
        place = PLACES[(i - 1) % len(PLACES)]
        rows.append({
            "key": f"host_{i:02d}",
            "host_type": host_type,
            "business_name": business,
            "target": target,
            "first_name": first,
            "last_name": last,
            "email": f"{ascii_slug(first)}.{ascii_slug(last)}{i}@{domain}",
            "phone": f"+2136{60000000 + i * 104729:08d}",
            "place": place,
            "approval_mode": "instant" if rng.random() > 0.4 else "request",
            "days_ago": rng.randint(200, 600),
            "rc_number": f"DZ-{place[1]:02d}-2023-B-{8000 + i}",
            "licence": f"DZ-TOUR-2023-B-{8000 + i}" if host_type == "agency" else "",
        })
    return rows


def home_listing(rng: random.Random, host: dict, index: int) -> dict:
    """One generated home of an individual host."""
    name = HOME_NAMES[index % len(HOME_NAMES)]
    city = host["place"][2]
    return {
        "vertical": "home",
        "title": f"{name} - {city}",
        "description": (f"Authentic Algerian accommodation in the heart of {city}. Fully equipped with local "
                        "craftsmanship, modern amenities, and warm Mediterranean hospitality."),
        "property_type": rng.choice(["villa", "apartment", "traditional_house", "house", "studio"]),
        "category": rng.choice(["beach", "mountain", "city"]),
        "price": rng.randint(75, 450) * 100,
        "cleaning_fee": rng.choice([0, 2000, 3000]),
        "guests": rng.randint(2, 8),
        "bedrooms": rng.randint(1, 4),
        "bathrooms": rng.randint(1, 3),
        "amenities": rng.sample(["wifi", "air_conditioning", "kitchen", "free_parking", "tv", "hot_water",
                                 "balcony", "garden", "sea_view", "family_friendly"], 5),
        "policy": rng.choice(["flexible", "moderate", "strict"]),
        "min_nights": rng.choice([1, 2]),
        "photos": rng.sample(HOME_PHOTOS, 2),
    }


def vehicle_listing(rng: random.Random, host: dict, index: int) -> dict:
    """One generated vehicle of an individual host."""
    title, make, model, year, seats, transmission, fuel, ptype = VEHICLES[index % len(VEHICLES)]
    city = host["place"][2]
    return {
        "vertical": "vehicle",
        "title": f"{title} - {city}",
        "description": f"Well maintained {make} {model} available in {city}, ideal for family trips and long drives.",
        "property_type": ptype,
        "category": "off_road" if ptype == "suv_4x4" else "city_driving",
        "price": rng.randint(120, 350) * 100,
        "cleaning_fee": 0,
        "guests": seats,
        "amenities": ["air_conditioning", "gps"],
        "policy": "moderate",
        "min_nights": 1,
        "vehicle": {"make": make, "model": model, "year": year, "seats": seats, "transmission": transmission,
                    "fuel": fuel},
        "photos": list(VEHICLE_PHOTOS),
    }


def experience_listing(rng: random.Random, host: dict, index: int) -> dict:
    """One generated experience of an agency."""
    name, experience_type = EXPERIENCES[index % len(EXPERIENCES)]
    city = host["place"][2]
    return {
        "vertical": "experience",
        "experience_type": experience_type,
        "title": f"{name} - {city}",
        "description": f"{name} with a licensed local guide around {city}. Small groups, local food and stories.",
        "property_type": "activity",
        "category": "indoor" if experience_type in ("wellness", "gastronomy", "culture_workshop") else "outdoor",
        "price": rng.randint(45, 180) * 100,
        "cleaning_fee": 0,
        "guests": rng.randint(6, 12),
        "duration_hours": rng.choice([3, 4, 6, 8]),
        "languages": ["ar", "fr", "en"],
        "includes": ["Local guide", "Mint tea and snacks"],
        "amenities": ["first_aid_kit", "family_friendly"],
        "policy": "flexible",
        "photos": rng.sample(EXPERIENCE_PHOTOS, 2),
    }


def stay_listing(host: dict, vertical: str, rng: random.Random) -> dict:
    """The one listing of a generated hotel or hostel, with two room types (admin generator rooms)."""
    city = host["place"][2]
    hostel = vertical == "hostel"
    base = rng.randint(25, 60) * 100 if hostel else rng.randint(140, 480) * 100
    return {
        "vertical": vertical,
        "title": host["business_name"],
        "description": (f"{host['business_name']} in {city}: comfortable rooms, warm Algerian welcome and an "
                        "easy base to explore the region."),
        "property_type": "hostel" if hostel else "hotel",
        "category": "backpackers" if hostel else rng.choice(["business", "seaside"]),
        "amenities": ["wifi", "air_conditioning", "breakfast", "hot_water"],
        "policy": "moderate",
        "min_nights": 1,
        "photos": rng.sample(HOSTEL_PHOTOS if hostel else HOTEL_PHOTOS, 2),
        "rooms": [
            {
                "name": "Standard Shared Dorm Bed" if hostel else "Deluxe King Room",
                "description": ("Includes personal reading lamp and secure locker." if hostel
                                else "Spacious room with king bed and city/sea view."),
                "booking_unit": "bed" if hostel else "room",
                "unit_count": rng.randint(8, 20),
                "capacity_per_unit": 1 if hostel else 2,
                "base_price_minor": base * 100,
            },
            {
                "name": "Private Twin Room" if hostel else "Executive Suite",
                "description": "Premium comfort with upgraded amenities.",
                "booking_unit": "room",
                "unit_count": rng.randint(2, 8),
                "capacity_per_unit": 2 if hostel else 4,
                "base_price_minor": round(base * 1.6) * 100,
            },
        ],
    }


def trip(rng: random.Random, host: dict, index: int) -> dict:
    """One generated agency trip with a short itinerary."""
    name, trip_type = TRIPS[index % len(TRIPS)]
    days = rng.randint(3, 6)
    return {
        "title": f"{name} ({host['business_name']})",
        "trip_type": trip_type,
        "description": f"{name}: a {days}-day small-group journey led by {host['business_name']}.",
        "duration_days": days,
        "group_min": 2,
        "group_max": rng.choice([8, 10, 12]),
        "price": rng.randint(350, 1600) * 100,
        "inclusions": ["Licensed guide", "Ground transport", "Breakfasts and dinners"],
        "exclusions": ["Flights", "Travel insurance"],
        "itinerary": [
            {"day_number": d, "title": f"Day {d}", "description": "Guided visits, local meals and free time."}
            for d in range(1, days + 1)
        ],
        "photos": rng.sample(EXPERIENCE_PHOTOS, 2),
    }
