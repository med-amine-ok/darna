"""Operations of the BLADUS API (generator helper, not part of the repo)."""
from schemas import ref, arr, obj, nullable, d, STR, UUID, DATE, INT, I64, BOOL, OBJ

OPS = []


def P(name):
    return {"$ref": f"#/components/parameters/{name}"}


def qp(name, schema, desc, required=False, example=None):
    p = {"name": name, "in": "query", "required": required, "description": desc, "schema": schema}
    if schema.get("type") == "array":
        p["style"] = "form"
        p["explode"] = False
    if example is not None:
        p["example"] = example
    return p


def cursor_of(item, extra=None):
    props = {"results": arr(item), "next_cursor": nullable(STR), "has_more": BOOL}
    req = ["results", "next_cursor", "has_more"]
    if extra:
        props.update(extra)
    return obj(props, req, "Cursor page: pass next_cursor back as `cursor` to continue.")


def page_of(item, facets=False, extra=None):
    props = {"results": arr(item), "meta": ref("PageMeta")}
    req = ["results", "meta"]
    if facets:
        props["facets"] = ref("Facets")
    if extra:
        props.update(extra)
    return obj(props, req, "Numbered page (admin tables).")


def list_of(item):
    return obj({"results": arr(item)}, ["results"])


def op(method, path, opid, summary, tag, auth, req, rules, *, desc=None, query=None, body=None, body_required=True,
       resp=None, status=None, idem=None, conflict=False, dormant=False, release=None, perm=None, etag=False,
       rate=False, examples=None, resp_desc=None, req_example=None, if_match=False, extra_errors=()):
    OPS.append(dict(method=method, path=path, opid=opid, summary=summary, tag=tag, auth=auth, req=req, rules=rules,
                    desc=desc, query=query or [], body=body, body_required=body_required, resp=resp, status=status,
                    idem=idem, conflict=conflict, dormant=dormant, release=release, perm=perm, etag=etag, rate=rate,
                    examples=examples, resp_desc=resp_desc, req_example=req_example, if_match=if_match,
                    extra_errors=list(extra_errors)))


A = "/api/v1"
AD = "/api/v1/admin"

# ===========================================================================
# AUTH (django-allauth headless, "app" client, mounted at /api/v1/auth)
# ===========================================================================
T = "auth"
op("post", f"{A}/auth/signup", "authSignup", "Sign up with email or Algerian phone", T, "public",
   ["ACC-01", "PRV-01"], ["BR-ACC-01", "BR-PRV-01"], body=ref("SignupRequest"), resp=ref("Session"), rate=True, conflict=True,
   desc="allauth headless signup. Creates the user and the consent records, then starts the `verify_email` or `verify_phone` flow. 409 `email_taken` or `phone_taken`.")
op("post", f"{A}/auth/login", "authLogin", "Sign in with email or phone and password", T, "public",
   ["ACC-02", "ACC-03", "ACC-07", "NFR-11"], ["BR-ACC-02", "BR-ACC-03", "BR-ACC-05"], body=ref("LoginRequest"), resp=ref("Session"), rate=True,
   desc="Returns the session token to the BFF. Every failure returns the same 400 `invalid_credentials`. 5 failures in 15 minutes lock for 60 s per account and per IP (429 `login_locked`).")
op("post", f"{A}/auth/code/request", "authRequestLoginCode", "Send a one-time login code by SMS (phone OTP)", T, "public",
   ["ACC-02", "ACC-07"], ["BR-ACC-02", "BR-ACC-05"], body=ref("CodeRequest"), resp=ref("Session"), rate=True,
   desc="allauth login-by-code. 6 digits, valid 10 minutes, max 3 sends per phone per hour and 10 per IP per hour. Always answers the same way, even for unknown numbers.")
op("post", f"{A}/auth/code/confirm", "authConfirmLoginCode", "Confirm the one-time login code", T, "public",
   ["ACC-02"], ["BR-ACC-02"], body=ref("CodeConfirm"), resp=ref("Session"), rate=True,
   desc="5 wrong attempts invalidate the code (400 `invalid_code`, same for every failure).")
op("get", f"{A}/auth/session", "authGetSession", "Read the current session", T, "user",
   ["ACC-03"], ["BR-ACC-03"], resp=ref("Session"),
   desc="Used by both BFFs on every page render (cached per request). 401 when the token is unknown, expired or revoked.")
op("delete", f"{A}/auth/session", "authLogout", "Sign out (revoke the session token)", T, "user",
   ["ACC-03"], ["BR-ACC-03"], status=204, desc="Revokes the token server-side immediately; the BFF then deletes its cookie.")
op("post", f"{A}/auth/phone/verify", "authVerifyPhone", "Verify a phone number with the SMS code", T, "user",
   ["ACC-01", "ACC-06"], ["BR-ACC-01", "BR-ACC-02"], body=ref("CodeConfirm"), resp=ref("Session"), rate=True,
   desc="Completes `verify_phone` after signup or after PUT /me/phone. Required before the first booking (DEC-012).")
op("post", f"{A}/auth/email/verify", "authVerifyEmail", "Verify an email address with the emailed key", T, "public",
   ["ACC-01", "ACC-06"], ["BR-ACC-01"], body=obj({"key": STR}, ["key"]), resp=ref("Session"), rate=True)
op("post", f"{A}/auth/password/request", "authRequestPasswordReset", "Ask for a password reset (email link or SMS code)", T, "public",
   ["ACC-04"], ["BR-ACC-02"], body=ref("PasswordResetRequest"), status=204, rate=True,
   desc="Always 204, even for unknown accounts.")
op("post", f"{A}/auth/password/reset", "authResetPassword", "Set a new password with the reset key", T, "public",
   ["ACC-04"], ["BR-ACC-03"], body=ref("PasswordReset"), resp=ref("Session"), rate=True,
   desc="All other sessions of the user are revoked.")
op("post", f"{A}/auth/password/change", "authChangePassword", "Change password (signed in)", T, "user",
   ["ACC-04"], ["BR-ACC-03"], body=ref("PasswordChange"), status=204, rate=True,
   desc="Needs the current password (400 `invalid_current_password`). Revokes all other sessions. Replaces the website action changePasswordAction.")
op("post", f"{A}/auth/2fa/authenticate", "authMfaAuthenticate", "Second step of login: TOTP or recovery code", T, "public",
   ["ACC-05"], ["BR-ACC-04"], body=ref("MfaAuthenticate"), resp=ref("Session"), rate=True,
   desc="Called when the login response lists the pending flow `mfa_authenticate`. The partial session token is sent in X-Session-Token.")
op("get", f"{A}/auth/authenticators", "authListAuthenticators", "List my second factors", T, "user",
   ["ACC-05"], ["BR-ACC-04"], resp=list_of(ref("Authenticator")))
op("get", f"{A}/auth/authenticators/totp", "authGetTotpSetup", "Get a TOTP secret to enrol", T, "user",
   ["ACC-05"], ["BR-ACC-04"], resp=ref("TotpSetup"))
op("post", f"{A}/auth/authenticators/totp", "authEnrolTotp", "Enrol a TOTP authenticator", T, "user",
   ["ACC-05"], ["BR-ACC-04"], body=ref("CodeConfirm"), resp=ref("Authenticator"), status=201, conflict=True,
   desc="Hosts must enrol before editing payout details; staff before any admin endpoint.")

# ===========================================================================
# PUBLIC: geography and reference lists
# ===========================================================================
T = "public.geo"
op("get", f"{A}/geo/wilayas", "listWilayas", "List the 69 wilayas", T, "public",
   ["SRC-04"], ["BR-SRC-02"], resp=list_of(ref("Wilaya")), etag=True,
   desc="Static list, cached 24 h (Cache-Control public, ETag). Codes 59 to 69 still to confirm (DEC-013).")
op("get", f"{A}/geo/wilayas/{{wilaya_code}}/communes", "listWilayaCommunes", "List the communes of one wilaya", T, "public",
   ["SRC-04"], ["BR-SRC-02"], resp=list_of(ref("Commune")), etag=True)
op("get", f"{A}/geo/communes", "autocompleteCommunes", "Autocomplete communes by name (fr, ar, en)", T, "public",
   ["SRC-03", "SRC-04"], ["BR-SRC-02"],
   query=[qp("q", {"type": "string", "minLength": 2, "maxLength": 80}, "Part of the name. Accent and case insensitive, trigram match.", True, "tizi"),
          qp("wilaya", {"type": "integer", "minimum": 1, "maximum": 69}, "Limit to one wilaya."),
          qp("limit", {"type": "integer", "minimum": 1, "maximum": 20, "default": 10}, "Max results.")],
   resp=list_of(ref("Commune")), rate=True)
T = "public.reference"
op("get", f"{A}/reference", "getReferenceData", "All shared lists (types, amenities, policies, offer rules)", T, "public",
   ["LST-05", "LST-12", "TRP-07", "CFG-05", "HST-07"], ["BR-LST-04", "BR-LST-05", "BR-HST-05", "BR-CAN-01"],
   resp=ref("ReferenceData"), etag=True,
   desc="One cacheable document so both apps use the same lists (experience and trip types, DEC-015). Labels follow Accept-Language; `labels` gives all three.")
op("get", f"{A}/reference/reasons", "listReasonCodes", "Reason catalogue for an action", T, "public",
   ["MOD-03", "BKG-02", "CAN-02"], ["BR-BKG-03", "BR-REV-03"],
   query=[qp("action", {"type": "string", "enum": ["decline_booking", "cancel_booking_guest", "cancel_booking_host", "report_review", "report_listing", "dispute"]}, "Which action the reasons are for.", True)],
   resp=list_of(ref("ReasonCode")), etag=True)
op("get", f"{A}/onboarding-flows/{{host_type}}", "getPublishedOnboardingFlow", "Get the published onboarding flow for a host type", T, "public",
   ["CFG-04", "HST-01"], ["BR-HST-01", "BR-CFG-02"], resp=ref("OnboardingFlow"), etag=True,
   desc="Only the published version. The website renders the become-a-host wizard from it.")

# ===========================================================================
# PUBLIC: catalogue search and listing pages
# ===========================================================================
T = "public.catalog"
SEARCH_Q = [
    qp("vertical", arr(ref("Vertical")), "One or more verticals (hotel is its own vertical, DEC-005).", example=["home"]),
    qp("q", {"type": "string", "maxLength": 120}, "Free text on title and place names in fr, ar, en (trigram, accent tolerant). Replaces the website `destination` parameter."),
    qp("wilaya", {"type": "integer", "minimum": 1, "maximum": 69}, "Wilaya code."),
    qp("commune", {"type": "integer"}, "Commune id."),
    qp("check_in", {"type": "string", "format": "date"}, "Stays and vehicles: first night. Experiences: first day of the window."),
    qp("check_out", {"type": "string", "format": "date"}, "Exclusive end. Must be after check_in; max 90 nights."),
    qp("guests", {"type": "integer", "minimum": 1, "maximum": 50}, "Total guests (adults + children)."),
    qp("rooms", {"type": "integer", "minimum": 1, "maximum": 20}, "Hotels and hostels: rooms (or beds) needed."),
    qp("min_price_minor", {"type": "integer", "format": "int64", "minimum": 0}, "Minimum price per unit (night, day or person) in centimes."),
    qp("max_price_minor", {"type": "integer", "format": "int64", "minimum": 0}, "Maximum price per unit in centimes."),
    qp("property_type", arr(STR), "Property type slugs."),
    qp("category", STR, "Category slug."),
    qp("amenities", arr(STR), "Amenity slugs; a listing must have all of them."),
    qp("experience_type", arr(ref("ExperienceType")), "Experience types (the website's `expType`). Only with vertical=experience."),
    qp("host_type", arr(ref("HostType")), "Host types."),
    qp("host_account", {"type": "string", "format": "uuid"}, "Only listings of one host account (public organisation or host page)."),
    qp("bedrooms_min", {"type": "integer", "minimum": 0}, "Minimum bedrooms."),
    qp("bathrooms_min", {"type": "integer", "minimum": 0}, "Minimum bathrooms."),
    qp("min_rating", {"type": "number", "minimum": 1, "maximum": 5}, "Minimum average rating."),
    qp("instant", {"type": "boolean"}, "Only listings that resolve to instant booking."),
    qp("featured", {"type": "boolean"}, "Only featured listings (home page rows)."),
    qp("bbox", arr({"type": "number"}, minItems=4, maxItems=4), "Map box: min_lng,min_lat,max_lng,max_lat. Uses public points only (SRC-02).", example=[2.3, 36.4, 3.3, 36.9]),
]
op("get", f"{A}/listings", "searchListings", "Search listings", T, "optional",
   ["SRC-01", "SRC-02", "SRC-03", "SRC-05", "SRC-06", "AVL-04", "LST-12", "NFR-02"],
   ["BR-SRC-01", "BR-SRC-03", "BR-SRC-04", "BR-AVL-05", "BR-LST-05"],
   query=SEARCH_Q + [qp("ordering", {"type": "string", "enum": ["relevance", "price", "-price", "rating", "newest"], "default": "relevance"}, "Sort order."),
                     P("Cursor"), P("Limit")],
   resp=cursor_of(ref("ListingCard"), {"total_estimate": d(INT, "Approximate total, for 'about N stays'.")}),
   desc="Only published listings of approved, non-suspended hosts (BR-SRC-01). With dates, keeps listings whose free nights overlap and returns `matched_availability` (BR-AVL-05). Session is optional: when present, `is_favorite` is filled.")
