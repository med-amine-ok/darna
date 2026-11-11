"""Component schemas for the BLADUS OpenAPI document (generator helper, not part of the repo)."""
import re

STR = {"type": "string"}
UUID = {"type": "string", "format": "uuid"}
DATE = {"type": "string", "format": "date"}
DT = {"type": "string", "format": "date-time"}
INT = {"type": "integer"}
I64 = {"type": "integer", "format": "int64"}
BOOL = {"type": "boolean"}
TIME = {"type": "string", "pattern": "^([01][0-9]|2[0-3]):[0-5][0-9]$", "examples": ["15:00"]}
OBJ = {"type": "object", "additionalProperties": True}


def ref(name):
    return {"$ref": f"#/components/schemas/{name}"}


def d(schema, desc):
    out = dict(schema)
    out["description"] = desc
    return out


def nullable(schema):
    if "$ref" in schema:
        return {"anyOf": [schema, {"type": "null"}]}
    out = dict(schema)
    t = out.get("type")
    if isinstance(t, list):
        if "null" not in t:
            out["type"] = t + ["null"]
    else:
        out["type"] = [t, "null"]
    if "enum" in out:
        out["enum"] = list(out["enum"]) + [None]
    return out


def arr(items, **kw):
    out = {"type": "array", "items": items}
    out.update(kw)
    return out


def obj(props, required=None, desc=None, extra=True):
    out = {"type": "object"}
    if desc:
        out["description"] = desc
    if required:
        out["required"] = required
    out["properties"] = props
    if not extra:
        out["additionalProperties"] = False
    return out


MONEY = ref("Money")
NMONEY = nullable(ref("Money"))

# --------------------------------------------------------------------------
# Enums copied from schema.dbml (parsed, so the values match exactly)
# --------------------------------------------------------------------------
DB_ENUMS = [
    "user_status", "staff_role_code", "staff_status", "host_account_kind", "business_category",
    "verification_status", "membership_role", "invitation_status", "document_type",
    "document_status", "approval_mode", "vertical", "experience_type", "trip_type",
    "listing_status", "booking_unit", "inventory_kind", "booking_status", "payment_status",
    "actor_role", "departure_status", "ledger_account_kind", "ledger_tx_kind", "topup_method",
    "topup_status", "review_status", "conversation_kind", "media_status", "media_bucket",
    "case_kind", "case_status", "case_priority", "flow_status", "dsr_kind",
]


def pascal(name):
    return "".join(p.capitalize() for p in name.split("_"))


def parse_dbml_enums(path):
    text = open(path, encoding="utf-8").read()
    enums = {}
    for m in re.finditer(r"Enum (\w+) \{([^}]*)\}", text):
        vals = [ln.strip() for ln in m.group(2).splitlines() if ln.strip()]
        enums[m.group(1)] = vals
    return enums


ENUM_NOTES = {
    "booking_status": "awaiting_payment is only used when guest payments (models M2 to M4) are switched on. In M1 a booking starts as pending or confirmed (BR-BKG-06).",
    "payment_status": "M1 always uses not_collected; the other values are for the dormant models M2 to M4.",
    "listing_status": "Same set for listings and trips (BR-LST-03, table 4a).",
    "experience_type": "Fixed list of 8 (DEC-015, BR-LST-05). Labels in en/fr/ar come from GET /api/v1/reference.",
    "trip_type": "Fixed list of 8 (DEC-015, BR-LST-05).",
    "vertical": "Trips are not a vertical: they have their own endpoints (DEC-006).",
    "verification_status": "Host account verification states (BR-HST-04, table 3b).",
    "topup_method": "gateway is only used by online top-ups (R2).",
}


