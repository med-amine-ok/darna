"""
Starter reference rows of the catalog (BR-LST-04, BR-CAN-01).

Plain data read by ``services.seed_reference_data`` (and so by
``manage.py seed_catalog``). Names are given as ``(en, fr, ar)``. Admins can
add, rename or deactivate rows later; slugs are stable keys and never change.
"""

from .models import POLICY_WINDOWS

STAYS = ["home", "hotel", "hostel"]
ALL = ["home", "hotel", "hostel", "experience", "vehicle"]

# (code, (en, fr, ar), windows). Windows come from BR-CAN-01 (DEC-011).
POLICIES = [
    ("flexible", ("Flexible", "Flexible", "مرنة"), POLICY_WINDOWS["flexible"]),
    ("moderate", ("Moderate", "Modérée", "معتدلة"), POLICY_WINDOWS["moderate"]),
    ("strict", ("Strict", "Stricte", "صارمة"), POLICY_WINDOWS["strict"]),
]

# (slug, group_code, (en, fr, ar), applies_to verticals)
AMENITIES = [
    ("wifi", "essentials", ("Wi-Fi", "Wi-Fi", "واي فاي"), STAYS + ["vehicle"]),
    ("air_conditioning", "essentials", ("Air conditioning", "Climatisation", "تكييف"), STAYS + ["vehicle"]),
    ("heating", "essentials", ("Heating", "Chauffage", "تدفئة"), STAYS),
    ("kitchen", "essentials", ("Kitchen", "Cuisine", "مطبخ"), ["home", "hostel"]),
    ("washing_machine", "essentials", ("Washing machine", "Machine à laver", "غسالة"), ["home"]),
    ("hot_water", "essentials", ("Hot water", "Eau chaude", "ماء ساخن"), STAYS),
    ("tv", "features", ("TV", "Télévision", "تلفاز"), STAYS),
    ("free_parking", "features", ("Free parking", "Parking gratuit", "موقف مجاني"), STAYS),
    ("pool", "features", ("Pool", "Piscine", "مسبح"), ["home", "hotel"]),
    ("balcony", "features", ("Balcony or terrace", "Balcon ou terrasse", "شرفة"), ["home", "hotel"]),
    ("garden", "features", ("Garden", "Jardin", "حديقة"), ["home"]),
    ("breakfast", "features", ("Breakfast", "Petit-déjeuner", "فطور الصباح"), ["hotel", "hostel"]),
    ("elevator", "features", ("Elevator", "Ascenseur", "مصعد"), STAYS),
    ("family_friendly", "features", ("Family friendly", "Adapté aux familles", "مناسب للعائلات"), ALL),
    ("sea_view", "location", ("Sea view", "Vue sur mer", "إطلالة على البحر"), ["home", "hotel"]),
    ("beach_access", "location", ("Beach access", "Accès plage", "وصول إلى الشاطئ"), ["home", "hotel", "hostel"]),
    ("city_center", "location", ("City centre", "Centre-ville", "وسط المدينة"), STAYS),
    ("smoke_detector", "safety", ("Smoke detector", "Détecteur de fumée", "كاشف الدخان"), STAYS),
    ("first_aid_kit", "safety", ("First aid kit", "Trousse de secours", "حقيبة إسعافات أولية"), ALL),
    ("fire_extinguisher", "safety", ("Fire extinguisher", "Extincteur", "طفاية حريق"), STAYS + ["vehicle"]),
    ("gps", "features", ("GPS", "GPS", "نظام تحديد المواقع"), ["vehicle"]),
    ("transport_included", "features", ("Transport included", "Transport inclus", "النقل مشمول"), ["experience"]),
]

# (vertical, slug, (en, fr, ar))
PROPERTY_TYPES = [
    ("home", "apartment", ("Apartment", "Appartement", "شقة")),
    ("home", "house", ("House", "Maison", "منزل")),
    ("home", "villa", ("Villa", "Villa", "فيلا")),
    ("home", "studio", ("Studio", "Studio", "استوديو")),
    ("home", "traditional_house", ("Traditional house", "Maison traditionnelle", "دار تقليدية")),
    ("hotel", "hotel", ("Hotel", "Hôtel", "فندق")),
    ("hotel", "resort", ("Resort", "Complexe touristique", "منتجع")),
    ("hotel", "guest_house", ("Guest house", "Maison d'hôtes", "دار ضيافة")),
    ("hostel", "hostel", ("Hostel", "Auberge de jeunesse", "نزل شبابي")),
    ("vehicle", "car", ("Car", "Voiture", "سيارة")),
    ("vehicle", "suv_4x4", ("4x4", "4x4", "رباعية الدفع")),
    ("vehicle", "van", ("Van", "Fourgon", "شاحنة صغيرة")),
    ("experience", "activity", ("Activity", "Activité", "نشاط")),
]

# (vertical, slug, (en, fr, ar))
CATEGORIES = [
    ("home", "beach", ("Beach", "Plage", "شاطئ")),
    ("home", "mountain", ("Mountain", "Montagne", "جبل")),
    ("home", "city", ("City", "Ville", "مدينة")),
    ("home", "desert", ("Desert", "Désert", "صحراء")),
    ("hotel", "business", ("Business", "Affaires", "أعمال")),
    ("hotel", "seaside", ("Seaside", "Bord de mer", "على البحر")),
    ("hostel", "backpackers", ("Backpackers", "Routards", "رحالة")),
    ("vehicle", "city_driving", ("City driving", "Conduite en ville", "القيادة في المدينة")),
    ("vehicle", "off_road", ("Off-road", "Tout-terrain", "الطرق الوعرة")),
    ("experience", "outdoor", ("Outdoor", "Plein air", "في الهواء الطلق")),
    ("experience", "indoor", ("Indoor", "En intérieur", "داخلي")),
]