op("get", f"{A}/listings/facets", "getListingFacets", "Facet counts for the current search", T, "public",
   ["SRC-01", "LST-12"], ["BR-SRC-01", "BR-LST-05"], query=SEARCH_Q,
   resp=obj({"total": INT, "facets": ref("Facets"),
             "price_histogram": arr(obj({"from_minor": I64, "to_minor": I64, "count": INT}, ["from_minor", "to_minor", "count"]))}, ["total", "facets"]),
   desc="Same filters as search. Each facet (vertical, experience_type, property_type, amenities, wilaya, host_type, instant) is counted without its own filter.")
op("get", f"{A}/listings/map", "searchListingsMap", "Map pins for the current search (max 500)", T, "public",
   ["SRC-02"], ["BR-SRC-03"], query=SEARCH_Q, resp=obj({"pins": arr(ref("MapPin")), "truncated": BOOL}, ["pins", "truncated"]))
op("get", f"{A}/listings/{{listing_id}}", "getListing", "Public listing page", T, "optional",
   ["LST-06", "LST-10", "LST-11", "SRC-06"], ["BR-SRC-01", "BR-SRC-03", "BR-BKG-02"], resp=ref("ListingDetail"), etag=True,
   desc="`listing_id` is the UUID or the reference (LST-XXXXXX). 404 for unpublished listings, except for members of the owning host account (they see a preview).")
op("get", f"{A}/listings/{{listing_id}}/availability", "getListingAvailability", "Free nights, units or slots for a period", T, "public",
   ["AVL-04", "AVL-02", "LST-11"], ["BR-AVL-04", "BR-AVL-05", "BR-AVL-02"],
   query=[qp("from", DATE, "First day (default today).", ), qp("to", DATE, "Last day, exclusive; max 400 days after from."),
          qp("room_type_id", UUID, "For hotels and hostels.")],
   resp=ref("Availability"))
op("get", f"{A}/listings/{{listing_id}}/reviews", "listListingReviews", "Published reviews of a listing", T, "public",
   ["REV-05", "REV-03"], ["BR-REV-03", "BR-REV-04"], query=[P("Cursor"), P("Limit")],
   resp=cursor_of(ref("Review"), {"summary": ref("RatingSummary")}))
op("post", f"{A}/quotes", "createQuote", "Get a server price quote", T, "optional",
   ["PRC-01", "PRC-02", "PRC-03", "PRC-04", "PRC-05", "PAY-12", "AVL-04", "BKG-09"], ["BR-PRC-01", "BR-PRC-02", "BR-PRC-03", "BR-PRC-04", "BR-PAY-01", "BR-AVL-05", "BR-BKG-02", "BR-SYS-05"],
   body=ref("QuoteRequest"), resp=ref("Quote"), status=201, rate=True, conflict=True,
   desc="The only place prices are computed. Valid 30 minutes. 409 `dates_unavailable`, `not_enough_units` or `seats_unavailable` when the stay cannot be booked; 422 for stay rules (`min_nights`, `max_nights`, `advance_notice`, `capacity_exceeded`).")
op("get", f"{A}/quotes/{{quote_id}}", "getQuote", "Read a quote again", T, "optional",
   ["PRC-01"], ["BR-PRC-01"], resp=ref("Quote"), desc="410 is not used: an expired quote is returned with its expires_at in the past.")

T = "public.trips"
op("get", f"{A}/trips", "searchTrips", "Search agency trips", T, "optional",
   ["TRP-05", "TRP-07", "SRC-05"], ["BR-SRC-01", "BR-LST-05"],
   query=[qp("q", {"type": "string", "maxLength": 120}, "Free text (title, places)."),
          qp("trip_type", arr(ref("TripType")), "Trip types."),
          qp("wilaya", {"type": "integer"}, "Start wilaya."),
          qp("date_from", DATE, "Departures overlapping this window."), qp("date_to", DATE, "End of the window."),
          qp("guests", {"type": "integer", "minimum": 1}, "Seats needed."),
          qp("max_price_minor", I64, "Max price per person in centimes."),
          qp("duration_min", {"type": "integer"}, "Min days."), qp("duration_max", {"type": "integer"}, "Max days."),
          qp("host_account", UUID, "One agency."), qp("featured", BOOL, "Featured only."),
          qp("ordering", {"type": "string", "enum": ["relevance", "price", "-price", "next_departure", "rating"]}, "Sort."),
          P("Cursor"), P("Limit")],
   resp=cursor_of(ref("TripCard")))
op("get", f"{A}/trips/{{trip_id}}", "getTrip", "Public trip page (path accepts the trip id or its slug)", T, "optional",
   ["TRP-02", "TRP-03"], ["BR-SRC-01"], resp=ref("TripDetail"), etag=True,
   desc="`trip_id` is the UUID or the reference. Old website slugs redirect (301) to the reference.")
op("get", f"{A}/trips/{{trip_id}}/departures", "listTripDepartures", "Upcoming departures with seats left", T, "public",
   ["TRP-03", "BKG-09"], ["BR-TRP-02"], query=[qp("from", DATE, "Default today."), qp("to", DATE, "Optional end.")],
   resp=list_of(ref("Departure")), desc="Replaces seatsSoldByDeparture: seats_left is computed by the database counters.")
op("get", f"{A}/trips/{{trip_id}}/reviews", "listTripReviews", "Published reviews of a trip", T, "public",
   ["REV-05"], ["BR-REV-04"], query=[P("Cursor"), P("Limit")], resp=cursor_of(ref("Review"), {"summary": ref("RatingSummary")}))

T = "public.profiles"
op("get", f"{A}/organizations", "listPublicOrganizations", "List verified organisations (sitemap, directory)", T, "public",
   ["ORG-07"], ["BR-SRC-01"], query=[qp("business_category", ref("BusinessCategory"), "Filter."), P("Cursor"), P("Limit")],
   resp=cursor_of(ref("PublicOrganization")))
op("get", f"{A}/organizations/{{org_slug}}", "getPublicOrganization", "Public organisation profile", T, "public",
   ["ORG-07"], ["BR-SRC-01"], resp=ref("PublicOrganization"), etag=True,
   desc="Listings and trips of the organisation come from GET /listings?host_account= and GET /trips?host_account=.")
op("get", f"{A}/users/{{user_id}}", "getPublicUser", "Public user profile", T, "public",
   ["ACC-06"], ["BR-SRC-03"], resp=ref("PublicUser"))
op("get", f"{A}/users/{{user_id}}/reviews", "listUserReviews", "Reviews written by a user or received as a host", T, "public",
   ["REV-05"], ["BR-REV-04"], query=[qp("role", {"type": "string", "enum": ["author", "host"], "default": "host"}, "author = written by the user; host = received on their individual host account."),
                                       P("Cursor"), P("Limit")], resp=cursor_of(ref("Review")))

# ===========================================================================
# ME (guest)
# ===========================================================================
T = "me.profile"
op("get", f"{A}/me", "getMe", "My profile", T, "user", ["ACC-06", "ACC-08"], ["BR-ACC-01", "BR-ORG-01"], resp=ref("Me"))
op("patch", f"{A}/me", "updateMe", "Update my profile", T, "user", ["ACC-06"], ["BR-SYS-04"], body=ref("MeUpdate"), resp=ref("Me"),
   desc="Name in Latin and Arabic, avatar, language. Website fields bio, address and languages are not in the schema (see 06-api-design.md, gaps).")
op("put", f"{A}/me/phone", "changeMyPhone", "Start a phone change (sends an SMS code)", T, "user", ["ACC-06", "ACC-01"], ["BR-ACC-01", "BR-ACC-02"],
   body=ref("PhoneChange"), status=202, rate=True, conflict=True,
   resp=obj({"pending_flow": {"type": "string", "enum": ["verify_phone"]}}, ["pending_flow"]),
   desc="The new number is saved only after POST /auth/phone/verify. 409 `phone_taken`.")
op("get", f"{A}/me/consents", "listMyConsents", "My current consents", T, "user", ["PRV-01"], ["BR-PRV-01"], resp=list_of(ref("Consent")))
op("post", f"{A}/me/consents", "recordMyConsent", "Accept or withdraw a consent (terms, privacy, marketing)", T, "user", ["PRV-01", "NTF-03"], ["BR-PRV-01"],
   body=ref("ConsentCreate"), resp=ref("Consent"), status=201, desc="Append-only: a new row each time, with time and IP.")
op("get", f"{A}/me/data-requests", "listMyDataRequests", "My data protection requests", T, "user", ["PRV-02"], ["BR-PRV-02"], resp=list_of(ref("DataSubjectRequest")))
op("post", f"{A}/me/data-requests", "createMyDataRequest", "Ask for my data, a correction or deletion", T, "user", ["PRV-02"], ["BR-PRV-02"],
   body=ref("DataSubjectRequestCreate"), resp=ref("DataSubjectRequest"), status=201, conflict=True,
   desc="409 when a request of the same kind is still open. Deletion anonymises the profile and keeps legal records.")
T = "me.favorites"
op("get", f"{A}/me/favorites", "listMyFavorites", "My favourites", T, "user", ["ACC-09"], [],
   query=[qp("target_type", {"type": "string", "enum": ["listing", "trip"]}, "Filter."), P("Cursor"), P("Limit")], resp=cursor_of(ref("Favorite")))
op("put", f"{A}/me/favorites/{{target_type}}/{{target_id}}", "addMyFavorite", "Add a listing or trip to favourites", T, "user", ["ACC-09"], [],
   status=204, desc="Idempotent: adding twice is fine.")
op("delete", f"{A}/me/favorites/{{target_type}}/{{target_id}}", "removeMyFavorite", "Remove from favourites", T, "user", ["ACC-09"], [], status=204,
   desc="Idempotent: removing a missing favourite returns 204.")
T = "me.notifications"
op("get", f"{A}/me/notifications", "listMyNotifications", "My notifications, newest first", T, "user", ["NTF-01"], ["BR-NTF-01"],
   query=[qp("unread", BOOL, "Only unread."), P("Cursor"), P("Limit")], resp=cursor_of(ref("Notification"), {"unread_count": INT}))
op("post", f"{A}/me/notifications/{{notification_id}}/read", "markMyNotificationRead", "Mark one notification as read", T, "user", ["NTF-01"], ["BR-NTF-01"], status=204)
op("post", f"{A}/me/notifications/read-all", "markAllMyNotificationsRead", "Mark all my notifications as read", T, "user", ["NTF-01"], ["BR-NTF-01"], status=204)
op("get", f"{A}/me/notification-preferences", "listMyNotificationPreferences", "My notification preferences", T, "user", ["NTF-03"], ["BR-PRV-03"],
   resp=list_of(ref("NotificationPreference")), release="R2")
op("put", f"{A}/me/notification-preferences", "replaceMyNotificationPreferences", "Change my notification preferences", T, "user", ["NTF-03"], ["BR-PRV-03"],
   body=list_of(ref("NotificationPreference")), resp=list_of(ref("NotificationPreference")), release="R2",
   desc="Critical messages stay on (422 `preference_locked`).")

T = "me.bookings"
op("post", f"{A}/me/bookings", "createBooking", "Book from a quote (instant or request)", T, "user",
   ["BKG-01", "BKG-02", "BKG-05", "BKG-06", "BKG-09", "BKG-10", "AVL-01", "AVL-02", "PAY-03", "ACC-01"],
   ["BR-BKG-01", "BR-BKG-02", "BR-BKG-03", "BR-BKG-07", "BR-AVL-01", "BR-AVL-02", "BR-TRP-02", "BR-PRC-01", "BR-PAY-04", "BR-PAY-10", "BR-SYS-01", "BR-ACC-01"],
   body=ref("BookingCreate"), resp=ref("GuestBooking"), status=201, idem="required", conflict=True, rate=True,
   desc="One database transaction: re-price the quote, lock inventory (exclusion constraint for single units, atomic counter update for pools and seats), resolve approval mode, create the booking with its snapshot, post the commission if confirmed, write outbox events.\n\n"
        "Errors: 403 `phone_verification_required`; 403 `cannot_book_own_listing`; 409 `dates_unavailable` / `not_enough_units` / `seats_unavailable` (lost the race); "
        "409 `price_changed` (body has the new `quote`); 409 `quote_expired`; 409 `idempotency_in_progress`; 422 `idempotency_key_reused` (same key, different body).")
op("get", f"{A}/me/bookings", "listMyBookings", "My bookings (trips page)", T, "user", ["BKG-07"], ["BR-BKG-06"],
   query=[qp("status", arr(ref("BookingStatus")), "Filter."), qp("when", {"type": "string", "enum": ["upcoming", "past", "all"], "default": "all"}, "Time filter."),
          P("Cursor"), P("Limit")], resp=cursor_of(ref("GuestBooking")))
op("get", f"{A}/me/bookings/{{booking_id}}", "getMyBooking", "One of my bookings", T, "user", ["BKG-07", "BKG-08", "NFR-12"], ["BR-SRC-03", "BR-BKG-07"], resp=ref("GuestBooking"),
   desc="`booking_id` is the UUID or the reference BLD-YYYY-XXXXXX. 404 if it is not mine.")