def build_schemas(dbml_path):
    enums = parse_dbml_enums(dbml_path)
    S = {}
    for e in DB_ENUMS:
        vals = enums[e]
        desc = f"Matches the `{e}` enum in schema.dbml."
        if e in ENUM_NOTES:
            desc += " " + ENUM_NOTES[e]
        S[pascal(e)] = {"type": "string", "enum": vals, "description": desc, "x-db-enum": e}

    # API-only enums (not database enums)
    S["HostType"] = {"type": "string", "enum": ["individual", "agency", "hotel", "hostel"],
                     "description": "Derived from host_account.kind and organization.business_category. Used by onboarding, commission defaults and filters."}
    S["Locale"] = {"type": "string", "enum": ["en", "fr", "ar"]}
    S["Currency"] = {"type": "string", "enum": ["DZD"], "description": "ISO 4217 code. Only DZD today."}
    S["PriceUnit"] = {"type": "string", "enum": ["night", "day", "person", "seat"],
                      "description": "What base_price is per: night (stays), day (vehicles), person (experiences and trips)."}
    S["HostPermission"] = {"type": "string", "description": "Organisation permission codes (BR-ORG-05, table 2a). An individual host holds all of them for their own host account.",
                           "enum": ["org.edit", "org.delete", "members.manage", "listings.manage", "trips.manage",
                                    "calendar.manage", "bookings.view", "bookings.respond", "bookings.cancel_as_host",
                                    "messages.reply", "wallet.view", "invoices.view", "payout_details.edit"]}
    S["OnboardingFieldType"] = {"type": "string", "description": "Canonical field types (BR-CFG-03).",
                                "enum": ["text", "textarea", "number", "select", "multi_select", "image_upload",
                                         "file_upload", "toggle", "location", "amenities"]}
    S["ExportDataset"] = {"type": "string", "enum": ["hosts", "listings", "trips", "bookings", "users", "reviews", "wallets",
                                                     "ledger", "topups", "refunds", "audit", "kpi"]}
    S["ConsentDocument"] = {"type": "string", "enum": ["terms", "privacy", "marketing"]}

    # ----------------------------------------------------------------------
    # Core building blocks
    # ----------------------------------------------------------------------
    S["Money"] = obj({
        "amount_minor": d(I64, "Amount in centimes (1 DZD = 100 centimes). Prices shown to people are whole dinars, so this is usually a multiple of 100."),
        "currency": ref("Currency"),
    }, ["amount_minor", "currency"], "An amount of money. Never a float (BR-PAY-01, PAY-12).", extra=False)
    S["MoneyInput"] = obj({
        "amount_minor": d({"type": "integer", "format": "int64", "minimum": 1}, "Amount in centimes."),
        "currency": ref("Currency"),
    }, ["amount_minor", "currency"], "Money sent by a client. Must be a positive amount in centimes.", extra=False)
    S["GeoPoint"] = obj({"lat": {"type": "number", "minimum": -90, "maximum": 90},
                         "lng": {"type": "number", "minimum": -180, "maximum": 180}}, ["lat", "lng"], extra=False)
    S["LocalizedText"] = obj({"en": STR, "fr": STR, "ar": STR}, ["en", "fr", "ar"], "The same text in the three languages.")
    S["FieldError"] = obj({
        "field": d(STR, "Dotted path of the field, e.g. `room_types.0.unit_count`. Empty for errors about the whole body."),
        "code": d(STR, "Stable machine code, e.g. `required`, `too_long`, `out_of_range`."),
        "message": d(STR, "Message in the requested language (en, fr or ar)."),
        "params": d(OBJ, "Values used in the message, e.g. {\"max\": 4000}."),
    }, ["field", "code", "message"])
    S["Problem"] = obj({
        "type": d({"type": "string", "format": "uri"}, "Link to the error documentation, e.g. https://api.bladus.dz/errors/dates_unavailable."),
        "title": d(STR, "Short English summary, the same for every occurrence of this code."),
        "status": d({"type": "integer", "minimum": 400, "maximum": 599}, "HTTP status code."),
        "code": d(STR, "Stable error code the apps map to their own text (BR-SYS-04, NFR-13). See 06-api-design.md section 3.7."),
        "detail": d(STR, "Human explanation in English for developers and logs."),
        "message": d(STR, "Explanation in the language asked by Accept-Language (en, fr, ar). Safe to show to the user."),
        "instance": d(STR, "Path of the request that failed."),
        "request_id": d(STR, "Correlation id, also sent as the X-Request-Id response header."),
        "errors": d(arr(ref("FieldError")), "One item per invalid field (422)."),
    }, ["type", "title", "status", "code", "message"],
        "Error body in the RFC 9457 (Problem Details) style, extended with a stable code and a localized message. Extra members may be added for some codes, e.g. `quote` for `price_changed` or `required_permission` for `permission_denied`.")
    S["CursorMeta"] = obj({
        "next_cursor": d(nullable(STR), "Opaque value to pass as `cursor` to get the next items. Null when there is nothing more."),
        "has_more": BOOL,
    }, ["next_cursor", "has_more"])
    S["PageMeta"] = obj({
        "page": {"type": "integer", "minimum": 1},
        "page_size": {"type": "integer", "minimum": 1, "maximum": 100},
        "total_count": d(INT, "Number of rows matching the filters (all pages)."),
        "total_pages": INT,
    }, ["page", "page_size", "total_count", "total_pages"])
    S["FacetBucket"] = obj({"value": STR, "label": STR, "count": INT}, ["value", "count"])
    S["Facets"] = {"type": "object", "additionalProperties": arr(ref("FacetBucket")),
                   "description": "Counts per filter value, keyed by filter name. Each facet is counted without its own filter (BR-SRC-01)."}
    S["UserRef"] = obj({"id": UUID, "display_name": STR, "avatar_url": nullable({"type": "string", "format": "uri"})}, ["id", "display_name"],
                       "A person as shown to others. Never contains contact details.")
    S["CommuneRef"] = obj({"id": INT, "name": STR, "wilaya_code": INT, "wilaya_name": STR}, ["id", "name", "wilaya_code", "wilaya_name"])
    S["PhotoRef"] = obj({"media_id": UUID, "url": {"type": "string", "format": "uri"}, "thumb_url": {"type": "string", "format": "uri"},
                         "caption": nullable(STR), "is_cover": BOOL, "width": nullable(INT), "height": nullable(INT)}, ["media_id", "url"])
    S["StatusChange"] = obj({
        "reason_code": d(nullable(STR), "Code from GET /api/v1/reference/reasons."),
        "note": d(nullable({"type": "string", "maxLength": 2000}), "Free text. At least 10 characters when the action requires a reason (BR-HST-04)."),
    })

    # ----------------------------------------------------------------------
    # Accounts
    # ----------------------------------------------------------------------
    S["Session"] = obj({
        "status": {"type": "string", "enum": ["authenticated", "pending_flow"]},
        "user": nullable(ref("Me")),
        "pending_flows": d(arr(obj({"id": {"type": "string", "enum": ["verify_email", "verify_phone", "login_by_code", "mfa_authenticate", "password_reset_by_code"]}, "is_pending": BOOL}, ["id"])),
                           "Next steps still needed, e.g. a phone code or a second factor."),
        "session_token": d(STR, "allauth headless session token. Only returned to the Next.js server (BFF), which keeps it in an httpOnly cookie. Never sent to the browser."),
        "expires_at": nullable(DT),
    }, ["status"], "Summary of django-allauth headless responses. The exact envelope follows allauth's own OpenAPI file.")
    S["LoginRequest"] = obj({
        "email": {"type": "string", "format": "email", "maxLength": 254},
        "phone": d({"type": "string", "pattern": "^\\+[1-9][0-9]{6,14}$"}, "E.164 phone. Algerian mobiles: +213 then 5, 6 or 7 then 8 digits."),
        "password": {"type": "string", "maxLength": 256},
    }, ["password"], "Either email or phone, plus password.")
    S["SignupRequest"] = obj({
        "email": {"type": "string", "format": "email", "maxLength": 254},
        "phone": {"type": "string", "pattern": "^\\+[1-9][0-9]{6,14}$"},
        "password": {"type": "string", "minLength": 8, "maxLength": 256},
        "first_name_latin": {"type": "string", "maxLength": 80},
        "last_name_latin": {"type": "string", "maxLength": 80},
        "full_name_ar": {"type": "string", "maxLength": 160},
        "preferred_locale": ref("Locale"),
        "terms_version": d(STR, "Version of the terms accepted on the form (PRV-01)."),
        "privacy_version": STR,
        "marketing_opt_in": BOOL,
    }, ["password", "terms_version", "privacy_version"], "Email or phone is required (at least one).")
    S["CodeRequest"] = obj({"phone": {"type": "string", "pattern": "^\\+[1-9][0-9]{6,14}$"}, "email": {"type": "string", "format": "email"}},
                           None, "Where to send a 6-digit one-time code (BR-ACC-02).")
    S["CodeConfirm"] = obj({"code": {"type": "string", "pattern": "^[0-9]{6}$"}}, ["code"])
    S["PasswordResetRequest"] = obj({"email": {"type": "string", "format": "email"}, "phone": STR})
    S["PasswordReset"] = obj({"key": d(STR, "Reset key from the email link, or the 6-digit code sent by SMS."), "password": {"type": "string", "minLength": 8, "maxLength": 256}}, ["key", "password"])
    S["PasswordChange"] = obj({"current_password": {"type": "string", "maxLength": 256}, "new_password": {"type": "string", "minLength": 8, "maxLength": 256}}, ["current_password", "new_password"])
    S["MfaAuthenticate"] = obj({"code": d(STR, "6-digit TOTP code or a recovery code.")}, ["code"])
    S["Authenticator"] = obj({"id": STR, "type": {"type": "string", "enum": ["totp", "webauthn", "recovery_codes"]}, "created_at": DT, "last_used_at": nullable(DT)}, ["id", "type"])
    S["TotpSetup"] = obj({"secret": STR, "totp_url": STR}, ["secret", "totp_url"], "Returned by GET before enrolment; the app shows it as a QR code.")
    S["Me"] = obj({
        "id": UUID,
        "email": nullable({"type": "string", "format": "email"}),
        "email_verified": BOOL,
        "phone_e164": nullable(STR),
        "phone_verified": d(BOOL, "Must be true before the first booking (DEC-012)."),
        "first_name_latin": nullable(STR),
        "last_name_latin": nullable(STR),
        "full_name_ar": nullable(STR),
        "display_name": STR,
        "avatar": nullable(ref("PhotoRef")),
        "bio": nullable(STR),
        "spoken_languages": arr(STR),
        "home_commune_id": nullable(INT),
        "address_line": d(nullable(STR), "Private: only in this response, never in public views."),
        "preferred_locale": ref("Locale"),
        "status": ref("UserStatus"),
        "has_mfa": BOOL,
        "is_host": d(BOOL, "True when the user holds at least one host account (own or through a membership)."),
        "active_host_account_id": d(nullable(UUID), "Active workspace stored in the session (ORG-02)."),
        "date_joined": DT,
    }, ["id", "display_name", "email_verified", "phone_verified", "preferred_locale", "status", "is_host"], "The signed-in user (private view).")
    S["MeUpdate"] = obj({
        "first_name_latin": {"type": "string", "maxLength": 80},
        "last_name_latin": {"type": "string", "maxLength": 80},
        "full_name_ar": {"type": "string", "maxLength": 160},
        "avatar_media_id": nullable(UUID),
        "bio": {"type": "string", "maxLength": 500},
        "spoken_languages": arr({"type": "string", "pattern": "^[a-z]{2}$"}),
        "home_commune_id": nullable(INT),
        "address_line": nullable({"type": "string", "maxLength": 255}),
        "preferred_locale": ref("Locale"),
    }, None, "Changing email or phone is not done here: use the verification endpoints (ACC-06).", extra=False)
    S["PhoneChange"] = obj({"phone": {"type": "string", "pattern": "^\\+[1-9][0-9]{6,14}$"}}, ["phone"])
    S["PublicUser"] = obj({
        "id": UUID, "display_name": STR, "avatar_url": nullable({"type": "string", "format": "uri"}),
        "joined_year": INT, "is_host": BOOL, "identity_verified": BOOL,
        "host_rating_avg": nullable({"type": "number"}), "host_review_count": INT,
        "organizations": arr(obj({"slug": STR, "display_name": STR, "role": ref("MembershipRole")}, ["slug", "display_name"])),
    }, ["id", "display_name", "joined_year", "is_host"], "Public profile. No email, phone or address.")
    S["Consent"] = obj({"document": ref("ConsentDocument"), "version": STR, "accepted": BOOL, "created_at": DT}, ["document", "version", "accepted", "created_at"])
    S["ConsentCreate"] = obj({"document": ref("ConsentDocument"), "version": STR, "accepted": BOOL}, ["document", "version", "accepted"], extra=False)
    S["Favorite"] = obj({
        "target_type": {"type": "string", "enum": ["listing", "trip"]},
        "listing": nullable(ref("ListingCard")), "trip": nullable(ref("TripCard")),
        "is_available": d(BOOL, "False when the item is no longer published; it stays in the list but cannot be booked."),
        "created_at": DT,
    }, ["target_type", "is_available", "created_at"])
    S["Notification"] = obj({
        "id": I64, "kind": d(STR, "e.g. booking.requested, booking.confirmed, verification.approved, wallet.negative."),
        "title": d(STR, "Localized title."), "body": d(STR, "Localized body."),
        "params": OBJ, "link": nullable(STR), "read_at": nullable(DT), "created_at": DT,
    }, ["id", "kind", "title", "body", "created_at"])
    S["NotificationPreference"] = obj({"kind": STR, "channel": {"type": "string", "enum": ["email", "sms", "push"]}, "enabled": BOOL,
                                       "locked": d(BOOL, "True for critical messages that cannot be switched off (BR-PRV-03).")}, ["kind", "channel", "enabled"])
    S["DataSubjectRequest"] = obj({"id": UUID, "kind": ref("DsrKind"), "status": {"type": "string", "enum": ["open", "in_progress", "completed", "rejected"]},
                                   "due_at": DT, "created_at": DT, "completed_at": nullable(DT), "export_url": nullable({"type": "string", "format": "uri"})},
                                  ["id", "kind", "status", "due_at", "created_at"])
    S["DataSubjectRequestCreate"] = obj({"kind": ref("DsrKind"), "notes": {"type": "string", "maxLength": 2000}}, ["kind"])

    # ----------------------------------------------------------------------
    # Geography and reference data
    # ----------------------------------------------------------------------
    S["Wilaya"] = obj({"code": {"type": "integer", "minimum": 1, "maximum": 69}, "name": d(STR, "Name in the requested language."),
                       "name_fr": STR, "name_ar": STR, "name_en": STR, "region": nullable({"type": "string", "enum": ["north", "high_plateaus", "south"]}),
                       "legacy_code_58": nullable(INT), "centroid": nullable(ref("GeoPoint"))}, ["code", "name", "name_fr", "name_ar", "name_en"])
    S["Commune"] = obj({"id": INT, "name": STR, "name_fr": STR, "name_ar": STR, "name_en": STR, "wilaya_code": INT, "wilaya_name": STR,
                        "postal_code": nullable(STR), "centroid": nullable(ref("GeoPoint"))}, ["id", "name", "wilaya_code", "wilaya_name"])
    S["LabeledValue"] = obj({"id": STR, "label": STR, "labels": ref("LocalizedText")}, ["id", "label"])
    S["Amenity"] = obj({"id": UUID, "slug": STR, "group": {"type": "string", "enum": ["essentials", "features", "location", "safety"]},
                        "label": STR, "icon": nullable(STR), "applies_to": arr(ref("Vertical")), "is_active": BOOL}, ["id", "slug", "group", "label", "applies_to"])
    S["PropertyType"] = obj({"id": UUID, "vertical": ref("Vertical"), "slug": STR, "label": STR, "is_active": BOOL}, ["id", "vertical", "slug", "label"])
    S["Category"] = obj({"id": UUID, "vertical": ref("Vertical"), "slug": STR, "label": STR, "labels": ref("LocalizedText"), "icon": nullable(STR),
                         "sort_order": INT, "is_active": BOOL, "listing_count": d(INT, "Only in admin responses.")}, ["id", "vertical", "slug", "label"])
    S["CancellationWindow"] = obj({"min_days_before": INT, "refund_bp": {"type": "integer", "minimum": 0, "maximum": 10000}}, ["min_days_before", "refund_bp"])
    S["CancellationPolicy"] = obj({"code": {"type": "string", "enum": ["flexible", "moderate", "strict"]}, "version": INT, "label": STR,
                                   "windows": arr(ref("CancellationWindow"))}, ["code", "version", "label", "windows"])
    S["ReasonCode"] = obj({"id": UUID, "action": STR, "code": STR, "label": STR, "host_text": nullable(STR)}, ["id", "action", "code", "label"])
    S["ReferenceData"] = obj({
        "version": d(STR, "Changes when any list changes; also sent as ETag."),
        "verticals": arr(ref("LabeledValue")),
        "experience_types": d(arr(ref("LabeledValue")), "The 8 experience types in display order (DEC-015)."),
        "trip_types": d(arr(ref("LabeledValue")), "The 8 trip types in display order (DEC-015)."),
        "amenities": arr(ref("Amenity")),
        "property_types": arr(ref("PropertyType")),
        "categories": arr(ref("Category")),
        "cancellation_policies": arr(ref("CancellationPolicy")),
        "host_offer_rules": d({"type": "object", "additionalProperties": arr(STR)},
                              "What each host type may publish (DEC-014): individual [home, vehicle], agency [experience, trip], hotel [hotel], hostel [hostel]."),
        "locales": arr(ref("Locale")),
    }, ["version", "verticals", "experience_types", "trip_types", "amenities", "property_types", "categories", "cancellation_policies", "host_offer_rules"])

    # ----------------------------------------------------------------------
    # Catalogue
    # ----------------------------------------------------------------------
    S["HostSummary"] = obj({
        "host_account_id": UUID, "kind": ref("HostAccountKind"), "host_type": ref("HostType"),
        "display_name": STR, "avatar_url": nullable({"type": "string", "format": "uri"}),
        "organization_slug": nullable(STR), "verified": BOOL,
        "rating_avg": nullable({"type": "number"}), "review_count": INT, "joined_year": INT,
    }, ["host_account_id", "kind", "host_type", "display_name", "verified"])
    S["MatchedAvailability"] = obj({"full_match": d(BOOL, "True when every searched night is free."),
                                    "from": DATE, "to": d(DATE, "Exclusive end (check-out day).")}, ["full_match", "from", "to"],
                                   "Largest free sub-range inside the searched dates (BR-AVL-05).")
    S["ListingCard"] = obj({
        "id": UUID, "reference": d(STR, "Human reference, e.g. LST-7K2M9Q."), "vertical": ref("Vertical"),
        "experience_type": nullable(ref("ExperienceType")), "title": STR,
        "property_type": nullable(STR), "commune": ref("CommuneRef"),
        "location_public": d(ref("GeoPoint"), "Fuzzed point (up to 500 m), never the exact address (BR-SRC-03)."),
        "cover_photo": nullable(ref("PhotoRef")), "price_from": MONEY, "price_unit": ref("PriceUnit"),
        "rating_avg": nullable({"type": "number"}), "review_count": INT,
        "instant_bookable": BOOL, "host_type": ref("HostType"),
        "matched_availability": nullable(ref("MatchedAvailability")),
        "quoted_total": d(NMONEY, "Indicative total for the searched dates and guests. The real price comes from POST /quotes."),
        "is_favorite": d(nullable(BOOL), "Null for anonymous visitors."),
    }, ["id", "reference", "vertical", "title", "commune", "location_public", "price_from", "price_unit", "review_count", "instant_bookable", "host_type"])
    S["MapPin"] = obj({"id": UUID, "vertical": ref("Vertical"), "location_public": ref("GeoPoint"), "price_from": MONEY, "title": STR}, ["id", "vertical", "location_public", "price_from"])
    S["VehicleDetail"] = obj({"make": STR, "model": STR, "year": INT, "seats": INT,
                              "transmission": {"type": "string", "enum": ["manual", "automatic"]}, "fuel": STR,
                              "daily_km_limit": nullable(INT), "driver_min_age": INT, "licence_min_years": INT,
                              "security_deposit": NMONEY}, ["make", "model", "year", "seats", "transmission", "fuel"])
    S["ExperienceDetail"] = obj({"duration_minutes": INT, "languages": arr(STR), "meeting_point": nullable(ref("GeoPoint")),
                                 "meeting_point_text": nullable(STR), "max_group": INT, "includes": arr(STR)}, ["duration_minutes", "languages", "max_group"])
    S["RoomType"] = obj({
        "id": UUID, "name": STR, "description": nullable(STR), "booking_unit": ref("BookingUnit"),
        "unit_count": d({"type": "integer", "minimum": 1}, "Rooms or beds of this type (inventory total)."),
        "capacity_per_unit": {"type": "integer", "minimum": 1}, "base_price": MONEY,
        "beds_description": nullable(STR), "sort_order": INT, "is_active": BOOL,
        "amenity_ids": arr(UUID), "photos": arr(ref("PhotoRef")),
    }, ["id", "name", "booking_unit", "unit_count", "capacity_per_unit", "base_price"])
    S["RoomTypeWrite"] = obj({
        "name": {"type": "string", "maxLength": 80}, "description": STR, "booking_unit": ref("BookingUnit"),
        "unit_count": {"type": "integer", "minimum": 1}, "capacity_per_unit": {"type": "integer", "minimum": 1},
        "base_price": ref("MoneyInput"), "beds_description": {"type": "string", "maxLength": 120},
        "sort_order": INT, "is_active": BOOL, "amenity_ids": arr(UUID),
        "photo_media_ids": d(arr(UUID), "Ordered; minimum 3 photos per room type before submission (BR-MED-01)."),
    }, ["name", "booking_unit", "unit_count", "capacity_per_unit", "base_price"])
    S["ListingDetail"] = {"allOf": [ref("ListingCard"), obj({
        "description": STR, "source_language": ref("Locale"),
        "photos": arr(ref("PhotoRef")), "amenities": arr(ref("Amenity")),
        "capacity_guests": INT, "bedrooms": nullable(INT), "beds": nullable(INT), "bathrooms": nullable({"type": "number"}),
        "surface_m2": nullable(INT), "check_in_time": nullable(TIME), "check_out_time": nullable(TIME),
        "min_nights": INT, "max_nights": INT, "advance_notice_days": INT,
        "cleaning_fee": MONEY, "weekly_discount_bp": INT, "monthly_discount_bp": INT,
        "house_rules": OBJ, "cancellation_policy": ref("CancellationPolicy"),
        "approval_mode": d(ref("ApprovalMode"), "Resolved mode (BR-BKG-02): what will happen when the guest books."),
        "room_types": arr(ref("RoomType")), "vehicle": nullable(ref("VehicleDetail")), "experience": nullable(ref("ExperienceDetail")),
        "host": ref("HostSummary"),
        "address_line": d(nullable(STR), "Only for the host and for a guest with a confirmed booking (BR-SRC-03). Null otherwise."),
        "location_exact": d(nullable(ref("GeoPoint")), "Same visibility as address_line."),
    }, ["description", "photos", "amenities", "capacity_guests", "min_nights", "max_nights", "cleaning_fee", "cancellation_policy", "approval_mode", "host"])],
        "description": "Public listing page. Only published listings of approved hosts (BR-SRC-01)."}
    S["AvailabilityNight"] = obj({"date": DATE, "available": BOOL,
                                  "reason": nullable({"type": "string", "enum": ["booked", "blocked", "outside_window", "advance_notice", "past"]}),
                                  "units_left": d(nullable(INT), "For pooled inventory (rooms, beds)."), "price": MONEY}, ["date", "available", "price"])
    S["ExperienceSlot"] = obj({"id": UUID, "starts_at": DT, "ends_at": DT, "seats_total": INT, "seats_left": INT, "price": MONEY, "is_cancelled": BOOL},
                              ["id", "starts_at", "ends_at", "seats_total", "seats_left", "price"])
    S["ExperienceSlotWrite"] = obj({"starts_at": DT, "ends_at": DT, "seats_total": {"type": "integer", "minimum": 1},
                                    "price_override": nullable(ref("MoneyInput"))}, ["starts_at", "ends_at", "seats_total"])
    S["HostExperienceSlot"] = {"allOf": [ref("ExperienceSlot"), obj({"seats_held": INT, "seats_booked": INT}, ["seats_held", "seats_booked"])]}
    S["Availability"] = obj({
        "listing_id": UUID, "inventory_kind": ref("InventoryKind"), "today": d(DATE, "Today in Africa/Algiers."),
        "from": DATE, "to": DATE, "room_type_id": nullable(UUID),
        "min_nights": INT, "max_nights": INT, "advance_notice_days": INT,
        "nights": d(arr(ref("AvailabilityNight")), "For single and room_pool inventory."),
        "slots": d(arr(ref("ExperienceSlot")), "For experiences (slot inventory)."),
    }, ["listing_id", "inventory_kind", "today", "from", "to"])

    # Trips
    S["TripCard"] = obj({
        "id": UUID, "reference": STR, "slug": STR, "trip_type": ref("TripType"), "title": STR, "duration_days": INT,
        "start_commune": ref("CommuneRef"), "cover_photo": nullable(ref("PhotoRef")),
        "price_from": d(MONEY, "Lowest price per person over upcoming departures."),
        "next_departure_on": nullable(DATE), "rating_avg": nullable({"type": "number"}), "review_count": INT,
        "organization": obj({"slug": STR, "display_name": STR, "verified": BOOL}, ["slug", "display_name", "verified"]),
        "is_favorite": nullable(BOOL),
    }, ["id", "reference", "trip_type", "title", "duration_days", "start_commune", "price_from", "review_count", "organization"])
    S["ItineraryDay"] = obj({"day_number": {"type": "integer", "minimum": 1}, "title": {"type": "string", "maxLength": 120},
                             "description": nullable(STR), "overnight_commune_id": nullable(INT)}, ["day_number", "title"])
    S["Departure"] = obj({"id": UUID, "starts_on": DATE, "ends_on": DATE, "seats_total": INT, "seats_left": INT,
                          "price_per_person": MONEY, "status": ref("DepartureStatus")},
                         ["id", "starts_on", "ends_on", "seats_total", "seats_left", "price_per_person", "status"])
    S["HostDeparture"] = {"allOf": [ref("Departure"), obj({"seats_held": INT, "seats_booked": INT, "guide_membership_id": nullable(UUID),
                                                           "price_override": NMONEY, "booking_count": INT}, ["seats_held", "seats_booked"])]}
    S["DepartureWrite"] = obj({"starts_on": DATE, "ends_on": DATE, "seats_total": {"type": "integer", "minimum": 1},
                               "price_per_person": d(nullable(ref("MoneyInput")), "Null = trip price."),
                               "status": d({"type": "string", "enum": ["scheduled", "guaranteed"]}, "Cancelling uses the cancel endpoint."),
                               "guide_membership_id": nullable(UUID)}, ["starts_on", "ends_on", "seats_total"])
    S["TripDetail"] = {"allOf": [ref("TripCard"), obj({
        "description": STR, "source_language": ref("Locale"), "group_min": INT, "group_max": INT,
        "inclusions": arr(STR), "exclusions": arr(STR), "itinerary": arr(ref("ItineraryDay")),
        "meeting_point": nullable(ref("GeoPoint")), "meeting_point_text": nullable(STR),
        "cancellation_policy": ref("CancellationPolicy"), "approval_mode": ref("ApprovalMode"),
        "photos": arr(ref("PhotoRef")), "departures": d(arr(ref("Departure")), "Upcoming departures only."),
        "host": ref("HostSummary"),
    }, ["description", "group_min", "group_max", "inclusions", "exclusions", "itinerary", "cancellation_policy", "approval_mode", "photos", "departures", "host"])]}
    S["TripWrite"] = obj({
        "trip_type": ref("TripType"), "title": {"type": "string", "maxLength": 140}, "description": STR,
        "source_language": ref("Locale"), "duration_days": {"type": "integer", "minimum": 1},
        "group_min": {"type": "integer", "minimum": 1}, "group_max": {"type": "integer", "minimum": 1},
        "price_per_person": ref("MoneyInput"), "inclusions": arr(STR), "exclusions": arr(STR),
        "start_commune_id": INT, "meeting_point": nullable(ref("GeoPoint")), "meeting_point_text": nullable(STR),
        "cancellation_policy_code": {"type": "string", "enum": ["flexible", "moderate", "strict"]},
        "approval_mode": nullable(ref("ApprovalMode")), "itinerary": arr(ref("ItineraryDay")),
        "photo_media_ids": arr(UUID),
    }, ["trip_type", "title", "description", "source_language", "duration_days", "group_max", "price_per_person", "start_commune_id", "cancellation_policy_code"],
        "PATCH accepts any subset. group_min <= group_max; price 100 to 10,000,000 DZD.")
    S["HostTrip"] = {"allOf": [ref("TripDetail"), obj({"status": ref("ListingStatus"), "status_reason": nullable(STR),
                                                       "open_change_requests": arr(ref("ChangeRequestItem")),
                                                       "created_at": DT, "updated_at": DT, "published_at": nullable(DT)}, ["status", "created_at", "updated_at"])]}

    # Organisation public
    S["PublicOrganization"] = obj({
        "id": UUID, "host_account_id": UUID, "slug": STR, "display_name": STR, "business_category": ref("BusinessCategory"),
        "description": nullable(STR), "logo_url": nullable({"type": "string", "format": "uri"}), "cover_url": nullable({"type": "string", "format": "uri"}),
        "verified": BOOL, "rating_avg": nullable({"type": "number"}), "review_count": INT, "commune": nullable(ref("CommuneRef")),
        "star_rating": nullable(INT), "check_in_time": nullable(TIME), "check_out_time": nullable(TIME),
        "team": arr(ref("UserRef")),
    }, ["id", "host_account_id", "slug", "display_name", "business_category", "verified", "review_count"],
        "Never contains legal numbers (RC, NIF, NIS, licence) or staff phones (ORG-07).")

    # Quotes and bookings
    S["PriceLine"] = obj({
        "kind": {"type": "string", "enum": ["night", "day", "seat", "discount", "cleaning_fee", "tourist_tax", "vat", "coupon"]},
        "label": d(STR, "Localized label."), "date": nullable(DATE), "quantity": INT,
        "unit_amount": MONEY, "amount": d(MONEY, "Rounded half up; totals are sums of rounded lines (BR-PAY-01)."),
    }, ["kind", "label", "quantity", "unit_amount", "amount"])
    S["QuoteRequest"] = obj({
        "listing_id": nullable(UUID), "room_type_id": nullable(UUID), "experience_slot_id": nullable(UUID),
        "trip_departure_id": nullable(UUID),
        "check_in": d(nullable(DATE), "Stays and vehicles."), "check_out": d(nullable(DATE), "Exclusive."),
        "guests_adults": {"type": "integer", "minimum": 1}, "guests_children": {"type": "integer", "minimum": 0},
        "units": d({"type": "integer", "minimum": 1}, "Rooms, beds or seats. For hostel beds one unit per guest (BR-AVL-03)."),
        "coupon_code": d(nullable(STR), "R2 (PRM-01). Ignored while coupons are off."),
    }, ["guests_adults"], "Exactly one target: listing_id (+ room_type_id or experience_slot_id when needed) or trip_departure_id.")
    S["Quote"] = obj({
        "id": UUID, "expires_at": d(DT, "Created + 30 minutes (BR-PRC-01)."),
        "listing_id": nullable(UUID), "room_type_id": nullable(UUID), "experience_slot_id": nullable(UUID), "trip_departure_id": nullable(UUID),
        "check_in": nullable(DATE), "check_out": nullable(DATE), "nights": nullable(INT),
        "guests_adults": INT, "guests_children": INT, "units": INT,
        "lines": arr(ref("PriceLine")), "subtotal": MONEY, "discount": MONEY, "cleaning_fee": MONEY, "taxes": MONEY, "total": MONEY,
        "platform_fee": d(MONEY, "Always 0: guests never pay a BLADUS fee (PRC-02)."),
        "approval_mode": d(ref("ApprovalMode"), "What booking will do: confirm at once or send a request (BR-BKG-01, BR-BKG-02)."),
        "cancellation_policy": ref("CancellationPolicy"),
    }, ["id", "expires_at", "guests_adults", "guests_children", "units", "lines", "subtotal", "discount", "cleaning_fee", "taxes", "total", "platform_fee", "approval_mode", "cancellation_policy"])
    S["BookingCreate"] = obj({
        "quote_id": d(UUID, "A quote that has not expired. The server recomputes it; if the price changed, 409 price_changed returns the new quote."),
        "guest_message": {"type": "string", "maxLength": 4000},
        "terms_version": d(STR, "Version of the booking terms the guest accepted."),
    }, ["quote_id"], extra=False)
    S["RefundLine"] = obj({"id": UUID, "amount": MONEY, "kind": {"type": "string", "enum": ["policy", "host_cancel", "staff", "dispute"]},
                           "settlement": {"type": "string", "enum": ["owed_by_host", "settled_confirmed", "via_gateway"]},
                           "reason": nullable(STR), "created_at": DT}, ["id", "amount", "kind", "settlement", "created_at"])
    S["BookingBase"] = obj({
        "id": UUID, "reference": d(STR, "BLD-YYYY-XXXXXX (BKG-08)."), "status": ref("BookingStatus"), "payment_status": ref("PaymentStatus"),
        "inventory_kind": ref("InventoryKind"), "vertical": nullable(ref("Vertical")),
        "listing_id": nullable(UUID), "trip_id": nullable(UUID), "room_type_id": nullable(UUID),
        "experience_slot_id": nullable(UUID), "trip_departure_id": nullable(UUID),
        "title": d(STR, "From the snapshot taken at creation (BR-BKG-07)."), "cover_photo": nullable(ref("PhotoRef")),
        "check_in": DATE, "check_out": DATE, "check_in_at": DT, "check_out_at": DT,
        "guests_adults": INT, "guests_children": INT, "units": INT,
        "approval_mode_applied": ref("ApprovalMode"), "request_expires_at": nullable(DT),
        "price_lines": arr(ref("PriceLine")), "subtotal": MONEY, "discount": MONEY, "cleaning_fee": MONEY, "taxes": MONEY, "total": MONEY,
        "refund_due": d(MONEY, "Total owed back to the guest so far. In M1 the host owes it (BR-CAN-02 to BR-CAN-04)."),
        "refunds": arr(ref("RefundLine")),
        "cancellation_policy": ref("CancellationPolicy"),
        "conversation_id": nullable(UUID),
        "created_at": DT, "confirmed_at": nullable(DT), "completed_at": nullable(DT), "cancelled_at": nullable(DT),
        "cancelled_by_role": nullable(ref("ActorRole")),
    }, ["id", "reference", "status", "payment_status", "inventory_kind", "title", "check_in", "check_out", "check_in_at", "check_out_at",
        "guests_adults", "guests_children", "units", "approval_mode_applied", "price_lines", "subtotal", "discount", "cleaning_fee", "taxes", "total",
        "refund_due", "cancellation_policy", "created_at"])
    S["GuestBooking"] = {"allOf": [ref("BookingBase"), obj({
        "host": ref("HostSummary"),
        "address_line": d(nullable(STR), "Revealed only when the booking is confirmed (BR-SRC-03)."),
        "location_exact": nullable(ref("GeoPoint")),
        "host_phone_e164": d(nullable(STR), "Revealed only when confirmed."),
        "can_cancel": BOOL, "can_review": BOOL, "review_deadline": nullable(DT),
    }, ["host", "can_cancel", "can_review"])], "description": "A booking as the guest sees it."}
    S["HostBooking"] = {"allOf": [ref("BookingBase"), obj({
        "host_account_id": UUID,
        "guest": ref("UserRef"),
        "guest_phone_e164": d(nullable(STR), "Only when confirmed, and only to roles with bookings.view."),
        "guest_message": nullable(STR),
        "commission": d(nullable(obj({"rate_bp": INT, "base": MONEY, "amount": MONEY, "reversed": MONEY}, ["rate_bp", "base", "amount", "reversed"])),
                        "Hidden (null) for roles without wallet.view (agents and guides never see money, BR-ORG-05)."),
        "allowed_actions": arr({"type": "string", "enum": ["accept", "decline", "cancel", "message", "review_guest"]}),
    }, ["host_account_id", "guest", "allowed_actions"])], "description": "A booking as the host workspace sees it."}
    S["CancellationPreview"] = obj({
        "policy_code": STR, "days_before_check_in": INT, "refund_percent_bp": INT,
        "refund_amount": MONEY, "kept_by_host": MONEY, "commission_returned_to_host": d(MONEY, "Shown to hosts only; 0 in guest responses."),
        "allowed": BOOL, "not_allowed_code": nullable(STR),
    }, ["policy_code", "days_before_check_in", "refund_percent_bp", "refund_amount", "kept_by_host", "allowed"],
        "What a cancellation would refund now (BR-CAN-01, BR-CAN-02). Pure calculation, nothing is changed.")
    S["GuestCancel"] = obj({"reason_code": nullable(STR), "note": {"type": "string", "maxLength": 2000},
                            "expected_refund_minor": d(nullable(I64), "Optional. If given and the refund changed since the preview, 409 refund_changed.")})
    S["HostDecline"] = obj({"reason_code": d(STR, "Required (BR-BKG-03)."), "note": {"type": "string", "maxLength": 2000}}, ["reason_code"])
    S["HostCancel"] = obj({"reason_code": STR, "note": {"type": "string", "minLength": 10, "maxLength": 2000}}, ["reason_code", "note"])
    S["HostAccept"] = obj({"message_to_guest": {"type": "string", "maxLength": 4000}})
    S["DisputeCreate"] = obj({"reason_code": STR, "statement": {"type": "string", "minLength": 20, "maxLength": 4000}, "media_ids": arr(UUID)}, ["reason_code", "statement"])
    S["Dispute"] = obj({"id": UUID, "booking_id": UUID, "opened_by_role": ref("ActorRole"), "reason_code": nullable(STR),
                        "guest_statement": nullable(STR), "host_statement": nullable(STR),
                        "outcome": nullable({"type": "string", "enum": ["refund_full", "refund_partial", "declined"]}),
                        "refund": NMONEY, "resolution_note": nullable(STR), "resolved_at": nullable(DT), "created_at": DT},
                       ["id", "booking_id", "opened_by_role", "created_at"])
    S["Payment"] = obj({"id": UUID, "booking_id": UUID, "provider": STR, "checkout_url": {"type": "string", "format": "uri"}, "amount": MONEY,
                        "status": STR, "created_at": DT}, ["id", "booking_id", "provider", "amount", "status"], "DORMANT (models M2 to M4).")

    # Reviews
    S["Review"] = obj({
        "id": UUID, "author": ref("UserRef"), "author_role": ref("ActorRole"),
        "listing_id": nullable(UUID), "trip_id": nullable(UUID), "host_account_id": UUID,
        "rating_overall": {"type": "integer", "minimum": 1, "maximum": 5},
        "rating_cleanliness": nullable(INT), "rating_accuracy": nullable(INT), "rating_communication": nullable(INT),
        "rating_location": nullable(INT), "rating_value": nullable(INT),
        "comment": STR, "language": ref("Locale"), "status": ref("ReviewStatus"),
        "stay_month": d(nullable(STR), "e.g. 2026-08. Never the exact dates."),
        "published_at": nullable(DT),
        "reply": nullable(obj({"body": STR, "created_at": DT, "editable_until": DT}, ["body", "created_at"])),
    }, ["id", "author", "author_role", "host_account_id", "rating_overall", "comment", "language", "status"])
    S["ReviewCreate"] = obj({
        "rating_overall": {"type": "integer", "minimum": 1, "maximum": 5},
        "rating_cleanliness": {"type": "integer", "minimum": 1, "maximum": 5},
        "rating_accuracy": {"type": "integer", "minimum": 1, "maximum": 5},
        "rating_communication": {"type": "integer", "minimum": 1, "maximum": 5},
        "rating_location": {"type": "integer", "minimum": 1, "maximum": 5},
        "rating_value": {"type": "integer", "minimum": 1, "maximum": 5},
        "comment": {"type": "string", "minLength": 20, "maxLength": 4000}, "language": ref("Locale"),
    }, ["rating_overall", "rating_cleanliness", "rating_accuracy", "rating_communication", "rating_location", "rating_value", "comment", "language"], extra=False)
    S["ReviewReply"] = obj({"body": {"type": "string", "minLength": 2, "maxLength": 2000}}, ["body"], extra=False)
    S["ReviewReport"] = obj({"reason_code": STR, "note": {"type": "string", "maxLength": 2000}}, ["reason_code"])
    S["RatingSummary"] = obj({"rating_avg": nullable({"type": "number"}), "review_count": INT,
                              "sub_ratings": {"type": "object", "additionalProperties": {"type": "number"}}}, ["review_count"])

    # Messaging
    S["Conversation"] = obj({
        "id": UUID, "kind": ref("ConversationKind"),
        "my_role": {"type": "string", "enum": ["guest", "host_member", "staff"]},
        "host_account_id": nullable(UUID),
        "subject": obj({"listing_id": nullable(UUID), "trip_id": nullable(UUID), "booking_id": nullable(UUID),
                        "booking_reference": nullable(STR), "title": STR, "photo": nullable(ref("PhotoRef"))}, ["title"]),
        "other_party": ref("UserRef"),
        "last_message": nullable(obj({"id": I64, "preview": STR, "created_at": DT, "sender_is_me": BOOL}, ["id", "preview", "created_at", "sender_is_me"])),
        "last_read_message_id": nullable(I64), "unread_count": INT, "muted": BOOL, "last_message_at": nullable(DT),
    }, ["id", "kind", "my_role", "subject", "other_party", "unread_count", "muted"])
    S["Message"] = obj({
        "id": d(I64, "Ordered id; also the sync cursor (MSG-02)."), "conversation_id": UUID,
        "sender": nullable(ref("UserRef")), "sender_role": {"type": "string", "enum": ["guest", "host_member", "staff", "system"]},
        "kind": {"type": "string", "enum": ["text", "system"]},
        "body": d(STR, "Already masked for the reader when contact details are hidden (BR-MSG-01)."),
        "is_masked": BOOL, "client_message_id": nullable(STR), "created_at": DT,
    }, ["id", "conversation_id", "sender_role", "kind", "body", "is_masked", "created_at"])
    S["MessageCreate"] = obj({"body": {"type": "string", "minLength": 1, "maxLength": 4000},
                              "client_message_id": d({"type": "string", "maxLength": 64}, "Id made by the app; a retry with the same id returns the same message.")}, ["body"], extra=False)
    S["ConversationCreate"] = obj({"listing_id": nullable(UUID), "trip_id": nullable(UUID), "booking_id": nullable(UUID),
                                   "first_message": {"type": "string", "minLength": 1, "maxLength": 4000}},
                                  None, "Exactly one of listing_id, trip_id, booking_id. Returns the existing thread when one exists (find or create).")
    S["ReadMarker"] = obj({"last_read_message_id": I64}, ["last_read_message_id"])
    S["SyncResponse"] = obj({
        "conversations": d(arr(ref("Conversation")), "Threads that changed since the cursor (new message, read state, mute)."),
        "messages": d(arr(ref("Message")), "New messages since the cursor across all my threads, oldest first, at most 200."),
        "unread_total": INT,
        "next_cursor": d(STR, "Pass as `after` on the next call. Opaque."),
        "has_more": d(BOOL, "True when more than 200 messages are waiting: call again at once."),
        "poll_after_ms": d({"type": "integer", "minimum": 2000, "maximum": 60000}, "Server hint: wait this long before the next poll (5 to 15 s while a thread is open)."),
    }, ["conversations", "messages", "unread_total", "next_cursor", "has_more", "poll_after_ms"])

    # Media
    S["UploadRequest"] = obj({
        "purpose": {"type": "string", "enum": ["listing_photo", "document", "avatar", "logo", "message_attachment"]},
        "filename": {"type": "string", "maxLength": 200}, "mime_type": STR,
        "size_bytes": {"type": "integer", "minimum": 1, "maximum": 15728640},
        "sha256": {"type": "string", "pattern": "^[a-f0-9]{64}$"},
    }, ["purpose", "filename", "mime_type", "size_bytes", "sha256"],
        "Photos: JPEG, PNG, WebP, HEIC up to 15 MB (BR-MED-01). Documents: PDF, JPEG, PNG up to 10 MB, private bucket (BR-MED-02).")
    S["UploadTicket"] = obj({
        "media_id": UUID,
        "upload": obj({"method": {"type": "string", "enum": ["PUT", "POST"]}, "url": {"type": "string", "format": "uri"},
                       "headers": {"type": "object", "additionalProperties": STR}, "fields": {"type": "object", "additionalProperties": STR},
                       "expires_at": DT}, ["method", "url", "expires_at"]),
    }, ["media_id", "upload"], "Presigned upload to the quarantine area of object storage. The file never passes through Django.")
    S["Media"] = obj({
        "id": UUID, "purpose": STR, "bucket": ref("MediaBucket"), "status": ref("MediaStatus"),
        "mime_type": STR, "size_bytes": I64, "width": nullable(INT), "height": nullable(INT),
        "renditions": d({"type": "object", "additionalProperties": {"type": "string", "format": "uri"}}, "Public photos only: thumb, card, large."),
        "rejection_code": d(nullable(STR), "e.g. virus_found, too_small, duplicate_photo."),
        "created_at": DT,
    }, ["id", "purpose", "bucket", "status", "mime_type", "size_bytes", "created_at"])
    S["SignedUrl"] = obj({"url": {"type": "string", "format": "uri"}, "expires_at": d(DT, "5 minutes for private documents (BR-MED-02).")}, ["url", "expires_at"])

    # ----------------------------------------------------------------------
    # Host workspace
    # ----------------------------------------------------------------------
    S["Workspace"] = obj({
        "host_account_id": UUID, "kind": ref("HostAccountKind"), "host_type": ref("HostType"),
        "organization_id": nullable(UUID), "organization_slug": nullable(STR),
        "display_name": STR, "logo_url": nullable({"type": "string", "format": "uri"}),
        "role": d(nullable(ref("MembershipRole")), "Null for the user's own individual host account."),
        "verification_status": ref("VerificationStatus"), "is_active": BOOL,
        "permissions": arr(ref("HostPermission")),
        "allowed_verticals": d(arr(ref("Vertical")), "What this host account may publish (DEC-014, BR-HST-05)."),
        "can_create_trips": d(BOOL, "True only for approved agencies (BR-TRP-01)."),
    }, ["host_account_id", "kind", "host_type", "display_name", "verification_status", "is_active", "permissions", "allowed_verticals", "can_create_trips"])
    S["WorkspaceList"] = obj({"active_host_account_id": nullable(UUID), "results": arr(ref("Workspace"))}, ["active_host_account_id", "results"])
    S["WorkspaceSwitch"] = obj({"host_account_id": UUID}, ["host_account_id"], extra=False)
    S["HostAccount"] = {"allOf": [ref("Workspace"), obj({
        "default_approval_mode": ref("ApprovalMode"),
        "commission_rate_bp": d(INT, "Effective rate: override if set, else the host-type default (BR-PAY-06)."),
        "wallet_state": {"type": "string", "enum": ["ok", "negative", "below_floor"]},
        "submitted_at": nullable(DT), "approved_at": nullable(DT),
        "open_change_requests": INT,
        "required_documents": arr(obj({"doc_type": ref("DocumentType"), "status": nullable(ref("DocumentStatus"))}, ["doc_type"])),
    }, ["default_approval_mode", "commission_rate_bp", "wallet_state", "open_change_requests", "required_documents"])]}
    S["HostAccountUpdate"] = obj({"default_approval_mode": ref("ApprovalMode")}, None, extra=False)
    S["OnboardingField"] = obj({"id": STR, "type": ref("OnboardingFieldType"), "label": ref("LocalizedText"),
                                "help": nullable(ref("LocalizedText")), "required": BOOL, "core": d(BOOL, "Core fields cannot be removed or change type (BR-CFG-03)."),
                                "options": arr(obj({"value": STR, "label": ref("LocalizedText")}, ["value", "label"])),
                                "validation": OBJ}, ["id", "type", "label", "required", "core"])
    S["OnboardingStep"] = obj({"id": STR, "title": ref("LocalizedText"), "core": BOOL, "fields": arr(ref("OnboardingField"))}, ["id", "title", "core", "fields"])
    S["OnboardingFlow"] = obj({"host_type": ref("HostType"), "version": INT, "status": ref("FlowStatus"),
                               "steps": d(arr(ref("OnboardingStep")), "individual 12 steps, agency 5, hotel 7, hostel 7; every flow has the approval-mode step (BR-HST-01)."),
                               "published_at": nullable(DT)}, ["host_type", "version", "status", "steps"])
    S["OnboardingDraft"] = obj({"id": UUID, "host_type": ref("HostType"), "flow_version": d(INT, "Version the draft started from (BR-HST-02)."),
                                "current_step": STR, "answers": d(OBJ, "Keyed by field id."),
                                "status": {"type": "string", "enum": ["in_progress", "submitted", "abandoned"]},
                                "created_at": DT, "updated_at": DT}, ["id", "host_type", "flow_version", "current_step", "answers", "status", "updated_at"])
    S["OnboardingDraftWrite"] = obj({"current_step": STR, "answers": OBJ}, ["current_step", "answers"])
    S["OnboardingResult"] = obj({"host_account_id": UUID, "organization_id": nullable(UUID), "listing_id": d(nullable(UUID), "First listing created as a draft, if the flow had one."),
                                 "verification_status": ref("VerificationStatus"), "workspace": ref("Workspace")},
                                ["host_account_id", "verification_status", "workspace"])
    S["HostDocument"] = obj({"id": UUID, "doc_type": ref("DocumentType"), "listing_id": nullable(UUID), "status": ref("DocumentStatus"),
                             "media_id": UUID, "expires_on": nullable(DATE), "rejection_reason": nullable(STR), "created_at": DT,
                             "reviewed_at": nullable(DT)}, ["id", "doc_type", "status", "media_id", "created_at"])
    S["HostDocumentCreate"] = obj({"doc_type": ref("DocumentType"), "media_id": d(UUID, "A private-bucket upload (purpose document)."),
                                   "listing_id": nullable(UUID), "document_number": d(nullable(STR), "Stored only as a keyed hash (BR-PRV-05)."),
                                   "expires_on": nullable(DATE)}, ["doc_type", "media_id"], extra=False)
    S["ChangeRequestItem"] = obj({"id": UUID, "case_id": UUID, "subject_type": STR, "subject_id": UUID, "checklist_code": STR,
                                  "label": STR, "message": nullable(STR), "resolved_at": nullable(DT), "created_at": DT},
                                 ["id", "case_id", "subject_type", "subject_id", "checklist_code", "label"])
    S["PropertyIntegration"] = obj({"id": UUID, "listing_id": nullable(UUID), "kind": {"type": "string", "enum": ["channel_manager", "pms", "ical", "csv_import"]},
                                    "system_name": STR, "base_url": nullable(STR), "status": {"type": "string", "enum": ["pending", "active", "error", "disabled"]},
                                    "sync_rooms": BOOL, "sync_availability": BOOL, "sync_services": BOOL, "last_synced_at": nullable(DT), "last_error": nullable(STR)},
                                   ["id", "kind", "system_name", "status"], "Connection to a hotel's own system (DEC-017). Credentials are never returned.")
    S["PropertyIntegrationCreate"] = obj({"listing_id": nullable(UUID), "kind": {"type": "string", "enum": ["channel_manager", "pms", "ical", "csv_import"]},
                                          "system_name": {"type": "string", "maxLength": 60}, "base_url": nullable(STR),
                                          "credentials": d({"type": "object", "additionalProperties": True}, "API key or login of the hotel system. Stored encrypted."),
                                          "sync_rooms": BOOL, "sync_availability": BOOL, "sync_services": BOOL}, ["kind", "system_name"], extra=False)
    S["IntegrationSyncRun"] = obj({"id": INT, "started_at": DT, "finished_at": nullable(DT), "status": {"type": "string", "enum": ["ok", "partial", "failed"]},
                                   "rooms_changed": INT, "nights_changed": INT, "services_changed": INT, "error": nullable(STR)}, ["id", "started_at", "status"])
    S["PropertyService"] = obj({"id": UUID, "kind": STR, "name": STR, "description": nullable(STR), "opening_hours": nullable({"type": "object", "additionalProperties": True}),
                                "price": nullable(MONEY), "source": {"type": "string", "enum": ["manual", "integration"]}, "is_active": BOOL}, ["id", "kind", "name", "source"])
    S["PayoutAccount"] = obj({"id": UUID, "kind": {"type": "string", "enum": ["ccp_rip", "bank_rib", "baridimob"]}, "holder_name": STR,
                              "number_last4": STR, "is_default": BOOL, "hold_until": d(nullable(DT), "Payouts blocked until then (72 h after a change, BR-PAY-09)."),
                              "created_at": DT}, ["id", "kind", "holder_name", "number_last4", "is_default", "created_at"])
    S["PayoutAccountCreate"] = obj({"kind": {"type": "string", "enum": ["ccp_rip", "bank_rib", "baridimob"]}, "holder_name": {"type": "string", "maxLength": 160},
                                    "number": d({"type": "string", "maxLength": 34}, "Full RIP or RIB. Encrypted at rest; only the last 4 digits are ever returned."),
                                    "is_default": BOOL}, ["kind", "holder_name", "number"], extra=False)

    # Organisation private
    S["Organization"] = obj({
        "id": UUID, "host_account_id": UUID, "business_category": d(ref("BusinessCategory"), "Never changes (BR-ORG-02)."),
        "display_name": STR, "legal_name": nullable(STR), "slug": STR, "description": nullable(STR), "source_language": ref("Locale"),
        "logo": nullable(ref("PhotoRef")), "cover": nullable(ref("PhotoRef")),
        "business_email": nullable(STR), "business_phone_e164": nullable(STR), "commune": nullable(ref("CommuneRef")), "address_line": nullable(STR),
        "rc_number": nullable(STR), "nif": nullable(STR), "nis": nullable(STR), "article_imposition": nullable(STR), "tourism_licence_number": nullable(STR),
        "star_rating": nullable({"type": "integer", "minimum": 1, "maximum": 5}), "check_in_time": nullable(TIME), "check_out_time": nullable(TIME),
        "policies": OBJ, "team_size_range": nullable(STR), "verification_status": ref("VerificationStatus"),
        "default_approval_mode": ref("ApprovalMode"), "created_at": DT,
    }, ["id", "host_account_id", "business_category", "display_name", "slug", "verification_status", "default_approval_mode", "created_at"],
        "Private organisation record for members with org.edit.")
    S["OrganizationUpdate"] = obj({
        "display_name": {"type": "string", "maxLength": 120}, "legal_name": {"type": "string", "maxLength": 160}, "description": STR,
        "logo_media_id": nullable(UUID), "cover_media_id": nullable(UUID), "business_email": {"type": "string", "format": "email"},
        "business_phone_e164": STR, "commune_id": INT, "address_line": {"type": "string", "maxLength": 255},
        "rc_number": STR, "nif": STR, "nis": STR, "article_imposition": STR, "tourism_licence_number": STR,
        "star_rating": {"type": "integer", "minimum": 1, "maximum": 5}, "check_in_time": TIME, "check_out_time": TIME,
        "policies": OBJ, "team_size_range": STR, "default_approval_mode": ref("ApprovalMode"),
    }, None, "Any subset. Changing legal_name, rc_number, nif, nis or tourism_licence_number sets verification back to under_review and opens a moderation case (BR-ORG-06). business_category is not accepted.", extra=False)
    S["Member"] = obj({"membership_id": UUID, "user": ref("UserRef"), "email": d(nullable(STR), "Visible to members.manage only."),
                       "role": ref("MembershipRole"), "is_active": BOOL, "joined_at": DT}, ["membership_id", "user", "role", "is_active", "joined_at"])
    S["MemberUpdate"] = obj({"role": d(ref("MembershipRole"), "Cannot be owner: use transfer-ownership.")}, ["role"], extra=False)
    S["OwnershipTransfer"] = obj({"membership_id": UUID, "confirm_password": d(STR, "Re-authentication for a sensitive action.")}, ["membership_id"], extra=False)
    S["Invitation"] = obj({"id": UUID, "email": nullable(STR), "phone_e164": nullable(STR), "role": ref("MembershipRole"),
                           "status": ref("InvitationStatus"), "invited_by": ref("UserRef"), "expires_at": DT, "created_at": DT},
                          ["id", "role", "status", "invited_by", "expires_at", "created_at"])
    S["InvitationCreate"] = obj({"email": {"type": "string", "format": "email"}, "phone_e164": STR,
                                 "role": d({"type": "string", "enum": ["admin", "manager", "agent", "guide"]}, "Only the owner can invite an admin.")},
                                ["role"], "Email or phone is required.", extra=False)
    S["InvitationAccept"] = obj({"token": d(STR, "One-time token from the invitation link. Sent in the body, never in the URL query.")}, ["token"], extra=False)

    # Listings (host)
    S["ListingWrite"] = obj({
        "vertical": d(ref("Vertical"), "Must be allowed for the active host account (DEC-014, BR-HST-05), else 403 host_offer_not_allowed."),
        "experience_type": d(nullable(ref("ExperienceType")), "Required when vertical = experience, else must be null (BR-LST-05)."),
        "title": {"type": "string", "minLength": 5, "maxLength": 120}, "description": {"type": "string", "minLength": 20},
        "source_language": ref("Locale"), "category_id": nullable(UUID), "property_type_id": nullable(UUID),
        "commune_id": INT, "address_line": {"type": "string", "maxLength": 255}, "location": ref("GeoPoint"),
        "capacity_guests": {"type": "integer", "minimum": 1}, "bedrooms": nullable(INT), "beds": nullable(INT),
        "bathrooms": nullable({"type": "number"}), "surface_m2": nullable(INT),
        "base_price": d(ref("MoneyInput"), "100 to 10,000,000 DZD."), "cleaning_fee": nullable(ref("MoneyInput")),
        "weekly_discount_bp": {"type": "integer", "minimum": 0, "maximum": 9000}, "monthly_discount_bp": {"type": "integer", "minimum": 0, "maximum": 9000},
        "min_nights": {"type": "integer", "minimum": 1}, "max_nights": {"type": "integer", "minimum": 1},
        "advance_notice_days": {"type": "integer", "minimum": 0}, "available_from": nullable(DATE), "available_until": nullable(DATE),
        "check_in_time": nullable(TIME), "check_out_time": nullable(TIME),
        "approval_mode": d(nullable(ref("ApprovalMode")), "Null = inherit the host account default (BR-BKG-02)."),
        "cancellation_policy_code": {"type": "string", "enum": ["flexible", "moderate", "strict"]},
        "house_rules": obj({"codes": arr(STR), "text": nullable(STR)}), "amenity_ids": arr(UUID),
        "photo_media_ids": d(arr(UUID), "Ordered, first is the cover unless cover_media_id is set. Homes need 5 or more to submit (BR-MED-01)."),
        "cover_media_id": nullable(UUID),
        "vehicle": nullable(ref("VehicleDetail")), "experience": nullable(ref("ExperienceDetail")),
    }, ["vertical", "title", "description", "source_language", "commune_id", "location", "capacity_guests", "base_price", "cancellation_policy_code"],
        "Create body. PATCH accepts any subset (vertical can only change to another allowed vertical while the listing is a draft). Server validates every field (LST-01).")
    S["ListingRevision"] = obj({"id": UUID, "status": {"type": "string", "enum": ["pending_review", "approved", "rejected", "superseded"]},
                                "fields": d(arr(STR), "Reviewed fields changed in this revision (BR-LST-02)."), "submitted_at": DT, "decided_at": nullable(DT)},
                               ["id", "status", "fields", "submitted_at"])
    S["HostListing"] = {"allOf": [ref("ListingDetail"), obj({
        "status": ref("ListingStatus"), "status_reason": nullable(STR), "inventory_kind": ref("InventoryKind"),
        "own_approval_mode": nullable(ref("ApprovalMode")),
        "pending_revision": d(nullable(ref("ListingRevision")), "Edits of key fields waiting for review; the public page shows the last approved version."),
        "open_change_requests": arr(ref("ChangeRequestItem")),
        "allowed_status_changes": arr(ref("ListingStatus")),
        "submitted_at": nullable(DT), "published_at": nullable(DT), "created_at": DT, "updated_at": DT,
    }, ["status", "inventory_kind", "allowed_status_changes", "created_at", "updated_at"])]}
    S["HostStatusChange"] = obj({"status": d({"type": "string", "enum": ["pending_review", "draft", "paused", "published", "archived"]},
                                             "Host-allowed targets (table 4a): submit (pending_review), withdraw or unarchive (draft), pause, resume (published, only from paused), archive."),
                                 "note": {"type": "string", "maxLength": 2000}}, ["status"], extra=False)
    S["PhotosReplace"] = obj({"photos": arr(obj({"media_id": UUID, "caption": nullable({"type": "string", "maxLength": 160})}, ["media_id"])),
                              "cover_media_id": UUID}, ["photos", "cover_media_id"], extra=False)
    S["CalendarDay"] = obj({"date": DATE, "is_blocked": BOOL, "price": d(MONEY, "Effective price that night."), "price_override": NMONEY,
                            "note": nullable(STR), "units_total": nullable(INT), "units_booked": nullable(INT), "units_held": nullable(INT),
                            "booking_ids": arr(UUID)}, ["date", "is_blocked", "price"])
    S["CalendarRow"] = obj({"listing_id": UUID, "room_type_id": nullable(UUID), "days": arr(ref("CalendarDay"))}, ["listing_id", "days"])
    S["CalendarResponse"] = obj({"from": DATE, "to": DATE, "results": arr(ref("CalendarRow"))}, ["from", "to", "results"])
    S["DateSelection"] = obj({"dates": d(arr(DATE, maxItems=366), "Explicit days. Or use range."),
                              "range": obj({"from": DATE, "to": d(DATE, "Inclusive.")}, ["from", "to"]),
                              "room_type_id": d(nullable(UUID), "Per room type for hotels and hostels (AVL-03).")},
                             None, "Either dates or range; at most 366 days; no past days for blocks.")
    S["CalendarBlocks"] = {"allOf": [ref("DateSelection"), obj({"blocked": BOOL, "note": {"type": "string", "maxLength": 120}}, ["blocked"])]}
    S["CalendarPrices"] = {"allOf": [ref("DateSelection"), obj({"price_override": d(nullable(ref("MoneyInput")), "Null removes the override. 100 to 10,000,000 DZD.")}, ["price_override"])]}

    # Wallet
    S["Wallet"] = obj({
        "host_account_id": UUID, "balance": MONEY, "credit_limit": d(MONEY, "How far below zero the wallet may go (BR-PAY-10)."),
        "state": {"type": "string", "enum": ["ok", "negative", "below_floor"]},
        "commission_rate_bp": INT, "commission_rate_source": {"type": "string", "enum": ["override", "default"]},
        "updated_at": DT,
    }, ["host_account_id", "balance", "credit_limit", "state", "commission_rate_bp", "commission_rate_source", "updated_at"])
    S["WalletEntry"] = obj({
        "id": I64, "transaction_id": UUID, "kind": ref("LedgerTxKind"), "description": STR,
        "amount": d(MONEY, "Signed from the host's point of view: positive adds to the wallet, negative takes from it."),
        "balance_after": MONEY, "booking_reference": nullable(STR), "topup_id": nullable(UUID), "occurred_at": DT,
    }, ["id", "transaction_id", "kind", "description", "amount", "balance_after", "occurred_at"])
    S["Earnings"] = obj({"from": DATE, "to": DATE, "upcoming": MONEY, "completed": d(MONEY, "Recognised at completion (DEC-010, BR-RPT-02)."),
                         "commission_paid": MONEY, "refunds_owed": MONEY,
                         "by_month": arr(obj({"month": STR, "completed": MONEY, "commission": MONEY}, ["month", "completed", "commission"]))},
                        ["from", "to", "upcoming", "completed", "commission_paid", "refunds_owed", "by_month"])
    S["Invoice"] = obj({"id": UUID, "number": d(STR, "e.g. 2026-000123."), "period_start": DATE, "period_end": DATE, "amount_ht": MONEY, "vat": MONEY,
                        "amount_ttc": MONEY, "status": {"type": "string", "enum": ["issued", "cancelled"]}, "pdf_url": nullable({"type": "string", "format": "uri"}),
                        "issued_at": DT}, ["id", "number", "period_start", "period_end", "amount_ht", "vat", "amount_ttc", "status", "issued_at"], "R2 (PAY-11).")
    S["OnlineTopupCreate"] = obj({"amount": ref("MoneyInput"), "provider": {"type": "string", "enum": ["chargily"]}, "return_url": {"type": "string", "format": "uri"}},
                                 ["amount", "provider", "return_url"])
    S["OnlineTopupCheckout"] = obj({"topup_id": UUID, "checkout_url": {"type": "string", "format": "uri"}, "expires_at": DT}, ["topup_id", "checkout_url"])
    S["Payout"] = obj({"id": UUID, "host_account_id": UUID, "payout_account_id": UUID, "amount": MONEY,
                       "status": {"type": "string", "enum": ["requested", "approved", "sent", "confirmed", "rejected"]},
                       "approved_by": nullable(ref("UserRef")), "created_at": DT}, ["id", "host_account_id", "payout_account_id", "amount", "status", "created_at"],
                      "DORMANT (model M4, BR-PAY-11).")
    S["PayoutCreate"] = obj({"amount": ref("MoneyInput"), "payout_account_id": UUID}, ["amount", "payout_account_id"])

    # ----------------------------------------------------------------------
    # Admin
    # ----------------------------------------------------------------------
    S["StaffSession"] = obj({"user": ref("StaffMember"), "permissions": arr(STR), "mfa_verified": BOOL,
                             "expires_at": d(DT, "8 h absolute, 30 min idle (settings, BR-ACC-03)."), "session_token": d(STR, "Kept by the admin BFF only.")},
                            ["user", "permissions", "mfa_verified", "expires_at"])
    S["StaffInviteAccept"] = obj({"token": STR, "password": {"type": "string", "minLength": 12, "maxLength": 256}}, ["token", "password"], extra=False)
    S["StaffMember"] = obj({"user_id": UUID, "email": STR, "display_name": STR, "role": ref("StaffRoleCode"), "status": ref("StaffStatus"),
                            "mfa_enrolled": BOOL, "invited_at": nullable(DT), "activated_at": nullable(DT), "last_login_at": nullable(DT)},
                           ["user_id", "email", "display_name", "role", "status", "mfa_enrolled"])
    S["StaffInvite"] = obj({"email": {"type": "string", "format": "email"}, "display_name": {"type": "string", "maxLength": 160}, "role": ref("StaffRoleCode")},
                           ["email", "display_name", "role"], extra=False)
    S["StaffUpdate"] = obj({"role": ref("StaffRoleCode")}, ["role"], extra=False)
    S["StaffRole"] = obj({"role": ref("StaffRoleCode"), "label": STR, "permissions": arr(STR)}, ["role", "label", "permissions"])
    S["ModerationCounts"] = obj({"queues": arr(obj({"kind": ref("CaseKind"), "open": INT, "high_priority": INT, "oldest_submitted_at": nullable(DT)},
                                                   ["kind", "open", "high_priority"]))}, ["queues"])
    S["AttentionItems"] = obj({"items": arr(obj({"kind": STR, "count": INT, "top": arr(obj({"id": STR, "title": STR, "href": STR, "since": nullable(DT)}, ["id", "title", "href"]))},
                                                ["kind", "count", "top"]))}, ["items"])
    S["CaseSubject"] = obj({"type": {"type": "string", "enum": ["host_account", "listing", "listing_revision", "trip", "host_document", "review", "booking", "user"]},
                            "id": UUID, "reference": nullable(STR), "title": STR, "host_account_id": nullable(UUID)}, ["type", "id", "title"])
    S["ModerationDecisionRecord"] = obj({"id": UUID, "decision": STR, "reason_code": nullable(STR), "note": nullable(STR), "actor": ref("UserRef"), "created_at": DT},
                                        ["id", "decision", "actor", "created_at"])
    S["ModerationCase"] = obj({
        "id": UUID, "kind": ref("CaseKind"), "subject": ref("CaseSubject"), "status": ref("CaseStatus"), "priority": ref("CasePriority"),
        "submitted_at": d(DT, "Last submission; waiting time counts from here (BR-MOD-01)."), "waiting_hours": INT,
        "assigned_to": nullable(ref("UserRef")), "change_request_items": arr(ref("ChangeRequestItem")),
        "decisions": arr(ref("ModerationDecisionRecord")), "created_at": DT,
    }, ["id", "kind", "subject", "status", "priority", "submitted_at", "waiting_hours", "created_at"])
    S["DecisionCreate"] = obj({
        "decision": {"type": "string", "enum": ["approve", "reject", "request_changes", "dismiss", "hide", "restore", "escalate"]},
        "reason_code": nullable(STR), "note": d({"type": "string", "maxLength": 4000}, "At least 10 characters for reject, request_changes, hide (BR-HST-04)."),
        "items": d(arr(obj({"checklist_code": STR, "message": nullable(STR)}, ["checklist_code"])), "For request_changes: what the host must fix (BR-MOD-02)."),
    }, ["decision"], extra=False)
    S["BulkDecision"] = obj({"case_ids": arr(UUID, minItems=1, maxItems=100), "decision": ref("DecisionCreate")}, ["case_ids", "decision"])
    S["BulkResult"] = obj({"results": arr(obj({"id": UUID, "ok": BOOL, "error": nullable(ref("Problem"))}, ["id", "ok"]))}, ["results"])
    S["Reason"] = obj({"reason_code": nullable(STR), "reason": {"type": "string", "minLength": 10, "maxLength": 2000}}, ["reason"], extra=False)
    S["AdminHost"] = obj({
        "host_account_id": UUID, "reference": d(STR, "Display id, e.g. #P00001."), "kind": ref("HostAccountKind"), "host_type": ref("HostType"),
        "display_name": STR, "owner": ref("UserRef"), "owner_email": nullable(STR), "owner_phone_e164": nullable(STR),
        "wilaya_code": nullable(INT), "verification_status": ref("VerificationStatus"), "default_approval_mode": ref("ApprovalMode"),
        "commission_rate_bp": INT, "commission_rate_override_bp": nullable(INT), "credit_limit": MONEY, "wallet_balance": MONEY,
        "listing_count": INT, "trip_count": INT, "booking_count": INT, "rating_avg": nullable({"type": "number"}), "review_count": INT,
        "host_cancellations_12m": INT, "documents": obj({"required": INT, "approved": INT, "pending": INT, "rejected": INT}),
        "submitted_at": nullable(DT), "approved_at": nullable(DT), "created_at": DT, "deleted_at": nullable(DT),
    }, ["host_account_id", "reference", "kind", "host_type", "display_name", "owner", "verification_status", "commission_rate_bp", "wallet_balance", "created_at"])
    S["AdminHostDetail"] = {"allOf": [ref("AdminHost"), obj({"organization": nullable(ref("Organization")), "members": arr(ref("Member")),
                                                             "documents_list": arr(ref("HostDocument")), "open_cases": arr(ref("ModerationCase"))})]}
    S["CommissionOverride"] = obj({"rate_bp": {"type": "integer", "minimum": 0, "maximum": 10000}, "reason": {"type": "string", "minLength": 10}}, ["rate_bp", "reason"], extra=False)
    S["AdminListing"] = obj({
        "id": UUID, "reference": STR, "vertical": ref("Vertical"), "experience_type": nullable(ref("ExperienceType")), "title": STR,
        "status": ref("ListingStatus"), "host": ref("HostSummary"), "commune": ref("CommuneRef"), "base_price": MONEY, "capacity_guests": INT,
        "approval_mode": ref("ApprovalMode"), "is_featured": BOOL, "report_count": INT, "rating_avg": nullable({"type": "number"}),
        "booking_count": INT, "has_pending_revision": BOOL, "submitted_at": nullable(DT), "published_at": nullable(DT), "created_at": DT, "deleted_at": nullable(DT),
    }, ["id", "reference", "vertical", "title", "status", "host", "commune", "base_price", "created_at"])
    S["AdminListingDetail"] = {"allOf": [ref("HostListing"), obj({"is_featured": BOOL, "featured_placements": arr(OBJ), "open_cases": arr(ref("ModerationCase"))})]}
    S["AdminStatusChange"] = obj({"status": ref("ListingStatus"), "reason_code": nullable(STR), "reason": nullable({"type": "string", "maxLength": 2000})},
                                 ["status"], "Any move allowed by table 4a for staff; reason (10+ chars) required for rejected, suspended, changes_requested.", extra=False)
    S["FeaturedUpdate"] = obj({"is_featured": BOOL, "placement": {"type": "string", "enum": ["home_weekend", "home_hero", "search_top"]},
                               "position": INT, "starts_at": DT, "ends_at": nullable(DT)}, ["is_featured"], extra=False)
    S["AdminTrip"] = obj({"id": UUID, "reference": STR, "trip_type": ref("TripType"), "title": STR, "status": ref("ListingStatus"), "host": ref("HostSummary"),
                          "price_per_person": MONEY, "next_departure_on": nullable(DATE), "departure_count": INT, "created_at": DT},
                         ["id", "reference", "trip_type", "title", "status", "host", "price_per_person", "created_at"])
    S["AdminBooking"] = {"allOf": [ref("HostBooking"), obj({"host": ref("HostSummary"), "guest_email": nullable(STR), "guest_phone": nullable(STR),
                                                            "events": arr(obj({"from_status": nullable(ref("BookingStatus")), "to_status": ref("BookingStatus"),
                                                                               "actor_role": ref("ActorRole"), "actor": nullable(ref("UserRef")),
                                                                               "reason_code": nullable(STR), "note": nullable(STR), "created_at": DT},
                                                                              ["to_status", "actor_role", "created_at"])),
                                                            "dispute": nullable(ref("Dispute"))}, ["host"])]}
    S["AdminCancel"] = obj({"reason_code": nullable(STR), "reason": {"type": "string", "minLength": 10, "maxLength": 2000},
                            "fault": d({"type": "string", "enum": ["host", "guest", "none"]}, "Decides refund and commission reversal (BR-PAY-05).")}, ["reason", "fault"], extra=False)
    S["RefundCreate"] = obj({"amount": d(ref("MoneyInput"), "1 centime up to total minus already refunded (BR-CAN-04)."),
                             "reason": {"type": "string", "minLength": 10, "maxLength": 2000}, "reason_code": nullable(STR)}, ["amount", "reason"], extra=False)
    S["DisputeResolve"] = obj({"outcome": {"type": "string", "enum": ["refund_full", "refund_partial", "declined"]}, "refund_amount": nullable(ref("MoneyInput")),
                               "note": {"type": "string", "minLength": 10, "maxLength": 4000}}, ["outcome", "note"], extra=False)
    S["AdminRefund"] = {"allOf": [ref("RefundLine"), obj({"booking_id": UUID, "booking_reference": STR, "host": ref("HostSummary"), "created_by": nullable(ref("UserRef"))},
                                                         ["booking_id", "booking_reference", "host"])]}
    S["AdminUser"] = obj({
        "id": UUID, "display_name": STR, "email": nullable(STR), "phone_e164": nullable(STR), "email_verified": BOOL, "phone_verified": BOOL,
        "status": ref("UserStatus"), "is_host": BOOL, "host_account_ids": arr(UUID), "booking_count": INT, "total_booked": MONEY,
        "open_flags": INT, "date_joined": DT, "last_login_at": nullable(DT), "deleted_at": nullable(DT),
    }, ["id", "display_name", "email_verified", "phone_verified", "status", "is_host", "booking_count", "date_joined"])
    S["AdminReview"] = {"allOf": [ref("Review"), obj({"booking_reference": STR, "listing_title": nullable(STR), "vertical": nullable(ref("Vertical")),
                                                      "wilaya_code": nullable(INT), "open_reports": INT,
                                                      "reports": arr(obj({"reason_code": STR, "note": nullable(STR), "created_at": DT}, ["reason_code", "created_at"]))},
                                                     ["booking_reference", "open_reports"])]}
    S["FinanceSummary"] = obj({
        "wallets_total": MONEY, "negative_wallets": INT, "below_floor_wallets": INT,
        "commission_this_month": MONEY, "commission_reversed_this_month": MONEY, "topups_this_month": MONEY,
        "pending_topup_approvals": INT, "refunds_owed_this_month": MONEY,
        "dormant": d(obj({"payouts_pending": INT, "escrow_balance": MONEY}), "Only filled when models M2 to M4 are on."),
    }, ["wallets_total", "negative_wallets", "below_floor_wallets", "commission_this_month", "topups_this_month", "pending_topup_approvals"])
    S["AdminWallet"] = {"allOf": [ref("Wallet"), obj({"host": ref("HostSummary"), "total_topups": MONEY, "total_commission": MONEY, "last_entry_at": nullable(DT)},
                                                     ["host", "total_topups", "total_commission"])]}
    S["LedgerTransaction"] = obj({
        "id": UUID, "kind": ref("LedgerTxKind"), "description": STR, "booking_reference": nullable(STR), "topup_id": nullable(UUID),
        "reverses_id": nullable(UUID), "created_by": nullable(ref("UserRef")), "occurred_at": DT,
        "entries": d(arr(obj({"account_code": STR, "account_kind": ref("LedgerAccountKind"), "amount": d(MONEY, "Positive = debit, negative = credit.")},
                             ["account_code", "account_kind", "amount"])), "Always sum to zero (BR-PAY-02)."),
    }, ["id", "kind", "description", "occurred_at", "entries"])
    S["Topup"] = obj({
        "id": UUID, "host_account_id": UUID, "host": ref("HostSummary"), "method": ref("TopupMethod"), "amount": MONEY,
        "receipt_reference": STR, "status": ref("TopupStatus"), "requested_by": ref("UserRef"), "approved_by": nullable(ref("UserRef")),
        "approved_at": nullable(DT), "rejection_reason": nullable(STR), "ledger_transaction_id": nullable(UUID),
        "needs_second_approval": d(BOOL, "True when the amount is above the four-eyes threshold (500,000 DZD by default, BR-PAY-07)."),
        "wallet_balance_after": NMONEY, "created_at": DT,
    }, ["id", "host_account_id", "method", "amount", "receipt_reference", "status", "requested_by", "needs_second_approval", "created_at"])
    S["TopupCreate"] = obj({
        "amount": d(ref("MoneyInput"), "1 to 10,000,000 DZD (100 to 1,000,000,000 centimes)."),
        "method": d({"type": "string", "enum": ["ccp_transfer", "bank_transfer", "baridimob", "cash_office"]}, "gateway is not allowed for manual top-ups."),
        "receipt_reference": d({"type": "string", "minLength": 3, "maxLength": 200}, "Unique per method (BR-PAY-07)."),
        "note": {"type": "string", "maxLength": 2000},
    }, ["amount", "method", "receipt_reference"], extra=False)
    S["AdjustmentCreate"] = obj({"host_account_id": UUID, "amount": d(ref("Money"), "Signed: positive credits the wallet, negative debits it."),
                                 "reason": {"type": "string", "minLength": 10}, "reverses_transaction_id": nullable(UUID)},
                                ["host_account_id", "amount", "reason"], extra=False)
    S["CommissionRates"] = obj({"individual_bp": INT, "agency_bp": INT, "hotel_bp": INT, "hostel_bp": INT,
                                "effective_for": d(STR, "Always new bookings only (BR-PAY-06).")}, ["individual_bp", "agency_bp", "hotel_bp", "hostel_bp"])
    S["PlatformSettingsData"] = obj({
        "commission_defaults_bp": obj({"individual": INT, "agency": INT, "hotel": INT, "hostel": INT}, ["individual", "agency", "hotel", "hostel"]),
        "credit_limit_defaults_minor": obj({"individual": I64, "agency": I64, "hotel": I64, "hostel": I64}),
        "request_ttl_hours": {"type": "integer", "minimum": 1, "maximum": 168},
        "instant_booking_enabled": d(BOOL, "False forces request mode everywhere (BR-BKG-02)."),
        "maintenance_mode": BOOL,
        "topup_four_eyes_threshold_minor": I64,
        "guest_session_days": INT, "staff_session_absolute_hours": INT, "staff_session_idle_minutes": INT,
        "locales": arr(ref("Locale")),
        "feature_flags": obj({"guest_payments": BOOL, "payouts": BOOL, "online_topup": BOOL, "coupons": BOOL, "disputes": BOOL,
                              "host_reviews": BOOL, "message_attachments": BOOL}),
    }, None, "Whitelisted keys only; unknown keys return 422 unknown_setting (BR-CFG-01).")
    S["PlatformSettings"] = obj({"version": INT, "data": ref("PlatformSettingsData"), "created_by": ref("UserRef"), "created_at": DT},
                                ["version", "data", "created_by", "created_at"])
    S["OnboardingFlowSummary"] = obj({"host_type": ref("HostType"), "published_version": nullable(INT), "draft_version": nullable(INT),
                                      "published_at": nullable(DT), "draft_updated_at": nullable(DT)}, ["host_type"])
    S["OnboardingDraftFlowWrite"] = obj({"steps": arr(ref("OnboardingStep"))}, ["steps"], extra=False)
    S["CategoryWrite"] = obj({"vertical": ref("Vertical"), "slug": {"type": "string", "pattern": "^[a-z0-9-]{2,60}$"}, "labels": ref("LocalizedText"),
                              "icon": nullable(STR), "sort_order": INT, "is_active": BOOL}, ["vertical", "slug", "labels"])
    S["AmenityWrite"] = obj({"slug": {"type": "string", "pattern": "^[a-z0-9-]{2,60}$"}, "group": {"type": "string", "enum": ["essentials", "features", "location", "safety"]},
                             "labels": ref("LocalizedText"), "icon": nullable(STR), "applies_to": arr(ref("Vertical")), "is_active": BOOL},
                            ["slug", "group", "labels", "applies_to"])
    S["PropertyTypeWrite"] = obj({"vertical": ref("Vertical"), "slug": {"type": "string", "pattern": "^[a-z0-9-]{2,60}$"}, "labels": ref("LocalizedText"), "is_active": BOOL},
                                 ["vertical", "slug", "labels"])
    S["Coupon"] = obj({"id": UUID, "code": STR, "discount_type": {"type": "string", "enum": ["percentage", "fixed"]},
                       "discount_value": d(I64, "Basis points for percentage, centimes for fixed."), "min_spend": MONEY,
                       "funded_by": {"type": "string", "enum": ["platform", "host"]}, "host_account_id": nullable(UUID),
                       "scope_verticals": arr(ref("Vertical")), "usage_limit": nullable(INT), "per_user_limit": INT, "used_count": INT,
                       "valid_from": DT, "valid_to": nullable(DT), "is_active": BOOL, "created_at": DT},
                      ["id", "code", "discount_type", "discount_value", "funded_by", "per_user_limit", "used_count", "valid_from", "is_active"], "R2 (PRM-01, PRM-02).")
    S["CouponWrite"] = obj({"code": {"type": "string", "pattern": "^[A-Za-z0-9_-]{3,32}$"}, "discount_type": {"type": "string", "enum": ["percentage", "fixed"]},
                            "discount_value": I64, "min_spend": ref("MoneyInput"), "funded_by": {"type": "string", "enum": ["platform", "host"]},
                            "host_account_id": nullable(UUID), "scope_verticals": arr(ref("Vertical")), "usage_limit": nullable(INT),
                            "per_user_limit": INT, "valid_from": DT, "valid_to": nullable(DT), "is_active": BOOL},
                           ["code", "discount_type", "discount_value", "funded_by", "valid_from"])
    S["AuditEvent"] = obj({"id": I64, "occurred_at": DT, "actor": nullable(ref("UserRef")), "actor_kind": {"type": "string", "enum": ["staff", "user", "system"]},
                           "actor_role": nullable(STR), "action": d(STR, "e.g. LISTING_APPROVE, WALLET_TOPUP."), "object_type": STR, "object_id": STR,
                           "host_account_id": nullable(UUID), "before": nullable(OBJ), "after": nullable(OBJ),
                           "ip": d(nullable(STR), "Shown only with audit.view."), "request_id": nullable(STR)},
                          ["id", "occurred_at", "actor_kind", "action", "object_type", "object_id"])
    S["ExportCreate"] = obj({"dataset": ref("ExportDataset"), "filters": d(OBJ, "The same query filters as the matching list endpoint."),
                             "format": {"type": "string", "enum": ["csv"], "default": "csv"}}, ["dataset", "filters"], extra=False)
    S["ExportJob"] = obj({"id": UUID, "dataset": ref("ExportDataset"), "filters": OBJ, "status": {"type": "string", "enum": ["queued", "running", "done", "failed"]},
                          "row_count": nullable(INT), "download_url": d(nullable({"type": "string", "format": "uri"}), "Signed URL valid 5 minutes, when status = done."),
                          "created_at": DT, "completed_at": nullable(DT)}, ["id", "dataset", "filters", "status", "created_at"])
    S["KpiReport"] = obj({"from": DATE, "to": DATE, "previous_from": DATE, "previous_to": DATE,
                          "metrics": arr(obj({"key": {"type": "string", "enum": ["bookings", "gross_booking_value", "commission_net", "active_listings", "active_hosts", "new_users", "cancellation_rate_bp", "response_time_minutes"]},
                                              "value": {"type": "number"}, "previous": nullable({"type": "number"}), "change_bp": nullable(INT),
                                              "money": NMONEY}, ["key", "value"]))}, ["from", "to", "metrics"],
                         "Real date windows in Africa/Algiers (BR-RPT-01). Stays (home, hotel, hostel) roll up into one family when group_stays=true (BR-SRC-04).")
    S["ChartSeries"] = obj({"key": STR, "points": arr(obj({"x": STR, "y": {"type": "number"}}, ["x", "y"]))}, ["key", "points"])
    S["KpiCharts"] = obj({"revenue_by_month": arr(ref("ChartSeries")), "revenue_by_host_type": arr(ref("FacetBucket")),
                          "revenue_by_vertical": arr(ref("FacetBucket")), "bookings_by_wilaya": arr(ref("FacetBucket")),
                          "host_type_by_vertical": d(OBJ, "Cross tab; impossible cells are null, not 0 (RPT-02).")}, ["revenue_by_month"])
    S["SearchHit"] = obj({"type": {"type": "string", "enum": ["host", "listing", "trip", "booking", "user"]}, "id": STR, "title": STR, "subtitle": nullable(STR), "href": STR},
                         ["type", "id", "title", "href"])
    S["GatewayEventAck"] = obj({"received": BOOL, "duplicate": BOOL}, ["received", "duplicate"])
    S["DataSubjectRequestAdmin"] = {"allOf": [ref("DataSubjectRequest"), obj({"user": ref("UserRef"), "notes": nullable(STR), "handled_by": nullable(ref("UserRef"))}, ["user"])]}
    S["DataSubjectRequestComplete"] = obj({"outcome": {"type": "string", "enum": ["completed", "rejected"]}, "notes": {"type": "string", "minLength": 10}}, ["outcome", "notes"], extra=False)
    return S