op("get", f"{A}/me/bookings/{{booking_id}}/cancellation-preview", "previewMyBookingCancellation", "What I would get back if I cancel now", T, "user",
   ["CAN-01"], ["BR-CAN-01", "BR-CAN-02"], resp=ref("CancellationPreview"))
op("post", f"{A}/me/bookings/{{booking_id}}/cancel", "cancelMyBooking", "Cancel my booking or withdraw my request", T, "user",
   ["CAN-01", "CAN-04", "BKG-05"], ["BR-CAN-01", "BR-CAN-02", "BR-PAY-05", "BR-BKG-06"], body=ref("GuestCancel"), body_required=False,
   resp=ref("GuestBooking"), idem="optional", conflict=True,
   desc="pending: withdraw (nothing to refund). confirmed: refund by the snapshot policy; commission on the refunded share goes back to the host wallet. 409 `booking_not_cancellable` (after check-in time, or final state), 409 `refund_changed`.")
op("post", f"{A}/me/bookings/{{booking_id}}/review", "createMyReview", "Review a completed stay", T, "user",
   ["REV-01"], ["BR-REV-01", "BR-REV-02"], body=ref("ReviewCreate"), resp=ref("Review"), status=201, conflict=True,
   desc="Only for a completed booking, within 14 days after check-out, once (409 `review_exists`, 422 `review_window_closed`).")
op("post", f"{A}/me/bookings/{{booking_id}}/dispute", "openMyDispute", "Open a dispute about a booking", T, "user",
   ["BKG-11"], ["BR-CAN-05"], body=ref("DisputeCreate"), resp=ref("Dispute"), status=201, conflict=True, release="R2",
   desc="Until 14 days after check-out (422 `dispute_window_closed`).")
op("post", f"{A}/me/bookings/{{booking_id}}/payments", "createGuestPayment", "Pay a booking online (guest payment)", T, "user",
   ["PAY-10"], ["BR-PAY-11"], resp=ref("Payment"), status=201, idem="required", dormant=True, release="Later",
   desc="DORMANT. Only exists when the money model moves to M2 to M4. Returns 404 while the `guest_payments` flag is off.")
op("get", f"{A}/me/reviews", "listMyReviews", "Reviews I wrote", T, "user", ["REV-01"], ["BR-REV-01"], query=[P("Cursor"), P("Limit")], resp=cursor_of(ref("Review")))
op("post", f"{A}/reviews/{{review_id}}/reports", "reportReview", "Report a review", T, "user", ["REV-04"], ["BR-REV-03"],
   body=ref("ReviewReport"), status=204, conflict=True, rate=True, desc="One report per user and review (409 `already_reported`).")
op("post", f"{A}/me/invitations/accept", "acceptInvitation", "Accept an organisation invitation", T, "user",
   ["ORG-03", "ACC-08"], ["BR-ORG-03", "BR-ORG-01"], body=ref("InvitationAccept"), resp=ref("Workspace"), conflict=True, rate=True,
   desc="The signed-in user's verified email or phone must match the invitation. 409 `invitation_used`; 422 `invitation_expired`; 403 `invitation_contact_mismatch`.")

# ===========================================================================
# MESSAGING (guest and host share these; host side uses X-Host-Account)
# ===========================================================================
T = "messaging"
op("get", f"{A}/conversations", "listConversations", "My conversations", T, "user", ["MSG-01", "MSG-03"], ["BR-ORG-01"],
   query=[qp("as", {"type": "string", "enum": ["guest", "host"], "default": "guest"}, "guest = my own threads; host = threads of the active host account (needs messages.reply)."),
          P("XHostAccount"), qp("unread", BOOL, "Only threads with unread messages."), P("Cursor"), P("Limit")],
   resp=cursor_of(ref("Conversation"), {"unread_total": INT}))
op("post", f"{A}/conversations", "startConversation", "Start (or find) a conversation about a listing, trip or booking", T, "user",
   ["MSG-01"], ["BR-MSG-01"], body=ref("ConversationCreate"), resp=ref("Conversation"), status=201, rate=True,
   desc="Returns 200 with the existing thread when it already exists. 422 `cannot_message_self`.")
op("get", f"{A}/conversations/sync", "syncConversations", "Changes since a cursor (polling)", T, "user",
   ["MSG-02", "MSG-03"], ["BR-MSG-01"],
   query=[qp("after", STR, "Cursor from the previous sync. Omit on the first call to get the current cursor and unread counts."),
          qp("as", {"type": "string", "enum": ["guest", "host"], "default": "guest"}, "Which side."), P("XHostAccount")],
   resp=ref("SyncResponse"),
   desc="Clients poll every 5 to 15 s while a thread is open and every 60 s otherwise (poll_after_ms). Cheap when nothing changed: one indexed query on message.id.")
op("get", f"{A}/conversations/{{conversation_id}}", "getConversation", "One conversation", T, "user", ["MSG-01"], ["BR-ORG-01"], resp=ref("Conversation"))
op("get", f"{A}/conversations/{{conversation_id}}/messages", "listMessages", "Messages of a conversation", T, "user",
   ["MSG-01", "MSG-02", "MSG-04"], ["BR-MSG-01"],
   query=[qp("after", I64, "Return messages with id greater than this (new messages), oldest first."),
          qp("before", I64, "Return messages with id less than this (older history), newest first."), P("Limit")],
   resp=obj({"results": arr(ref("Message")), "has_more": BOOL, "last_read_message_id": nullable(I64)}, ["results", "has_more"]))
op("post", f"{A}/conversations/{{conversation_id}}/messages", "sendMessage", "Send a message", T, "user",
   ["MSG-01", "MSG-04"], ["BR-MSG-01"], body=ref("MessageCreate"), resp=ref("Message"), status=201, rate=True,
   desc="Contact details are masked for the other side until a booking is confirmed (BR-MSG-01). A retry with the same client_message_id returns the first message.")
op("post", f"{A}/conversations/{{conversation_id}}/read", "markConversationRead", "Move my read pointer", T, "user",
   ["MSG-03"], [], body=ref("ReadMarker"), status=204, desc="The pointer never moves backwards.")

# ===========================================================================
# MEDIA
# ===========================================================================
T = "media"
op("post", f"{A}/media/uploads", "createUpload", "Get a presigned upload URL", T, "user",
   ["MED-01", "MED-02", "MSG-05"], ["BR-MED-01", "BR-MED-02"], body=ref("UploadRequest"), resp=ref("UploadTicket"), status=201, rate=True,
   desc="Documents need an active host workspace (X-Host-Account). 422 `file_type_not_allowed`, `file_too_large`.")
op("post", f"{A}/media/{{media_id}}/complete", "completeUpload", "Tell the server the upload finished", T, "user",
   ["MED-01", "MED-02"], ["BR-MED-01", "BR-MED-02"], resp=ref("Media"), status=202, conflict=True,
   desc="Starts checks (type, virus scan for documents, EXIF strip, renditions, duplicate hash). Status moves from quarantined to ready or rejected.")
op("get", f"{A}/media/{{media_id}}", "getMedia", "Upload status and renditions", T, "user", ["MED-01"], ["BR-MED-01"], resp=ref("Media"))
op("get", f"{A}/media/{{media_id}}/url", "getPrivateMediaUrl", "Short-lived URL for a private file", T, "user",
   ["MED-02"], ["BR-MED-02", "BR-STF-02"], resp=ref("SignedUrl"), desc="Owner only (staff use the admin endpoint). Valid 5 minutes; every call is audited.")

# ===========================================================================
# HOST: workspaces, account, onboarding, documents, payout details
# ===========================================================================
T = "host.workspace"
op("get", f"{A}/me/workspaces", "listMyWorkspaces", "Host accounts I can act for (workspace switcher)", T, "user",
   ["ORG-02", "ACC-08"], ["BR-ORG-01"], resp=ref("WorkspaceList"),
   desc="My individual host account (if any) plus every organisation where I have an active membership. Replaces getMembershipsForUser.")
op("put", f"{A}/me/workspaces/active", "switchWorkspace", "Switch the active host account", T, "user",
   ["ORG-02"], ["BR-ORG-01"], body=ref("WorkspaceSwitch"), resp=ref("Workspace"),
   desc="Stored in the server session. 404 when the user does not hold that host account (never 403, so ids cannot be probed).")
op("get", f"{A}/host/account", "getActiveHostAccount", "The active host account", T, "host",
   ["ORG-02", "HST-04", "HST-06", "HST-07"], ["BR-ORG-01", "BR-HST-04", "BR-HST-05", "BR-PAY-06"], resp=ref("HostAccount"))
op("patch", f"{A}/host/account", "updateActiveHostAccount", "Change the default approval mode", T, "host",
   ["HST-06"], ["BR-BKG-02"], body=ref("HostAccountUpdate"), resp=ref("HostAccount"), perm="org.edit",
   desc="Applies to new listings and to listings without their own mode. Replaces setBookingApprovalModeAction.")
T = "host.onboarding"
op("get", f"{A}/host/onboarding/drafts", "listOnboardingDrafts", "My onboarding drafts", T, "user", ["HST-02"], ["BR-HST-02"], resp=list_of(ref("OnboardingDraft")))
op("get", f"{A}/host/onboarding/drafts/{{host_type}}", "getOnboardingDraft", "My draft for one host type", T, "user", ["HST-02"], ["BR-HST-02"], resp=ref("OnboardingDraft"))
op("put", f"{A}/host/onboarding/drafts/{{host_type}}", "saveOnboardingDraft", "Save my draft (create or replace)", T, "user",
   ["HST-02", "CFG-04"], ["BR-HST-02"], body=ref("OnboardingDraftWrite"), resp=ref("OnboardingDraft"), if_match=False, conflict=True,
   desc="Starts from the published flow version on first save; answers are checked against that version (422 `unknown_field`). 409 `draft_submitted`.")
op("delete", f"{A}/host/onboarding/drafts/{{host_type}}", "abandonOnboardingDraft", "Abandon my draft", T, "user", ["HST-02"], ["BR-HST-02"], status=204)
op("post", f"{A}/host/onboarding/drafts/{{host_type}}/submit", "submitOnboarding", "Finish onboarding: create the host account", T, "user",
   ["HST-01", "HST-02", "ORG-01", "HST-07", "LST-01", "CFG-04"], ["BR-HST-01", "BR-HST-02", "BR-ORG-02", "BR-HST-05", "BR-LST-01"],
   resp=ref("OnboardingResult"), status=201, idem="required", conflict=True,
   desc="Individual: creates the individual host account and the first listing as a draft. Agency, hotel, hostel: creates the organisation (owner membership, invitations) and, for hotels and hostels, the property draft. Verification starts at `applied`. Replaces completeHostOnboardingAction and createOrganization.")
T = "host.verification"
op("get", f"{A}/host/documents", "listHostDocuments", "Verification documents of the active host account", T, "host", ["HST-03", "MOD-08"], ["BR-HST-03"],
   resp=list_of(ref("HostDocument")), perm="org.edit")
op("post", f"{A}/host/documents", "addHostDocument", "Attach an uploaded document", T, "host", ["HST-03", "MED-02"], ["BR-HST-03", "BR-MED-02"],
   body=ref("HostDocumentCreate"), resp=ref("HostDocument"), status=201, perm="org.edit")
op("delete", f"{A}/host/documents/{{document_id}}", "removeHostDocument", "Remove a pending or rejected document", T, "host", ["HST-03"], ["BR-HST-03"],
   status=204, perm="org.edit", conflict=True, desc="409 `document_already_approved`.")
op("post", f"{A}/host/verification/submit", "submitHostVerification", "Send the host account for review (or resubmit)", T, "host",
   ["HST-04", "MOD-02"], ["BR-HST-03", "BR-HST-04", "BR-MOD-01", "BR-MOD-02"], resp=ref("HostAccount"), perm="org.edit", conflict=True,
   desc="applied or changes_requested to under_review. 422 `documents_missing` lists the required document types still missing. Resets the queue waiting time.")
op("get", f"{A}/host/change-requests", "listHostChangeRequests", "What moderators asked me to fix", T, "host", ["MOD-02"], ["BR-MOD-02"],
   query=[qp("open", BOOL, "Only unresolved items (default true).")], resp=list_of(ref("ChangeRequestItem")))
op("get", f"{A}/host/payout-accounts", "listPayoutAccounts", "Refund and payout account details", T, "host", ["HST-05"], ["BR-PAY-09"],
   resp=list_of(ref("PayoutAccount")), perm="payout_details.edit")
op("post", f"{A}/host/payout-accounts", "addPayoutAccount", "Add a CCP, bank or BaridiMob account", T, "host", ["HST-05", "ACC-05"], ["BR-PAY-09", "BR-ACC-04"],
   body=ref("PayoutAccountCreate"), resp=ref("PayoutAccount"), status=201, perm="payout_details.edit",
   desc="Needs a second factor confirmed in the last 5 minutes (403 `mfa_required`). Notifies the old email and phone; blocks payouts 72 h.")
op("delete", f"{A}/host/payout-accounts/{{payout_account_id}}", "removePayoutAccount", "Remove an account", T, "host", ["HST-05"], ["BR-PAY-09", "BR-ACC-04"],
   status=204, perm="payout_details.edit")

op("get", f"{A}/host/integrations", "listPropertyIntegrations", "Connections to the hotel's own system", "host.organization", "host", ["HST-08"], ["BR-HST-06"],
   resp=list_of(ref("PropertyIntegration")), perm="listings.manage")
op("post", f"{A}/host/integrations", "createPropertyIntegration", "Connect a channel manager, PMS, iCal feed or CSV import", "host.organization", "host", ["HST-08"], ["BR-HST-06"],
   body=ref("PropertyIntegrationCreate"), resp=ref("PropertyIntegration"), status=201, perm="listings.manage",
   desc="Hotels and hostels only. The connection is tested first; credentials are stored encrypted and never returned.")
op("delete", f"{A}/host/integrations/{{integration_id}}", "removePropertyIntegration", "Disconnect the hotel system (imported data stays, becomes editable)", "host.organization", "host", ["HST-08"], ["BR-HST-06"],
   status=204, perm="listings.manage")
op("post", f"{A}/host/integrations/{{integration_id}}/sync", "syncPropertyIntegration", "Import rooms, availability, prices and services now", "host.organization", "host", ["HST-08"], ["BR-HST-06"],
   resp=ref("IntegrationSyncRun"), status=202, perm="listings.manage")
op("get", f"{A}/host/integrations/{{integration_id}}/runs", "listIntegrationSyncRuns", "History of sync runs", "host.organization", "host", ["HST-08"], ["BR-HST-06"],
   resp=list_of(ref("IntegrationSyncRun")), perm="listings.manage")
op("get", f"{A}/listings/{{listing_id}}/services", "listPropertyServices", "Services of a hotel or hostel (restaurants, spa, parking...)", "public.catalog", "public", ["HST-08"], ["BR-HST-06"],
   resp=list_of(ref("PropertyService")))

# ===========================================================================
# HOST: organisation and team
# ===========================================================================
T = "host.organization"
op("get", f"{A}/host/organization", "getMyOrganization", "The active organisation (private view)", T, "host", ["ORG-01", "ORG-06"], ["BR-ORG-02"],
   resp=ref("Organization"), desc="404 `not_an_organization` when the active host account is an individual.")
op("patch", f"{A}/host/organization", "updateMyOrganization", "Edit the organisation", T, "host", ["ORG-06", "ORG-01"], ["BR-ORG-02", "BR-ORG-06"],
   body=ref("OrganizationUpdate"), resp=ref("Organization"), perm="org.edit", if_match=True,
   desc="Legal field changes send verification back to review (BR-ORG-06). Optimistic locking with If-Match.")
op("delete", f"{A}/host/organization", "deleteMyOrganization", "Delete the organisation (soft)", T, "host", ["ORG-04", "LST-08"], ["BR-ORG-04", "BR-LST-03"],
   query=[qp("confirm_name", STR, "Must equal the display name exactly.", True)], status=204, perm="org.delete", conflict=True,
   desc="Soft delete; listings and trips are archived; 409 `has_future_bookings` while confirmed bookings remain.")
op("get", f"{A}/host/organization/members", "listMembers", "Team members", T, "host", ["ORG-04", "ORG-05"], ["BR-ORG-05"], resp=list_of(ref("Member")))
op("patch", f"{A}/host/organization/members/{{membership_id}}", "changeMemberRole", "Change a member's role", T, "host", ["ORG-04", "ORG-05"], ["BR-ORG-04", "BR-ORG-05"],
   body=ref("MemberUpdate"), resp=ref("Member"), perm="members.manage", desc="Owner role cannot be given or taken here (422 `use_ownership_transfer`). Only the owner can grant admin.")
op("delete", f"{A}/host/organization/members/{{membership_id}}", "removeMember", "Remove a member", T, "host", ["ORG-04"], ["BR-ORG-04"],
   status=204, perm="members.manage", conflict=True, desc="Soft (is_active false). The owner cannot be removed (409 `cannot_remove_owner`). Admins remove managers, agents, guides only.")
op("post", f"{A}/host/organization/transfer-ownership", "transferOwnership", "Make another member the owner", T, "host", ["ORG-04"], ["BR-ORG-04", "BR-STF-02"],
   body=ref("OwnershipTransfer"), resp=list_of(ref("Member")), perm="owner only", conflict=True,
   desc="Owner only. The old owner becomes admin; exactly one owner is guaranteed by a database index. Audited.")
op("get", f"{A}/host/organization/invitations", "listInvitations", "Pending and past invitations", T, "host", ["ORG-03"], ["BR-ORG-03"],
   resp=list_of(ref("Invitation")), perm="members.manage")
op("post", f"{A}/host/organization/invitations", "inviteMember", "Invite someone by email or phone", T, "host", ["ORG-03"], ["BR-ORG-03"],
   body=ref("InvitationCreate"), resp=ref("Invitation"), status=201, perm="members.manage", conflict=True, rate=True,
   desc="Expires in 7 days. 409 `already_member` or `invitation_pending`.")
op("delete", f"{A}/host/organization/invitations/{{invitation_id}}", "revokeInvitation", "Revoke an invitation", T, "host", ["ORG-03"], ["BR-ORG-03"],
   status=204, perm="members.manage")

# ===========================================================================
# HOST: listings, room types, slots, calendar
# ===========================================================================
T = "host.listings"
HOST_LISTING_Q = [qp("status", arr(ref("ListingStatus")), "Filter."), qp("vertical", arr(ref("Vertical")), "Filter."),
                  qp("q", STR, "Title or reference."), P("Cursor"), P("Limit")]
op("get", f"{A}/host/listings", "listHostListings", "Listings of the active host account (all statuses)", T, "host",
   ["LST-01", "LST-03", "BKG-07"], ["BR-ORG-01", "BR-LST-03"], query=HOST_LISTING_Q, resp=cursor_of(ref("HostListing")), perm="listings.manage or bookings.view")
op("post", f"{A}/host/listings", "createHostListing", "Create a listing (draft)", T, "host",
   ["LST-01", "HST-07", "LST-04", "LST-05", "LST-06", "LST-07", "LST-10", "LST-11", "LST-12"],
   ["BR-HST-05", "BR-LST-01", "BR-LST-05", "BR-SRC-02", "BR-SRC-03", "BR-PRC-03", "BR-PAY-01"],
   body=ref("ListingWrite"), resp=ref("HostListing"), status=201, idem="required", perm="listings.manage",
   desc="Offer rule (DEC-014): individual = home, vehicle; agency = experience; hotel = hotel; hostel = hostel. Otherwise 403 `host_offer_not_allowed`. Status starts at draft (never live at once, DEC-003).")
op("get", f"{A}/host/listings/{{listing_id}}", "getHostListing", "One listing with private fields", T, "host", ["LST-01"], ["BR-ORG-01", "BR-SRC-03"], resp=ref("HostListing"))
op("patch", f"{A}/host/listings/{{listing_id}}", "updateHostListing", "Edit a listing", T, "host",
   ["LST-01", "LST-02", "LST-07", "PRC-03", "HST-07", "LST-12"], ["BR-LST-02", "BR-HST-05", "BR-LST-05", "BR-PRC-03"],
   body=ref("ListingWrite"), resp=ref("HostListing"), perm="listings.manage", if_match=True,
   desc="Body fields are all optional here. On a published listing, edits of title, description, photos, location, vertical, capacity or room types create a pending revision (BR-LST-02); price, calendar and rules apply at once.")
op("delete", f"{A}/host/listings/{{listing_id}}", "deleteHostListing", "Delete a listing (soft)", T, "host", ["LST-08"], ["BR-LST-03"],
   status=204, perm="listings.manage", conflict=True, desc="Soft delete; bookings are kept; staff can restore. 409 `has_future_bookings`.")
op("post", f"{A}/host/listings/{{listing_id}}/status", "changeHostListingStatus", "Submit, withdraw, pause, resume or archive", T, "host",
   ["LST-02", "LST-03", "LST-08", "BKG-02"], ["BR-LST-02", "BR-LST-03", "BR-LST-01", "BR-MED-01"],
   body=ref("HostStatusChange"), resp=ref("HostListing"), perm="listings.manage", conflict=True,
   desc="Only moves allowed for hosts in table 4a (409 `invalid_transition`). Submitting checks completeness (422 `listing_incomplete` with field errors, e.g. photos < 5, hotel without room type).")
op("put", f"{A}/host/listings/{{listing_id}}/photos", "replaceListingPhotos", "Order photos and choose the cover", T, "host", ["MED-03", "MED-01"], ["BR-MED-01", "BR-LST-02"],
   body=ref("PhotosReplace"), resp=list_of(ref("PhotoRef")), perm="listings.manage")
op("get", f"{A}/host/listings/{{listing_id}}/room-types", "listRoomTypes", "Room types of a hotel or hostel", T, "host", ["LST-04"], ["BR-AVL-03"], resp=list_of(ref("RoomType")))
op("post", f"{A}/host/listings/{{listing_id}}/room-types", "createRoomType", "Add a room type", T, "host", ["LST-04"], ["BR-AVL-03", "BR-LST-01", "BR-LST-02"],
   body=ref("RoomTypeWrite"), resp=ref("RoomType"), status=201, perm="listings.manage", desc="422 `room_types_not_supported` for other verticals.")
op("patch", f"{A}/host/listings/{{listing_id}}/room-types/{{room_type_id}}", "updateRoomType", "Edit a room type", T, "host", ["LST-04"], ["BR-AVL-02", "BR-LST-02"],
   body=ref("RoomTypeWrite"), resp=ref("RoomType"), perm="listings.manage", conflict=True,
   desc="Lowering unit_count below units already booked on a future night returns 409 `inventory_in_use`.")
op("delete", f"{A}/host/listings/{{listing_id}}/room-types/{{room_type_id}}", "deleteRoomType", "Remove a room type (soft)", T, "host", ["LST-04"], ["BR-AVL-02"],
   status=204, perm="listings.manage", conflict=True)
op("get", f"{A}/host/listings/{{listing_id}}/slots", "listExperienceSlots", "Time slots of an experience", T, "host", ["LST-11"], ["BR-AVL-02"],
   query=[qp("from", DATE, "Start."), qp("to", DATE, "End.")], resp=list_of(ref("HostExperienceSlot")))
op("post", f"{A}/host/listings/{{listing_id}}/slots", "createExperienceSlot", "Add a time slot", T, "host", ["LST-11"], ["BR-AVL-02"],
   body=ref("ExperienceSlotWrite"), resp=ref("HostExperienceSlot"), status=201, perm="calendar.manage", conflict=True, desc="409 `slot_exists` for the same start time.")
op("patch", f"{A}/host/listings/{{listing_id}}/slots/{{slot_id}}", "updateExperienceSlot", "Edit or cancel a slot", T, "host", ["LST-11"], ["BR-AVL-02"],
   body=obj({"seats_total": INT, "price_override": nullable(ref("MoneyInput")), "is_cancelled": BOOL}), resp=ref("HostExperienceSlot"), perm="calendar.manage", conflict=True,
   desc="seats_total cannot go below held + booked (409 `inventory_in_use`).")
T = "host.calendar"
op("get", f"{A}/host/calendar", "getHostCalendar", "Calendar of several listings", T, "host", ["AVL-03"], ["BR-AVL-04"],
   query=[qp("listing_ids", arr(UUID, maxItems=50), "Listings of the active host account. Default: all.", ), qp("from", DATE, "Start.", True), qp("to", DATE, "End, max 400 days.", True)],
   resp=ref("CalendarResponse"), desc="Replaces getOverridesForListings and the per-page reservation joins of the host calendar and bookings pages.")
op("get", f"{A}/host/listings/{{listing_id}}/calendar", "getListingCalendar", "Calendar of one listing or room type", T, "host", ["AVL-03"], ["BR-AVL-04"],
   query=[qp("from", DATE, "Start.", True), qp("to", DATE, "End.", True), qp("room_type_id", UUID, "Room type.")], resp=ref("CalendarResponse"))
op("put", f"{A}/host/listings/{{listing_id}}/calendar/blocks", "setCalendarBlocks", "Block or unblock days", T, "host", ["AVL-03"], ["BR-AVL-04", "BR-AVL-02"],
   body=ref("CalendarBlocks"), resp=ref("CalendarResponse"), perm="calendar.manage", conflict=True,
   desc="Max 366 days, no past days. Blocking a night that already has a booking returns 409 `night_booked` (with the dates).")
op("put", f"{A}/host/listings/{{listing_id}}/calendar/prices", "setCalendarPrices", "Set or clear per-day prices", T, "host", ["AVL-03", "PRC-01"], ["BR-AVL-04", "BR-PRC-01", "BR-PAY-01"],
   body=ref("CalendarPrices"), resp=ref("CalendarResponse"), perm="calendar.manage", desc="Per listing or per room type. Existing bookings keep their snapshot price.")

# ===========================================================================
# HOST: trips
# ===========================================================================
T = "host.trips"
op("get", f"{A}/host/trips", "listHostTrips", "Trips of the active agency (all statuses)", T, "host", ["TRP-01"], ["BR-TRP-01", "BR-ORG-01"],
   query=[qp("status", arr(ref("ListingStatus")), "Filter."), qp("trip_type", arr(ref("TripType")), "Filter."), P("Cursor"), P("Limit")], resp=cursor_of(ref("HostTrip")))
op("post", f"{A}/host/trips", "createHostTrip", "Create a trip (draft)", T, "host", ["TRP-01", "TRP-02", "TRP-07", "HST-07"], ["BR-TRP-01", "BR-HST-05", "BR-LST-05"],
   body=ref("TripWrite"), resp=ref("HostTrip"), status=201, idem="required", perm="trips.manage",
   desc="Only an approved agency (403 `host_offer_not_allowed` or `agency_not_verified`). trip_type is required (DEC-015).")
op("get", f"{A}/host/trips/{{trip_id}}", "getHostTrip", "One trip with private fields", T, "host", ["TRP-02"], ["BR-ORG-01"], resp=ref("HostTrip"))
op("patch", f"{A}/host/trips/{{trip_id}}", "updateHostTrip", "Edit a trip", T, "host", ["TRP-02", "TRP-04", "TRP-07"], ["BR-LST-02", "BR-LST-05"],
   body=ref("TripWrite"), resp=ref("HostTrip"), perm="trips.manage", if_match=True, desc="Body fields are all optional here. Same review rule as listings.")
op("delete", f"{A}/host/trips/{{trip_id}}", "deleteHostTrip", "Delete a trip (soft)", T, "host", ["TRP-01", "LST-08"], ["BR-LST-03"],
   status=204, perm="trips.manage", conflict=True)
op("post", f"{A}/host/trips/{{trip_id}}/status", "changeHostTripStatus", "Submit, withdraw, pause, resume or archive a trip", T, "host",
   ["TRP-04", "LST-03"], ["BR-LST-02", "BR-LST-03"], body=ref("HostStatusChange"), resp=ref("HostTrip"), perm="trips.manage", conflict=True,
   desc="Replaces setTripStatusAction (active/draft). Going live always passes review (DEC-003).")
op("get", f"{A}/host/trips/{{trip_id}}/departures", "listHostDepartures", "Departures of a trip", T, "host", ["TRP-03"], ["BR-TRP-02"],
   query=[qp("from", DATE, "Start."), qp("include_past", BOOL, "Default false.")], resp=list_of(ref("HostDeparture")))
op("post", f"{A}/host/trips/{{trip_id}}/departures", "createDeparture", "Add a departure", T, "host", ["TRP-03"], ["BR-TRP-02"],
   body=ref("DepartureWrite"), resp=ref("HostDeparture"), status=201, perm="trips.manage", conflict=True, desc="409 `departure_exists` for the same start date.")
op("patch", f"{A}/host/trips/{{trip_id}}/departures/{{departure_id}}", "updateDeparture", "Edit a departure", T, "host", ["TRP-03"], ["BR-TRP-02"],
   body=ref("DepartureWrite"), resp=ref("HostDeparture"), perm="trips.manage", conflict=True, desc="Body fields are all optional here. seats_total cannot go below held + booked.")
op("post", f"{A}/host/trips/{{trip_id}}/departures/{{departure_id}}/cancel", "cancelDeparture", "Cancel a departure and all its bookings", T, "host",
   ["TRP-06"], ["BR-TRP-03", "BR-PAY-05", "BR-NTF-01"], body=ref("HostCancel"), resp=ref("HostDeparture"), perm="bookings.cancel_as_host", idem="required", conflict=True, release="R2")

# ===========================================================================
# HOST: bookings, reviews, wallet
# ===========================================================================
T = "host.bookings"
op("get", f"{A}/host/bookings", "listHostBookings", "Bookings of the active host account", T, "host", ["BKG-07"], ["BR-ORG-01", "BR-ORG-05"],
   query=[qp("status", arr(ref("BookingStatus")), "Filter. `pending` = requests to answer."), qp("listing_id", UUID, "Filter."), qp("trip_id", UUID, "Filter."),
          qp("departure_id", UUID, "Filter."), qp("check_in_from", DATE, "Filter."), qp("check_in_to", DATE, "Filter."), qp("q", STR, "Reference or guest name."),
          qp("ordering", {"type": "string", "enum": ["check_in", "-check_in", "created", "-created", "request_expires_at"]}, "Sort."), P("Cursor"), P("Limit")],
   resp=cursor_of(ref("HostBooking"), {"counts": d({"type": "object", "additionalProperties": INT}, "Count per status for tabs.")}), perm="bookings.view",
   desc="Guides only see bookings of departures they guide.")
op("get", f"{A}/host/bookings/{{booking_id}}", "getHostBooking", "One booking of the active host account", T, "host", ["BKG-07", "BKG-08"], ["BR-ORG-05", "BR-SRC-03"],
   resp=ref("HostBooking"), perm="bookings.view")
op("post", f"{A}/host/bookings/{{booking_id}}/accept", "acceptBookingRequest", "Accept a pending request", T, "host",
   ["BKG-02", "PAY-03", "PAY-04", "PAY-07", "ORG-05"], ["BR-BKG-03", "BR-BKG-06", "BR-PAY-04", "BR-PAY-06", "BR-PAY-10", "BR-ORG-05", "BR-NTF-01"],
   body=ref("HostAccept"), body_required=False, resp=ref("HostBooking"), perm="bookings.respond", idem="optional", conflict=True,
   desc="pending to confirmed in one transaction with the commission posting. 409 `booking_not_pending`, `request_expired`, `wallet_below_credit_floor`; 403 `permission_denied` for agents and guides (DEC-009).")
op("post", f"{A}/host/bookings/{{booking_id}}/decline", "declineBookingRequest", "Decline a pending request", T, "host",
   ["BKG-02", "CAN-04", "ORG-05"], ["BR-BKG-03", "BR-BKG-06", "BR-PAY-05", "BR-NTF-01"], body=ref("HostDecline"), resp=ref("HostBooking"),
   perm="bookings.respond", idem="optional", conflict=True, desc="Reason code required. Dates are released at once.")
op("get", f"{A}/host/bookings/{{booking_id}}/cancellation-preview", "previewHostCancellation", "What a host cancellation means", T, "host",
   ["CAN-02"], ["BR-CAN-03", "BR-PAY-05"], resp=ref("CancellationPreview"), perm="bookings.cancel_as_host")
op("post", f"{A}/host/bookings/{{booking_id}}/cancel", "cancelBookingAsHost", "Cancel a confirmed booking as host", T, "host",
   ["CAN-02", "CAN-04"], ["BR-CAN-03", "BR-PAY-05", "BR-NTF-01"], body=ref("HostCancel"), resp=ref("HostBooking"),
   perm="bookings.cancel_as_host", idem="optional", conflict=True, desc="Full refund owed to the guest, full commission reversal, host cancellation counter +1.")
op("post", f"{A}/host/bookings/{{booking_id}}/guest-review", "reviewGuest", "Review the guest", T, "host", ["REV-02"], ["BR-REV-02"],
   body=ref("ReviewCreate"), resp=ref("Review"), status=201, perm="bookings.respond", conflict=True, release="R2")
op("post", f"{A}/host/bookings/{{booking_id}}/dispute", "openHostDispute", "Open a dispute as host", T, "host", ["BKG-11"], ["BR-CAN-05"],
   body=ref("DisputeCreate"), resp=ref("Dispute"), status=201, perm="bookings.cancel_as_host", conflict=True, release="R2")
T = "host.reviews"
op("get", f"{A}/host/reviews", "listHostReviews", "Reviews received by the active host account", T, "host", ["REV-03", "REV-05"], ["BR-REV-04"],
   query=[qp("listing_id", UUID, "Filter."), qp("trip_id", UUID, "Filter."), qp("has_reply", BOOL, "Filter."), P("Cursor"), P("Limit")],
   resp=cursor_of(ref("Review"), {"summary": ref("RatingSummary")}))
op("put", f"{A}/host/reviews/{{review_id}}/reply", "replyToReview", "Write or edit the public reply", T, "host", ["REV-03"], ["BR-REV-03"],
   body=ref("ReviewReply"), resp=ref("Review"), perm="messages.reply", conflict=True, desc="One reply per review, editable for 48 h (409 `reply_locked`).")
T = "host.wallet"
op("get", f"{A}/host/wallet", "getHostWallet", "Commission wallet of the active host account", T, "host", ["PAY-02", "PAY-07", "PAY-08", "PAY-04"],
   ["BR-PAY-03", "BR-PAY-06", "BR-PAY-10"], resp=ref("Wallet"), perm="wallet.view", desc="Replaces getMyWalletAction. Balance comes from the ledger (cached balance row).")
op("get", f"{A}/host/wallet/entries", "listHostWalletEntries", "Wallet history", T, "host", ["PAY-08", "PAY-01"], ["BR-PAY-02", "BR-PAY-03"],
   query=[qp("kind", arr(ref("LedgerTxKind")), "Filter."), qp("from", DATE, "Filter."), qp("to", DATE, "Filter."), P("Cursor"), P("Limit")],
   resp=cursor_of(ref("WalletEntry")), perm="wallet.view")
op("post", f"{A}/host/wallet/topups", "startOnlineTopup", "Top up the wallet online (CIB, Edahabia)", T, "host", ["PAY-06"], ["BR-PAY-08"],
   body=ref("OnlineTopupCreate"), resp=ref("OnlineTopupCheckout"), status=201, perm="wallet.view", idem="required", release="R2",
   desc="Credited only by the verified gateway webhook. 404 while the `online_topup` flag is off.")
op("get", f"{A}/host/earnings", "getHostEarnings", "Earnings dashboard", T, "host", ["RPT-03"], ["BR-RPT-02"],
   query=[qp("from", DATE, "Start (default first day of the year)."), qp("to", DATE, "End (default today).")], resp=ref("Earnings"), perm="wallet.view")
op("get", f"{A}/host/invoices", "listHostInvoices", "Commission invoices", T, "host", ["PAY-11"], ["BR-PAY-12"], query=[P("Cursor"), P("Limit")],
   resp=cursor_of(ref("Invoice")), perm="invoices.view", release="R2")
op("get", f"{A}/host/payouts", "listHostPayouts", "Payouts to the host", T, "host", ["PAY-10"], ["BR-PAY-11"], query=[P("Cursor"), P("Limit")],
   resp=cursor_of(ref("Payout")), perm="wallet.view", dormant=True, release="Later", desc="DORMANT (model M4). 404 while the `payouts` flag is off.")
op("post", f"{A}/host/payouts", "requestHostPayout", "Ask for a payout", T, "host", ["PAY-10", "HST-05"], ["BR-PAY-11", "BR-PAY-09"],
   body=ref("PayoutCreate"), resp=ref("Payout"), status=201, perm="payout_details.edit", idem="required", dormant=True, release="Later",
   desc="DORMANT (model M4). 404 while the `payouts` flag is off.")

# ===========================================================================
# WEBHOOKS
# ===========================================================================
op("post", f"{A}/webhooks/gateway/{{provider}}", "receiveGatewayWebhook", "Payment gateway callback", "webhooks", "webhook",
   ["PAY-09", "PAY-06", "PAY-10"], ["BR-SYS-02", "BR-PAY-08"], body=OBJ, resp=ref("GatewayEventAck"), dormant=True, release="R2",
   desc="DORMANT until online top-up (R2) or guest payments (M2 to M4) are switched on; 404 before that. The raw body is stored first, then the signature is checked (HMAC-SHA256 of the raw body with the provider secret), then the event is deduplicated by (provider, event_id) and processed once by a worker. Always answers 200 quickly, also for duplicates.")

# ===========================================================================
# ADMIN (staff only, MFA required): /api/v1/admin/*
# ===========================================================================
T = "admin.auth"
op("post", f"{AD}/auth/login", "adminLogin", "Staff sign in (step 1: password)", T, "public", ["STF-05", "ACC-07", "ACC-03"], ["BR-ACC-05", "BR-ACC-03"],
   body=ref("LoginRequest"), resp=ref("Session"), rate=True, desc="Staff-only allauth mount. Non-staff accounts get the same 400 `invalid_credentials`. The response always has the pending flow `mfa_authenticate`.")
op("post", f"{AD}/auth/2fa/authenticate", "adminMfaAuthenticate", "Staff sign in (step 2: second factor)", T, "public", ["ACC-05", "STF-05"], ["BR-ACC-04"],
   body=ref("MfaAuthenticate"), resp=ref("StaffSession"), rate=True)
op("get", f"{AD}/auth/session", "adminGetSession", "Current staff session and permissions", T, "staff_any", ["STF-01", "ACC-03"], ["BR-STF-01", "BR-ACC-03"],
   resp=ref("StaffSession"), desc="Replaces getCurrentAdmin. Permissions are read from the database on every request.")
op("delete", f"{AD}/auth/session", "adminLogout", "Staff sign out", T, "staff_any", ["ACC-03"], ["BR-ACC-03"], status=204)
op("post", f"{AD}/auth/invitations/accept", "adminAcceptInvitation", "Accept a staff invitation and set a password", T, "public", ["STF-02"], ["BR-ACC-04"],
   body=ref("StaffInviteAccept"), resp=ref("Session"), rate=True, conflict=True, desc="Next step is TOTP enrolment; the account becomes active only after it.")
op("post", f"{AD}/auth/authenticators/totp", "adminEnrolTotp", "Enrol TOTP (required before any admin endpoint)", T, "staff_any", ["ACC-05", "STF-02"], ["BR-ACC-04"],
   body=ref("CodeConfirm"), resp=ref("Authenticator"), status=201)
op("post", f"{AD}/auth/password/change", "adminChangePassword", "Change my staff password", T, "staff_any", ["ACC-04"], ["BR-ACC-03"],
   body=ref("PasswordChange"), status=204)

T = "admin.moderation"
op("get", f"{AD}/moderation/counts", "adminModerationCounts", "Queue sizes, oldest waiting, high priority", T, "staff", ["MOD-01"], ["BR-MOD-01"],
   resp=ref("ModerationCounts"), perm="any of hosts.view, listings.view, reviews.view, bookings.view (each queue filtered by permission)")
op("get", f"{AD}/dashboard/attention", "adminAttentionItems", "Dashboard: what needs attention now", T, "staff", ["MOD-01", "PAY-07"], ["BR-MOD-01", "BR-PAY-10"],
   resp=ref("AttentionItems"), perm="reports.view (items filtered by permission)")
op("get", f"{AD}/moderation/cases", "adminListCases", "Moderation queue", T, "staff", ["MOD-01", "MOD-08"], ["BR-MOD-01"],
   query=[qp("kind", arr(ref("CaseKind")), "Queue(s)."), qp("status", arr(ref("CaseStatus")), "Default open, in_progress."), qp("priority", ref("CasePriority"), "Filter."),
          qp("assigned_to", STR, "`me`, `none` or a staff user id."), qp("ordering", {"type": "string", "enum": ["submitted_at", "-submitted_at", "priority"]}, "Default oldest first."),
          P("Page"), P("PageSize")],
   resp=page_of(ref("ModerationCase"), facets=True), perm="per kind: hosts.view, listings.view, reviews.view, bookings.view")
op("get", f"{AD}/moderation/cases/{{case_id}}", "adminGetCase", "One case with its history", T, "staff", ["MOD-01", "MOD-02"], ["BR-MOD-02"], resp=ref("ModerationCase"),
   perm="view permission of the case kind")
op("post", f"{AD}/moderation/cases/{{case_id}}/assign", "adminAssignCase", "Take or assign a case", T, "staff", ["MOD-01"], ["BR-STF-02"],
   body=obj({"assignee_id": nullable(UUID)}, None, "Null = unassign; omitted = me."), resp=ref("ModerationCase"), perm="decision permission of the case kind")
op("post", f"{AD}/moderation/cases/{{case_id}}/decisions", "adminDecideCase", "Decide a case (approve, reject, request changes...)", T, "staff",
   ["MOD-02", "MOD-03", "MOD-05", "MOD-08", "LST-02", "TRP-04", "HST-04", "REV-04"], ["BR-MOD-02", "BR-HST-03", "BR-HST-04", "BR-LST-02", "BR-LST-03", "BR-REV-03", "BR-STF-02", "BR-NTF-01"],
   body=ref("DecisionCreate"), resp=ref("ModerationCase"), conflict=True, idem="optional",
   perm="per kind: hosts.approve / hosts.reject, listings.approve / listings.reject, reviews.moderate",
   desc="Applies the matching state change to the subject (host account, listing, revision, trip, document, review) in one transaction, records the decision and notifies the host. 409 `case_resolved`, `invalid_transition`; 422 `reason_required`, `documents_not_approved`.")
op("post", f"{AD}/moderation/bulk-decisions", "adminBulkDecide", "Same decision on many cases", T, "staff", ["MOD-04"], ["BR-STF-02"],
   body=ref("BulkDecision"), resp=ref("BulkResult"), perm="same as single decision", release="R2", desc="Per-item result; one audit row per item.")
op("get", f"{AD}/reason-codes", "adminListReasonCodes", "Reason catalogue (all actions)", T, "staff", ["MOD-03"], ["BR-HST-04"],
   query=[qp("action", STR, "Filter.")], resp=list_of(ref("ReasonCode")), perm="any staff")

T = "admin.hosts"
op("get", f"{AD}/hosts", "adminListHosts", "Host accounts (individuals and organisations)", T, "staff", ["HST-04", "MOD-01", "PAY-07"], ["BR-HST-04"],
   query=[qp("host_type", arr(ref("HostType")), "Filter."), qp("verification_status", arr(ref("VerificationStatus")), "Filter."),
          qp("wilaya", arr(INT), "Filter."), qp("approval_mode", ref("ApprovalMode"), "Filter."), qp("vertical", ref("Vertical"), "Has listings of this vertical."),
          qp("min_rating", {"type": "number"}, "Filter."), qp("min_bookings", INT, "Filter."), qp("min_listings", INT, "Filter."),
          qp("wallet", {"type": "string", "enum": ["negative", "below_floor"]}, "Wallet state."), qp("min_stars", INT, "Hotels."), qp("has_trips", BOOL, "Agencies."),
          qp("deleted", {"type": "string", "enum": ["exclude", "only", "include"], "default": "exclude"}, "Soft-deleted rows."),
          qp("q", STR, "Name, reference, email, phone."),
          qp("ordering", {"type": "string", "enum": ["joined", "-joined", "rating", "-rating", "listings", "-listings", "bookings", "-bookings", "balance", "-balance"]}, "Sort."),
          P("Page"), P("PageSize")],
   resp=page_of(ref("AdminHost"), facets=True), perm="hosts.view")
op("get", f"{AD}/hosts/{{host_account_id}}", "adminGetHost", "One host account with documents, team and cases", T, "staff", ["HST-04"], ["BR-HST-03"],
   resp=ref("AdminHostDetail"), perm="hosts.view")
for verb, opid, summ, perm, reqs, rules, body in [
    ("approve", "adminApproveHost", "Approve a host account", "hosts.approve", ["HST-04", "MOD-08"], ["BR-HST-03", "BR-HST-04"], None),
    ("request-changes", "adminRequestHostChanges", "Ask the host for changes", "hosts.approve", ["HST-04", "MOD-02"], ["BR-HST-04", "BR-MOD-02"], ref("DecisionCreate")),
    ("reject", "adminRejectHost", "Reject a host account", "hosts.reject", ["HST-04"], ["BR-HST-04"], ref("Reason")),
    ("suspend", "adminSuspendHost", "Suspend a host account (cascade)", "hosts.suspend", ["HST-04", "MOD-06"], ["BR-HST-04", "BR-MOD-03"], ref("Reason")),
    ("unsuspend", "adminUnsuspendHost", "Lift a suspension", "hosts.suspend", ["HST-04", "MOD-06"], ["BR-HST-04", "BR-MOD-03"], ref("Reason")),
    ("ban", "adminBanHost", "Ban a host account (final)", "hosts.delete", ["HST-04", "MOD-06"], ["BR-HST-04", "BR-MOD-03"], ref("Reason")),
    ("restore", "adminRestoreHost", "Restore a soft-deleted host account", "hosts.delete", ["HST-04"], ["BR-HST-04"], None),
]:
    op("post", f"{AD}/hosts/{{host_account_id}}/{verb}", opid, summ, T, "staff", reqs, rules + ["BR-STF-02"], body=body, body_required=body is not None,
       resp=ref("AdminHost"), perm=perm, conflict=True,
       desc="Moves along table 3b only (409 `invalid_transition`). Reasons need 10+ characters. Audited." + (" Approve needs every required document approved (422 `documents_not_approved`)." if verb == "approve" else "")
       + (" Pauses all listings and trips and opens support cases for future confirmed bookings." if verb in ("suspend", "ban") else "")
       + (" Listings are not republished automatically." if verb == "unsuspend" else ""))
op("delete", f"{AD}/hosts/{{host_account_id}}", "adminDeleteHost", "Soft-delete a host account", T, "staff", ["HST-04"], ["BR-HST-04", "BR-STF-02"],
   status=204, perm="hosts.delete", conflict=True)
op("put", f"{AD}/hosts/{{host_account_id}}/commission-override", "adminSetCommissionOverride", "Set a commission rate for this host", T, "staff",
   ["PAY-04"], ["BR-PAY-06", "BR-STF-02"], body=ref("CommissionOverride"), resp=ref("AdminHost"), perm="hosts.commission_override", desc="Applies to new bookings only.")
op("delete", f"{AD}/hosts/{{host_account_id}}/commission-override", "adminClearCommissionOverride", "Go back to the host-type default rate", T, "staff",
   ["PAY-04"], ["BR-PAY-06"], status=204, perm="hosts.commission_override")
op("put", f"{AD}/hosts/{{host_account_id}}/credit-limit-override", "adminSetCreditLimit", "Set the credit floor for this host", T, "staff",
   ["PAY-07"], ["BR-PAY-10"], body=obj({"credit_limit": ref("MoneyInput"), "reason": {"type": "string", "minLength": 10}}, ["credit_limit", "reason"]),
   resp=ref("AdminHost"), perm="commissions.manage")
op("get", f"{AD}/documents/{{document_id}}/url", "adminGetDocumentUrl", "View a KYC document (signed URL, audited)", T, "staff", ["MED-02", "MOD-08", "STF-03"],
   ["BR-MED-02", "BR-STF-02"], resp=ref("SignedUrl"), perm="hosts.view")
op("post", f"{AD}/documents/{{document_id}}/approve", "adminApproveDocument", "Approve one document", T, "staff", ["MOD-08"], ["BR-HST-03"],
   resp=ref("HostDocument"), perm="hosts.approve", conflict=True)
op("post", f"{AD}/documents/{{document_id}}/reject", "adminRejectDocument", "Reject one document", T, "staff", ["MOD-08"], ["BR-HST-03"],
   body=ref("Reason"), resp=ref("HostDocument"), perm="hosts.reject", conflict=True)

T = "admin.catalog"
ADMIN_LISTING_Q = [qp("status", arr(ref("ListingStatus")), "Filter."), qp("vertical", arr(ref("Vertical")), "Filter."),
                   qp("experience_type", arr(ref("ExperienceType")), "Filter."), qp("host_type", arr(ref("HostType")), "Filter."),
                   qp("host_account", UUID, "Filter."), qp("wilaya", arr(INT), "Filter."), qp("min_price_minor", I64, "Filter."), qp("max_price_minor", I64, "Filter."),
                   qp("approval_mode", ref("ApprovalMode"), "Filter."), qp("featured", BOOL, "Filter."), qp("reported", BOOL, "Has open reports."),
                   qp("min_capacity", INT, "Filter."), qp("min_bedrooms", INT, "Filter."), qp("amenity", arr(STR), "Amenity slugs."),
                   qp("has_pending_revision", BOOL, "Filter."), qp("deleted", {"type": "string", "enum": ["exclude", "only", "include"]}, "Soft-deleted rows."),
                   qp("q", STR, "Title, reference, host."),
                   qp("ordering", {"type": "string", "enum": ["created", "-created", "price", "-price", "rating", "-rating", "bookings", "-bookings"]}, "Sort."),
                   P("Page"), P("PageSize")]
op("get", f"{AD}/listings", "adminListListings", "All listings, every status, with facets", T, "staff", ["LST-03", "MOD-01", "LST-12"], ["BR-LST-03"],
   query=ADMIN_LISTING_Q, resp=page_of(ref("AdminListing"), facets=True), perm="listings.view",
   desc="Also serves the admin network/search pages (former searchNetwork).")
op("get", f"{AD}/listings/{{listing_id}}", "adminGetListing", "One listing (with pending revision and cases)", T, "staff", ["LST-02"], ["BR-LST-02"],
   resp=ref("AdminListingDetail"), perm="listings.view")
for verb, opid, summ, perm, body in [
    ("approve", "adminApproveListing", "Approve and publish (or approve the pending revision)", "listings.approve", None),
    ("reject", "adminRejectListing", "Reject a listing", "listings.reject", ref("Reason")),
    ("request-changes", "adminRequestListingChanges", "Ask the host for changes", "listings.approve", ref("DecisionCreate")),
    ("suspend", "adminSuspendListing", "Suspend a published listing", "listings.suspend", ref("Reason")),
    ("restore", "adminRestoreListing", "Restore a soft-deleted listing to its previous status", "listings.delete", None),
]:
    op("post", f"{AD}/listings/{{listing_id}}/{verb}", opid, summ, T, "staff", ["LST-02", "LST-03"] + (["MOD-02"] if verb == "request-changes" else []),
       ["BR-LST-02", "BR-LST-03", "BR-STF-02"] + (["BR-MOD-02"] if verb == "request-changes" else []), body=body, body_required=body is not None,
       resp=ref("AdminListing"), perm=perm, conflict=True, desc="Moves along table 4a only (409 `invalid_transition`). Audited; the host is notified.")
op("post", f"{AD}/listings/{{listing_id}}/status", "adminChangeListingStatus", "Any other allowed status change", T, "staff", ["LST-03"], ["BR-LST-03", "BR-STF-02"],
   body=ref("AdminStatusChange"), resp=ref("AdminListing"), perm="by target status: listings.approve, listings.reject, listings.suspend, listings.delete", conflict=True,
   desc="Replaces updateListingStatus (e.g. unsuspend, archive).")
op("delete", f"{AD}/listings/{{listing_id}}", "adminDeleteListing", "Soft-delete a listing", T, "staff", ["LST-08"], ["BR-LST-03", "BR-STF-02"], status=204, perm="listings.delete")
op("put", f"{AD}/listings/{{listing_id}}/featured", "adminSetListingFeatured", "Feature or unfeature a listing", T, "staff", ["LST-09"], ["BR-STF-02"],
   body=ref("FeaturedUpdate"), resp=ref("AdminListing"), perm="listings.feature", release="R2", desc="Only published listings (409 `not_published`).", conflict=True)
op("get", f"{AD}/trips", "adminListTrips", "All trips, every status", T, "staff", ["TRP-04", "TRP-07"], ["BR-LST-03"],
   query=[qp("status", arr(ref("ListingStatus")), "Filter."), qp("trip_type", arr(ref("TripType")), "Filter."), qp("host_account", UUID, "Filter."),
          qp("q", STR, "Search."), P("Page"), P("PageSize")], resp=page_of(ref("AdminTrip"), facets=True), perm="listings.view")
op("get", f"{AD}/trips/{{trip_id}}", "adminGetTrip", "One trip", T, "staff", ["TRP-04"], ["BR-LST-02"], resp=ref("HostTrip"), perm="listings.view")
op("post", f"{AD}/trips/{{trip_id}}/status", "adminChangeTripStatus", "Approve, reject, suspend, restore a trip", T, "staff", ["TRP-04"], ["BR-LST-02", "BR-LST-03", "BR-STF-02"],
   body=ref("AdminStatusChange"), resp=ref("AdminTrip"), perm="by target status: listings.approve, listings.reject, listings.suspend, listings.delete", conflict=True)

T = "admin.bookings"
op("get", f"{AD}/bookings", "adminListBookings", "All bookings with facets", T, "staff", ["BKG-05", "BKG-07", "BKG-08"], ["BR-BKG-06"],
   query=[qp("status", arr(ref("BookingStatus")), "Filter."), qp("payment_status", arr(ref("PaymentStatus")), "Filter."), qp("vertical", arr(ref("Vertical")), "Filter."),
          qp("kind", {"type": "string", "enum": ["listing", "trip"]}, "Filter."), qp("host_type", arr(ref("HostType")), "Filter."), qp("host_account", UUID, "Filter."),
          qp("guest", UUID, "Filter."), qp("wilaya", arr(INT), "Filter."), qp("approval_mode", ref("ApprovalMode"), "Filter."),
          qp("pending_over_hours", INT, "Requests waiting longer than this."), qp("check_in_from", DATE, "Filter."), qp("check_in_to", DATE, "Filter."),
          qp("created_from", DATE, "Filter."), qp("created_to", DATE, "Filter."), qp("q", STR, "Reference, guest, host."),
          qp("ordering", {"type": "string", "enum": ["created", "-created", "check_in", "-check_in", "amount", "-amount"]}, "Sort."), P("Page"), P("PageSize")],
   resp=page_of(ref("AdminBooking"), facets=True), perm="bookings.view")
op("get", f"{AD}/bookings/{{booking_id}}", "adminGetBooking", "One booking with its event history", T, "staff", ["BKG-05", "BKG-06"], ["BR-BKG-06", "BR-BKG-07"],
   resp=ref("AdminBooking"), perm="bookings.view")
op("post", f"{AD}/bookings/{{booking_id}}/cancel", "adminCancelBooking", "Cancel a booking as staff", T, "staff", ["CAN-03", "CAN-04"], ["BR-CAN-04", "BR-PAY-05", "BR-STF-02"],
   body=ref("AdminCancel"), resp=ref("AdminBooking"), perm="bookings.cancel", idem="optional", conflict=True)
op("post", f"{AD}/bookings/{{booking_id}}/refunds", "adminRefundBooking", "Record a full or partial refund", T, "staff", ["CAN-03", "CAN-04", "PAY-01"],
   ["BR-CAN-04", "BR-PAY-02", "BR-PAY-05", "BR-SYS-01", "BR-STF-02"], body=ref("RefundCreate"), resp=ref("AdminBooking"), status=201, perm="bookings.refund",
   idem="required", conflict=True, desc="Partial refunds add up and never exceed the total (422 `refund_exceeds_total`). In M1 the refund is owed by the host; commission is adjusted in the ledger.")
op("post", f"{AD}/bookings/{{booking_id}}/dispute/resolve", "adminResolveDispute", "Resolve a dispute", T, "staff", ["BKG-11"], ["BR-CAN-05", "BR-STF-02"],
   body=ref("DisputeResolve"), resp=ref("AdminBooking"), perm="bookings.dispute (+ bookings.refund unless declined)", idem="optional", conflict=True, release="R2")
op("get", f"{AD}/refunds", "adminListRefunds", "All refunds", T, "staff", ["CAN-03"], ["BR-CAN-04"],
   query=[qp("host_account", UUID, "Filter."), qp("kind", STR, "Filter."), qp("from", DATE, "Filter."), qp("to", DATE, "Filter."), P("Page"), P("PageSize")],
   resp=page_of(ref("AdminRefund")), perm="bookings.view or wallets.view")

T = "admin.users"
op("get", f"{AD}/users", "adminListUsers", "Users (guests and hosts as people)", T, "staff", ["ACC-08", "MOD-07"], ["BR-ACC-01"],
   query=[qp("status", arr(ref("UserStatus")), "Filter."), qp("is_host", BOOL, "Filter."), qp("email_verified", BOOL, "Filter."), qp("phone_verified", BOOL, "Filter."),
          qp("wilaya", arr(INT), "Filter."), qp("min_bookings", INT, "Filter."), qp("min_spend_minor", I64, "Filter."), qp("flagged", BOOL, "Has open risk flags."),
          qp("q", STR, "Name, email, phone."), qp("ordering", {"type": "string", "enum": ["joined", "-joined", "bookings", "-bookings", "spend", "-spend", "activity", "-activity"]}, "Sort."),
          P("Page"), P("PageSize")], resp=page_of(ref("AdminUser"), facets=True), perm="users.view")
op("get", f"{AD}/users/{{user_id}}", "adminGetUser", "One user", T, "staff", ["ACC-08"], ["BR-STF-02"], resp=ref("AdminUser"), perm="users.view")
for verb, opid, summ, perm in [("suspend", "adminSuspendUser", "Suspend a user", "users.suspend"), ("unsuspend", "adminUnsuspendUser", "Lift a user suspension", "users.suspend"),
                               ("ban", "adminBanUser", "Ban a user", "users.ban"), ("restore", "adminRestoreUser", "Restore a soft-deleted user", "users.delete")]:
    op("post", f"{AD}/users/{{user_id}}/{verb}", opid, summ, T, "staff", ["ACC-03", "STF-03"], ["BR-ACC-03", "BR-STF-02"], body=ref("Reason"),
       body_required=verb in ("suspend", "ban"), resp=ref("AdminUser"), perm=perm, conflict=True,
       desc="Suspend and ban revoke all sessions of the user at once. Audit rows keep ids, not personal data.")
op("delete", f"{AD}/users/{{user_id}}", "adminDeleteUser", "Soft-delete a user (anonymisation follows)", T, "staff", ["PRV-02"], ["BR-PRV-02", "BR-STF-02"], status=204, perm="users.delete", conflict=True)
op("get", f"{AD}/data-requests", "adminListDataRequests", "Data protection requests with deadlines", T, "staff", ["PRV-02"], ["BR-PRV-02"],
   query=[qp("status", STR, "Filter."), qp("kind", ref("DsrKind"), "Filter."), P("Page"), P("PageSize")], resp=page_of(ref("DataSubjectRequestAdmin")), perm="privacy.handle_requests (new)")
op("post", f"{AD}/data-requests/{{data_request_id}}/complete", "adminCompleteDataRequest", "Close a data protection request", T, "staff", ["PRV-02"], ["BR-PRV-02", "BR-STF-02"],
   body=ref("DataSubjectRequestComplete"), resp=ref("DataSubjectRequestAdmin"), perm="privacy.handle_requests (new)", conflict=True)

T = "admin.reviews"
op("get", f"{AD}/reviews", "adminListReviews", "Reviews with reports", T, "staff", ["REV-04"], ["BR-REV-03"],
   query=[qp("status", arr(ref("ReviewStatus")), "Filter."), qp("vertical", arr(ref("Vertical")), "Filter."), qp("rating", arr(INT), "Overall rating values."),
          qp("wilaya", arr(INT), "Filter."), qp("reported", BOOL, "Has open reports."), qp("q", STR, "Search."), P("Page"), P("PageSize")],
   resp=page_of(ref("AdminReview"), facets=True), perm="reviews.view")
for verb, opid, summ, perm, rq in [("hide", "adminHideReview", "Hide a review", "reviews.moderate", True), ("restore", "adminRestoreReview", "Publish a hidden or flagged review again", "reviews.moderate", False),
                                   ("dismiss-reports", "adminDismissReviewReports", "Dismiss open reports and keep the review", "reviews.moderate", False)]:
    op("post", f"{AD}/reviews/{{review_id}}/{verb}", opid, summ, T, "staff", ["REV-04", "REV-05"], ["BR-REV-03", "BR-REV-04", "BR-STF-02"],
       body=ref("Reason"), body_required=rq, resp=ref("AdminReview"), perm=perm, conflict=True, desc="Ratings are recomputed by a job after each change (BR-REV-04).")
op("delete", f"{AD}/reviews/{{review_id}}", "adminRemoveReview", "Remove a review (status removed)", T, "staff", ["REV-04"], ["BR-REV-03", "BR-STF-02"],
   status=204, perm="reviews.delete", desc="Only super admin. A removed review cannot be restored.")

T = "admin.finance"
op("get", f"{AD}/finance/summary", "adminFinanceSummary", "Finance overview", T, "staff", ["PAY-02", "PAY-07", "RPT-01"], ["BR-PAY-03", "BR-PAY-10"],
   resp=ref("FinanceSummary"), perm="wallets.view")
op("get", f"{AD}/wallets", "adminListWallets", "Host wallets", T, "staff", ["PAY-02", "PAY-07"], ["BR-PAY-03", "BR-PAY-10"],
   query=[qp("host_type", arr(ref("HostType")), "Filter."), qp("wilaya", arr(INT), "Filter."), qp("state", arr({"type": "string", "enum": ["ok", "negative", "below_floor"]}), "Filter."),
          qp("min_balance_minor", I64, "Filter."), qp("max_balance_minor", I64, "Filter."), qp("q", STR, "Host name or reference."),
          qp("ordering", {"type": "string", "enum": ["balance", "-balance", "last_entry", "-last_entry"]}, "Sort."), P("Page"), P("PageSize")],
   resp=page_of(ref("AdminWallet"), facets=True), perm="wallets.view")
op("get", f"{AD}/wallets/{{host_account_id}}", "adminGetWallet", "One host wallet", T, "staff", ["PAY-02"], ["BR-PAY-03"], resp=ref("AdminWallet"), perm="wallets.view")
op("get", f"{AD}/ledger/transactions", "adminListLedgerTransactions", "Ledger transactions with their entries", T, "staff", ["PAY-01", "PAY-08"], ["BR-PAY-02"],
   query=[qp("host_account", UUID, "Filter."), qp("kind", arr(ref("LedgerTxKind")), "Filter."), qp("booking", STR, "Booking id or reference."),
          qp("from", DATE, "Filter."), qp("to", DATE, "Filter."), qp("q", STR, "Description or receipt."), P("Page"), P("PageSize")],
   resp=page_of(ref("LedgerTransaction")), perm="wallets.view")
op("post", f"{AD}/ledger/adjustments", "adminCreateAdjustment", "Correct a wallet with an adjustment transaction", T, "staff", ["PAY-01"], ["BR-PAY-02", "BR-STF-03", "BR-STF-02"],
   body=ref("AdjustmentCreate"), resp=ref("LedgerTransaction"), status=201, perm="ledger.adjust (new)", idem="required", conflict=True,
   desc="Never edits old entries: posts a new balanced transaction (optionally linked to the one it corrects).")
op("post", f"{AD}/wallets/{{host_account_id}}/topups", "adminCreateTopup", "Record a manual wallet top-up", T, "staff", ["PAY-05", "PAY-02"],
   ["BR-PAY-07", "BR-PAY-02", "BR-SYS-01", "BR-STF-02"], body=ref("TopupCreate"), resp=ref("Topup"), status=201, perm="wallets.recharge", idem="required", conflict=True,
   desc="Up to the four-eyes threshold the top-up is approved and posted at once. Above it, status is pending_approval and nothing is posted until a second finance user approves. 409 `receipt_already_used` (same method and receipt).")
op("get", f"{AD}/topups", "adminListTopups", "Top-ups (e.g. waiting for a second approval)", T, "staff", ["PAY-05"], ["BR-PAY-07"],
   query=[qp("status", arr(ref("TopupStatus")), "Filter."), qp("method", arr(ref("TopupMethod")), "Filter."), qp("host_account", UUID, "Filter."), P("Page"), P("PageSize")],
   resp=page_of(ref("Topup")), perm="wallets.view")
op("post", f"{AD}/topups/{{topup_id}}/approve", "adminApproveTopup", "Second approval of a large top-up (four-eyes)", T, "staff", ["PAY-05"], ["BR-PAY-07", "BR-PAY-02", "BR-STF-02"],
   resp=ref("Topup"), perm="wallets.recharge", idem="optional", conflict=True,
   desc="The approver must be a different staff user from the requester (403 `four_eyes_same_user`). 409 `topup_not_pending`. Posts the ledger transaction and notifies the host.")
op("post", f"{AD}/topups/{{topup_id}}/reject", "adminRejectTopup", "Reject a pending top-up", T, "staff", ["PAY-05"], ["BR-PAY-07", "BR-STF-02"],
   body=ref("Reason"), resp=ref("Topup"), perm="wallets.recharge", conflict=True)
op("get", f"{AD}/commission-rates", "adminGetCommissionRates", "Default commission rates per host type", T, "staff", ["PAY-04", "CFG-01"], ["BR-PAY-06"],
   resp=ref("CommissionRates"), perm="wallets.view")
op("put", f"{AD}/commission-rates", "adminSetCommissionRates", "Change default commission rates", T, "staff", ["PAY-04", "CFG-01"], ["BR-PAY-06", "BR-CFG-01", "BR-STF-02"],
   body=ref("CommissionRates"), resp=ref("CommissionRates"), perm="commissions.manage", if_match=True, desc="Writes a new settings version; new bookings only.")
op("get", f"{AD}/invoices", "adminListInvoices", "Commission invoices", T, "staff", ["PAY-11"], ["BR-PAY-12"],
   query=[qp("host_account", UUID, "Filter."), qp("year", INT, "Filter."), P("Page"), P("PageSize")], resp=page_of(ref("Invoice")), perm="wallets.view", release="R2")
op("get", f"{AD}/payouts", "adminListPayouts", "Payout requests", T, "staff", ["PAY-10"], ["BR-PAY-11"],
   query=[qp("status", STR, "Filter."), P("Page"), P("PageSize")], resp=page_of(ref("Payout")), perm="wallets.view", dormant=True, release="Later",
   desc="DORMANT (model M4). 404 while the `payouts` flag is off.")
for verb, opid, summ, body in [("approve", "adminApprovePayout", "Approve a payout", None), ("reject", "adminRejectPayout", "Reject a payout", ref("Reason")),
                               ("mark-sent", "adminMarkPayoutSent", "Mark a payout as sent", obj({"bank_reference": STR}, ["bank_reference"]))]:
    op("post", f"{AD}/payouts/{{payout_id}}/{verb}", opid, summ, T, "staff", ["PAY-10"], ["BR-PAY-11", "BR-PAY-09", "BR-STF-02"], body=body, body_required=body is not None,
       resp=ref("Payout"), perm="payouts.approve", conflict=True, dormant=True, release="Later", desc="DORMANT (model M4). 404 while the `payouts` flag is off.")

T = "admin.settings"
op("get", f"{AD}/settings", "adminGetSettings", "Current platform settings", T, "staff", ["CFG-01"], ["BR-CFG-01"], resp=ref("PlatformSettings"), perm="settings.manage",
   desc="ETag is the version number; send it back in If-Match when saving.")
op("patch", f"{AD}/settings", "adminUpdateSettings", "Change settings (creates a new version)", T, "staff", ["CFG-01", "BKG-03"], ["BR-CFG-01", "BR-BKG-04", "BR-PAY-11", "BR-STF-02"],
   body=ref("PlatformSettingsData"), resp=ref("PlatformSettings"), perm="settings.manage", if_match=True,
   desc="Partial update of whitelisted keys; validated; unknown keys give 422 `unknown_setting`. 412 when someone saved in between.")
op("get", f"{AD}/settings/versions", "adminListSettingsVersions", "Settings history", T, "staff", ["CFG-01"], ["BR-CFG-01"], query=[P("Page"), P("PageSize")],
   resp=page_of(ref("PlatformSettings")), perm="settings.manage")
T = "admin.onboarding"
op("get", f"{AD}/onboarding-flows", "adminListOnboardingFlows", "Onboarding flows per host type", T, "staff", ["CFG-02"], ["BR-CFG-02"],
   resp=list_of(ref("OnboardingFlowSummary")), perm="onboarding.edit")
op("get", f"{AD}/onboarding-flows/{{host_type}}/versions", "adminListOnboardingVersions", "All versions of one flow", T, "staff", ["CFG-02"], ["BR-CFG-02"],
   resp=list_of(ref("OnboardingFlow")), perm="onboarding.edit")
op("get", f"{AD}/onboarding-flows/{{host_type}}/versions/{{version}}", "adminGetOnboardingVersion", "One version (published versions never change)", T, "staff",
   ["CFG-02"], ["BR-CFG-02"], resp=ref("OnboardingFlow"), perm="onboarding.edit")
op("put", f"{AD}/onboarding-flows/{{host_type}}/draft", "adminSaveOnboardingDraft", "Save the draft flow", T, "staff", ["CFG-02", "CFG-03"], ["BR-CFG-02", "BR-CFG-03", "BR-HST-01"],
   body=ref("OnboardingDraftFlowWrite"), resp=ref("OnboardingFlow"), perm="onboarding.edit", if_match=True,
   desc="422 `core_step_removed`, `core_field_changed`, `unknown_field_type`, `approval_step_missing`.")
op("post", f"{AD}/onboarding-flows/{{host_type}}/publish", "adminPublishOnboardingFlow", "Publish the draft as the next version", T, "staff", ["CFG-02", "CFG-04"],
   ["BR-CFG-02", "BR-STF-02"], resp=ref("OnboardingFlow"), status=201, perm="onboarding.edit", conflict=True,
   desc="Copies the draft into an immutable version. Hosts with drafts keep their own version (BR-HST-02).")
op("post", f"{AD}/onboarding-flows/{{host_type}}/versions/{{version}}/republish", "adminRepublishOnboardingVersion", "Roll back: republish an older version", T, "staff",
   ["CFG-02"], ["BR-CFG-02", "BR-STF-02"], resp=ref("OnboardingFlow"), status=201, perm="onboarding.edit", conflict=True, desc="Creates a new version number with the old content.")
T = "admin.taxonomy"
for res, sch, wsch, plural, single, pid in [("categories", "Category", "CategoryWrite", "Categories", "Category", "category_id"),
                                           ("amenities", "Amenity", "AmenityWrite", "Amenities", "Amenity", "amenity_id"),
                                           ("property-types", "PropertyType", "PropertyTypeWrite", "PropertyTypes", "PropertyType", "property_type_id")]:
    label = res.replace("-", " ")
    reqs = ["CFG-05", "LST-05"]
    op("get", f"{AD}/{res}", f"adminList{plural}", f"List {label}", T, "staff", reqs, ["BR-LST-04"],
       query=[qp("vertical", ref("Vertical"), "Filter."), qp("active", BOOL, "Filter.")], resp=list_of(ref(sch)), perm="categories.manage")
    op("post", f"{AD}/{res}", f"adminCreate{single}", f"Create one of the {label}", T, "staff", reqs, ["BR-LST-04", "BR-STF-02"],
       body=ref(wsch), resp=ref(sch), status=201, perm="categories.manage", conflict=True, desc="409 `slug_taken`.")
    op("patch", f"{AD}/{res}/{{{pid}}}", f"adminUpdate{single}", f"Edit, reorder, activate or deactivate one of the {label}", T, "staff", reqs, ["BR-LST-04", "BR-STF-02"],
       body=ref(wsch), resp=ref(sch), perm="categories.manage", desc="Body fields are all optional here.")
    op("delete", f"{AD}/{res}/{{{pid}}}", f"adminDelete{single}", f"Delete one of the {label} if never used", T, "staff", reqs, ["BR-LST-04", "BR-STF-02"],
       status=204, perm="categories.manage", conflict=True, desc="409 `in_use`: deactivate instead (BR-LST-04).")
T = "admin.promotions"
op("get", f"{AD}/coupons", "adminListCoupons", "Coupons", T, "staff", ["PRM-01"], ["BR-PRM-01"], query=[qp("active", BOOL, "Filter."), P("Page"), P("PageSize")],
   resp=page_of(ref("Coupon")), perm="promotions.manage", release="R2")
op("post", f"{AD}/coupons", "adminCreateCoupon", "Create a coupon", T, "staff", ["PRM-01", "PRM-02"], ["BR-PRM-01", "BR-PRM-02", "BR-STF-02"], body=ref("CouponWrite"),
   resp=ref("Coupon"), status=201, perm="promotions.manage", conflict=True, release="R2", desc="Code unique, case-insensitive (409 `code_taken`).")
op("patch", f"{AD}/coupons/{{coupon_id}}", "adminUpdateCoupon", "Edit, enable or disable a coupon", T, "staff", ["PRM-01"], ["BR-PRM-01", "BR-STF-02"], body=ref("CouponWrite"),
   resp=ref("Coupon"), perm="promotions.manage", release="R2", desc="Body fields are all optional here.")
op("delete", f"{AD}/coupons/{{coupon_id}}", "adminDeleteCoupon", "Delete an unused coupon", T, "staff", ["PRM-01"], ["BR-PRM-01", "BR-STF-02"], status=204,
   perm="promotions.manage", conflict=True, release="R2", desc="409 `in_use` once redeemed: disable instead.")
T = "admin.staff"
op("get", f"{AD}/staff", "adminListStaff", "Staff members", T, "staff", ["STF-01", "STF-02"], ["BR-STF-01"], resp=list_of(ref("StaffMember")), perm="team.manage")
op("get", f"{AD}/staff/roles", "adminListStaffRoles", "Roles and their permissions", T, "staff", ["STF-01"], ["BR-STF-01"], resp=list_of(ref("StaffRole")), perm="team.manage")
op("post", f"{AD}/staff/invitations", "adminInviteStaff", "Invite a staff member", T, "staff", ["STF-02"], ["BR-STF-01", "BR-STF-02"], body=ref("StaffInvite"),
   resp=ref("StaffMember"), status=201, perm="team.manage", conflict=True, desc="Sends a one-time link (72 h).")
op("patch", f"{AD}/staff/{{staff_id}}", "adminUpdateStaffRole", "Change a staff role", T, "staff", ["STF-01"], ["BR-STF-01", "BR-STF-02"], body=ref("StaffUpdate"),
   resp=ref("StaffMember"), perm="team.manage", conflict=True, desc="409 `last_super_admin`.")
op("post", f"{AD}/staff/{{staff_id}}/deactivate", "adminDeactivateStaff", "Deactivate (revokes sessions at once)", T, "staff", ["STF-02"], ["BR-ACC-03", "BR-STF-02"],
   resp=ref("StaffMember"), perm="team.manage", conflict=True)
op("post", f"{AD}/staff/{{staff_id}}/activate", "adminActivateStaff", "Reactivate a staff member", T, "staff", ["STF-02"], ["BR-STF-02"], resp=ref("StaffMember"), perm="team.manage", conflict=True)
op("post", f"{AD}/staff/{{staff_id}}/reset-mfa", "adminResetStaffMfa", "Reset a lost second factor", T, "staff", ["ACC-05", "STF-02"], ["BR-ACC-04", "BR-STF-02"],
   resp=ref("StaffMember"), perm="team.manage", desc="The staff member must enrol again at next login.")
T = "admin.audit"
op("get", f"{AD}/audit-events", "adminListAuditEvents", "Audit log", T, "staff", ["STF-03", "STF-04"], ["BR-STF-02", "BR-STF-03"],
   query=[qp("actor_role", STR, "Filter."), qp("actor", UUID, "Filter."), qp("action", arr(STR), "Filter."), qp("object_type", STR, "Filter."), qp("object_id", STR, "Filter."),
          qp("host_account", UUID, "Filter."), qp("from", {"type": "string", "format": "date-time"}, "Filter."), qp("to", {"type": "string", "format": "date-time"}, "Filter."),
          qp("q", STR, "Search."), P("Page"), P("PageSize")], resp=page_of(ref("AuditEvent")), perm="audit.view")
op("post", f"{AD}/exports", "adminCreateExport", "Export a filtered dataset as CSV", T, "staff", ["STF-06"], ["BR-STF-04", "BR-STF-02"],
   body=ref("ExportCreate"), resp=ref("ExportJob"), status=201, perm="reports.export + view permission of the dataset", rate=True,
   desc="Always a job. Small exports finish at once (status done). Cells starting with = + - @ TAB CR are prefixed with a quote. Audited with filters and row count.")
op("get", f"{AD}/exports", "adminListExports", "My recent exports", T, "staff", ["STF-06"], ["BR-STF-04"], query=[P("Page"), P("PageSize")], resp=page_of(ref("ExportJob")), perm="reports.export")
op("get", f"{AD}/exports/{{export_id}}", "adminGetExport", "Export status and download link", T, "staff", ["STF-06"], ["BR-STF-04"], resp=ref("ExportJob"), perm="reports.export")
T = "admin.analytics"
ANALYTICS_Q = [qp("period", {"type": "string", "enum": ["7d", "30d", "90d", "1y", "custom"], "default": "30d"}, "Window ending today (Africa/Algiers)."),
               qp("from", DATE, "For custom."), qp("to", DATE, "For custom."), qp("host_type", arr(ref("HostType")), "Filter."),
               qp("vertical", arr(ref("Vertical")), "Filter."), qp("wilaya", arr(INT), "Filter."), qp("group_stays", BOOL, "Roll home, hotel, hostel into stays (BR-SRC-04).")]
op("get", f"{AD}/analytics/kpis", "adminGetKpis", "KPIs with the previous period", T, "staff", ["RPT-01"], ["BR-RPT-01", "BR-SRC-04"], query=ANALYTICS_Q, resp=ref("KpiReport"), perm="reports.view (new)")
op("get", f"{AD}/analytics/charts", "adminGetCharts", "Chart series", T, "staff", ["RPT-01", "RPT-02"], ["BR-RPT-01"], query=ANALYTICS_Q, resp=ref("KpiCharts"), perm="reports.view (new)")
op("get", f"{AD}/search", "adminGlobalSearch", "Command palette search", T, "staff", ["STF-05"], ["BR-STF-01"],
   query=[qp("q", {"type": "string", "minLength": 2}, "Text.", True), qp("limit", {"type": "integer", "maximum": 20, "default": 12}, "Max hits.")],
   resp=list_of(ref("SearchHit")), perm="any staff (hits filtered by view permissions)")
