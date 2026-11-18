"""
Build the demo world through the backend's own services (``seed_demo``).

Order of work:

1. reference data (geography, taxonomy, moderation reason codes);
2. staff accounts (one super admin and the admin panel team);
3. people (website mock users, generated guests and host owners) with
   ``accounts.signup``;
4. host accounts and organisations (``hosts`` services), verification
   documents, submission and admin decisions, team invitations, deposit
   top-ups (``ledger`` services, four-eyes rule included);
5. listings, room types, photos, sessions and trips (``catalog``,
   ``inventory``, ``trips``), submitted and moderated by an admin;
6. a time line of events run in date order with :func:`clock.travel_to`:
   quotes and bookings, host answers, cancellations and refunds, stay
   confirmations, completions, reviews, disputes, conversations and
   notifications; past stays are therefore created by the same rules as
   live ones;
7. the scheduled jobs (complete, expire, publish reviews, recompute ratings,
   moderation queue) and a ledger reconciliation that must find no
   difference.

Direct model writes are used only where no service exists, each one marked
"direct write" in the code: verified email and phone (the real flows need
the code sent by email or SMS), active staff profiles without invitation
link, the website slugs of the mock trips, the availability windows'
restoration order (set at the end with ``update_listing``).

Idempotency: the whole seed runs in one transaction and starts by looking
for its first deposit receipt (``DEMO-TOPUP-0001``); when it exists the
demo world is complete and nothing is written again.
"""

import heapq
import itertools
import json
import re
import unicodedata
from collections import Counter
from datetime import date, datetime, time, timedelta
from io import StringIO
from pathlib import Path

from django.core.management import call_command
from django.db import transaction
from django.test.utils import override_settings
from django.utils import timezone

from apps.accounts import services as accounts
from apps.accounts.models import StaffProfile, StaffRole, StaffStatus, User
from apps.bookings import services as bookings
from apps.bookings.models import Booking, BookingStatus, RefundObligation
from apps.catalog import services as catalog
from apps.catalog.models import Category, Listing, PropertyType
from apps.catalog.states import ListingStatus
from apps.core.timeutils import business_datetime, business_today, business_tz
from apps.geo.models import Commune
from apps.hosts import services as hosts
from apps.hosts.context import HostContext
from apps.hosts.selectors import host_accounts_for
from apps.hosts.models import (
    ALL_HOST_PERMISSIONS,
    REQUIRED_DOCUMENTS,
    HostAccount,
    Membership,
    MembershipRole,
)
from apps.inventory import services as inventory
from apps.inventory.models import ExperienceSlot
from apps.ledger import services as ledger
from apps.ledger.models import WalletTopup
from apps.messaging import services as messaging
from apps.messaging.models import ParticipantRole
from apps.notifications import services as notifications
from apps.pricing import services as pricing
from apps.reviews import services as reviews
from apps.reviews.models import Review, ReviewStatus
from apps.trips import services as trips
from apps.trips.models import Trip
from apps.trust import services as trust

from . import generated
from .clock import travel_to

DATA_FILE = Path(__file__).resolve().parent / "data" / "frontend_mocks.json"
# The first deposit receipt written by the seed: its presence means the demo world exists.
SENTINEL_RECEIPT = "DEMO-TOPUP-0001"
TERMS_VERSION = "2026-01"
DOCUMENT_URL = "/assets/template.jpeg"

# Mock amenity names -> amenity slugs of the taxonomy (apps.catalog.seed_data). Names
# without a matching slug (spa, gym, lockers...) become hotel services or are dropped.
AMENITY_ALIASES = {
    "parking": "free_parking", "free_parking": "free_parking", "breakfast_included": "breakfast",
    "traditional_breakfast": "breakfast", "courtyard": "garden", "shared_kitchen": "kitchen",
    "rooftop_terrace": "balcony",
}
# Hotel facilities of the mocks -> property service kinds (DEC-017).
SERVICE_KINDS = {
    "spa": ("spa", "Spa & hammam"), "gym": ("gym", "Fitness centre"), "pool": ("pool", "Swimming pool"),
    "restaurant": ("restaurant", "Restaurant"), "fine_dining": ("restaurant", "Fine dining restaurant"),
    "valet_parking": ("parking", "Valet parking"), "valet": ("parking", "Valet parking"),
    "rooftop_terrace": ("cafe", "Rooftop terrace bar"), "desert_tours": ("other", "Desert tours"),
    "laundry": ("other", "Laundry"), "lockers": ("other", "Lockers"),
}
PROPERTY_TYPES = {
    "Villa": "villa", "Riad": "traditional_house", "Apartment": "apartment", "Heritage Home": "traditional_house",
    "Ksar": "traditional_house", "SUV / 4x4": "suv_4x4", "Crossover 4WD": "suv_4x4", "Hatchback": "car",
}
LISTING_CATEGORIES = {
    "lst_tipaza_villa": "beach", "lst_algiers_casbah": "city", "lst_casbah_loft": "city",
    "lst_oran_seafront": "beach", "lst_constantine_cliff": "city", "lst_tlemcen_andalusian": "mountain",
    "lst_ghardaia_ksar": "desert", "lst_toyota_landcruiser": "off_road", "lst_nissan_patrol": "off_road",
    "lst_dacia_duster": "off_road", "lst_renault_clio": "city_driving", "lst_djanet_tassili": "outdoor",
    "lst_taghit_dunes": "outdoor", "lst_casbah_culinary": "indoor", "lst_hotel_el_djazair": "business",
    "lst_casbah_hostel": "backpackers", "lst_hotel_royal_oran": "seaside", "lst_hostel_taghit_desert": "backpackers",
}
# Mock commune label -> (commune name in apps.geo, wilaya code).
PLACES = {
    "Tipaza": ("Tipaza", 42), "Casbah": ("Casbah", 16), "Oran": ("Oran", 31), "Constantine": ("Constantine", 25),
    "Tlemcen": ("Tlemcen", 13), "Ghardaïa": ("Ghardaia", 47), "Alger Centre": ("Alger Centre", 16),
    "Djanet": ("Djanet", 56), "Taghit": ("Taghit", 8), "El Mouradia": ("El Mouradia", 16), "Hydra": ("Hydra", 16),
    "Tipaza & Cherchell": ("Tipaza", 42),
}
ORG_PLACES = {
    "org_atlas_escapes": "Alger Centre", "org_el_djazair_hotel": "Hydra", "org_casbah_hostel": "Casbah",
    "org_royal_oran": "Oran", "org_taghit_hostel": "Taghit",
}
USER_PLACES = {"usr_amina": "Tipaza", "usr_karim": "Alger Centre", "usr_yacine": "Oran", "usr_sofiane": "Casbah",
               "usr_leila": "Oran"}
LANGUAGE_CODES = {"Arabic": "ar", "French": "fr", "English": "en", "Tamasheq": "tmh"}
# Mock reservations whose guest is the listing's own host: the backend refuses to book
# one's own offer (own_listing), so another mock guest makes the request.
GUEST_SWAPS = {"res_constantine_pending": "usr_leila"}
# Listings whose mock bookings are requests although the listing card said "instant".
REQUEST_MODE_LISTINGS = {"lst_tipaza_villa"}
DISPUTE_STATEMENT = "The key box code did not work on arrival and we waited two hours outside."


def _norm(text: str) -> str:
    """Accent-free, lower-case, letters and digits only (to match commune names)."""
    flat = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]", "", flat.lower())


def _ts(value: str) -> datetime:
    """Aware datetime from an ISO text of the mocks (``2026-10-01T10:00:00.000Z``)."""
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


def _day(value: str) -> date:
    """Date from ``YYYY-MM-DD``."""
    return date.fromisoformat(value)


def _minor(dzd) -> int:
    """Dinars of the mocks -> centimes (BR-PAY-01)."""
    return int(round(float(dzd) * 100))


def _phone(text: str) -> str:
    """``+213 550 12 34 56`` -> ``+213550123456``."""
    return "+" + re.sub(r"\D", "", text)


def _clock(value: str | None) -> time | None:
    """``15:00`` -> time."""
    return time.fromisoformat(value) if value else None


def _split_name(name: str) -> tuple[str, str]:
    """``Amina Benali`` -> (``Amina``, ``Benali``)."""
    first, _, last = name.strip().partition(" ")
    return first, last.strip()



def bookable_window(start, end, today=None):
    """
    Move a mock availability window that is already over so the demo listing stays bookable.

    The mocks use fixed dates (for example 15 to 31 October 2026). A window
    that ends within the next week is shifted forward, keeping its length,
    to start a week from today, so it still shows the rule (BR-AVL-05).
    """
    from datetime import timedelta

    from apps.core.timeutils import business_today

    today = today or business_today()
    if not end or end >= today + timedelta(days=7):
        return start, end
    length = (end - start) if start else timedelta(days=17)
    new_start = today + timedelta(days=7)
    return new_start, new_start + length


class DemoSeeder:
    """Builds the demo world; :meth:`run` is the only entry point."""

    def __init__(self, *, password: str, log=None):
        """``password`` is the one password of every demo account; ``log`` receives progress lines."""
        self.password = password
        self.log = log or (lambda text: None)
        self.mocks = json.loads(DATA_FILE.read_text(encoding="utf-8"))
        self.rng = generated.make_rng()
        self.users: dict[str, User] = {}
        self.accounts: dict[str, HostAccount] = {}
        self.listings: dict[str, Listing] = {}
        self.listing_rating: dict[str, float] = {}
        self.room_types: dict[str, object] = {}
        self.trips: dict[str, Trip] = {}
        self.bookings: dict[str, Booking] = {}
        self.conversations: dict[str, object] = {}
        self.counts = Counter()
        self.topups = 0
        self.events: list = []
        self.sequence = itertools.count()
        self.occupied: dict[str, list[tuple[date, date]]] = {}
        self.windows: dict[str, tuple[date | None, date | None]] = {}
        self.team_only: set[str] = set()
        self._communes: dict[str, list[Commune]] | None = None

    # ------------------------------------------------------------------
    # Entry point
    # ------------------------------------------------------------------
    def already_seeded(self) -> bool:
        """True when a previous run finished (its first deposit receipt exists)."""
        return WalletTopup.objects.filter(receipt_reference=SENTINEL_RECEIPT).exists()

    def run(self) -> dict:
        """
        Build everything in one transaction and return counters per kind.

        Emails of the sign-up flow are swallowed by the dummy email backend:
        the demo addresses are not real mailboxes.
        """
        self.now = timezone.now()
        self.today = business_today()
        with override_settings(EMAIL_BACKEND="django.core.mail.backends.dummy.EmailBackend"):
            with transaction.atomic():
                self.reference_data()
                self.staff()
                self.people()
                self.mock_hosts()
                self.generated_hosts()
                self.mock_listings()
                self.generated_listings()
                self.mock_trips()
                self.generated_trips()
                self.plan_mock_reservations()
                self.plan_generated_bookings()
                self.plan_conversations()
                self.plan_notifications()
                self.run_events()
                self.finish()
        return dict(self.counts)

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------
    def commune(self, name: str, wilaya: int | None = None) -> Commune:
        """The commune called ``name`` (accents and dashes ignored), in ``wilaya`` when given."""
        if self._communes is None:
            self._communes = {}
            for row in Commune.objects.all():
                self._communes.setdefault(_norm(row.name_fr), []).append(row)
        rows = self._communes.get(_norm(name), [])
        if wilaya is not None:
            rows = [row for row in rows if row.wilaya_id == wilaya] or rows
        if not rows:
            raise LookupError(f"Commune {name!r} not found; run seed_geo.")
        return rows[0]

    def place(self, label: str) -> Commune:
        """Commune of a mock location label (``Ghardaïa``, ``El Mouradia``...)."""
        name, wilaya = PLACES[label]
        return self.commune(name, wilaya)

    def taxonomy(self, model, vertical: str, slug: str | None):
        """Active category or property type row of a vertical, or ``None``."""
        if not slug:
            return None
        return model.objects.filter(vertical=vertical, slug=slug, is_active=True).first()

    def ctx(self, account: HostAccount) -> tuple[HostContext, User]:
        """Host context of ``account`` acting as its owner (solo host or organisation owner)."""
        if account.user_id:
            return HostContext(host_account=account, permissions=set(ALL_HOST_PERMISSIONS)), account.user
        membership = Membership.objects.select_related("user").get(
            organization_id=account.organization_id, role=MembershipRole.OWNER, is_active=True)
        return HostContext(host_account=account, membership=membership,
                           permissions=set(membership.permissions)), membership.user

    def at(self, when: datetime, func, *args, **kwargs) -> None:
        """Schedule ``func`` on the time line; it runs as if at ``when`` (skipped if ``when`` is in the future)."""
        heapq.heappush(self.events, (when, next(self.sequence), func, args, kwargs))

    def days_ago(self, days: float) -> datetime:
        """Real now minus ``days``."""
        return self.now - timedelta(days=days)

    # ------------------------------------------------------------------
    # 1. Reference data
    # ------------------------------------------------------------------
    def reference_data(self) -> None:
        """Geography, taxonomy and moderation reason codes (all idempotent)."""
        call_command("seed_geo", stdout=StringIO())
        catalog.seed_reference_data()
        trust.seed_reason_codes()
        self.log("Reference data ready.")

    # ------------------------------------------------------------------
    # 2. Staff
    # ------------------------------------------------------------------
    def staff(self) -> None:
        """
        One super admin and the admin panel team (``admin/lib/mock-data/admins.ts``).

        Direct write: there is no service that creates an active staff member
        without the emailed invitation link. Every staff role is ``admin``
        (DEC-016 has one staff role). No authenticator is created, so the
        first admin sign-in goes through the TOTP enrolment (BR-ACC-04).
        """
        for row in self.mocks["admins"]:
            first, last = _split_name(row["name"])
            user = User.objects.filter(email__iexact=row["email"]).first()
            if user is None:
                with travel_to(_ts(row["createdAt"])):
                    if row["role"] == "super_admin":
                        user = User.objects.create_superuser(email=row["email"], password=self.password,
                                                             first_name_latin=first, last_name_latin=last)
                    else:
                        user = User.objects.create_user(email=row["email"], password=self.password,
                                                        first_name_latin=first, last_name_latin=last)
                    user.is_staff = True
                    user.email_verified_at = timezone.now()
                    user.save(update_fields=["is_staff", "email_verified_at"])
                    StaffProfile.objects.update_or_create(user=user, defaults={
                        "role": StaffRole.ADMIN, "status": StaffStatus.ACTIVE, "activated_at": timezone.now()})
                self.counts["staff"] += 1
            self.users[row["id"]] = user
        self.admin = self.users["adm_01"]
        self.second_admin = self.users["adm_04"]  # finance: approves large top-ups (four eyes)
        self.log(f"Staff: {len(self.mocks['admins'])} accounts.")

    # ------------------------------------------------------------------
    # 3. People
    # ------------------------------------------------------------------
    def person(self, key: str, *, email: str, first: str, last: str, phone: str | None, joined: datetime,
               locale: str = "fr", bio: str = "", languages: list | None = None, commune: Commune | None = None,
               address: str = "") -> User:
        """
        Sign a person up with ``accounts.signup`` (as if on ``joined``), then
        fill the profile with ``update_profile``.

        Direct write: email and phone are marked verified (the real flows
        need the code sent by email or SMS); a verified phone is required to
        book and to host (DEC-012).
        """
        user = User.objects.filter(email__iexact=email).first()
        if user is None:
            with travel_to(joined):
                user = accounts.signup(email=email, phone=phone, password=self.password, first_name=first,
                                       last_name=last, locale=locale, accept_terms_version=TERMS_VERSION)
                accounts.update_profile(user, bio=bio, spoken_languages=languages or [], home_commune=commune,
                                        address_line=address)
                user.email_verified_at = user.phone_verified_at = timezone.now()
                user.save(update_fields=["email_verified_at", "phone_verified_at"])
            self.counts["users"] += 1
        self.users[key] = user
        return user

    def people(self) -> None:
        """Website mock users (except the website admin, who is the staff super admin) and generated people."""
        for row in self.mocks["users"]:
            if row["role"] == "admin":
                self.users[row["id"]] = self.admin
                continue
            first, last = _split_name(row["name"])
            place = USER_PLACES.get(row["id"])
            self.person(
                row["id"], email=row["email"], first=first, last=last, phone=_phone(row["phone"]),
                joined=_ts(row["createdAt"]), locale="fr", bio=row.get("bio", ""),
                languages=[LANGUAGE_CODES[n] for n in row.get("languages", []) if n in LANGUAGE_CODES],
                commune=self.place(place) if place else None, address=row.get("address", ""),
            )
        self.generated_guests = generated.guests(self.rng)
        for row in self.generated_guests:
            name, wilaya, _, _, _ = row["place"]
            self.person(row["key"], email=row["email"], first=row["first_name"], last=row["last_name"],
                        phone=row["phone"], joined=self.days_ago(row["days_ago"]), locale=row["locale"],
                        languages=row["languages"], commune=self.commune(name, wilaya))
        self.generated_host_rows = generated.hosts(self.rng)
        for row in self.generated_host_rows:
            name, wilaya, _, _, _ = row["place"]
            self.person(row["key"], email=row["email"], first=row["first_name"], last=row["last_name"],
                        phone=row["phone"], joined=self.days_ago(row["days_ago"]),
                        languages=["ar", "fr"], commune=self.commune(name, wilaya))
        self.log(f"People: {self.counts['users']} accounts created.")

    # ------------------------------------------------------------------
    # 4. Hosts
    # ------------------------------------------------------------------
    def verify(self, account: HostAccount, target: str, start: datetime) -> datetime:
        """
        Take a host through verification up to ``target`` (BR-HST-03, BR-HST-04).

        Documents are added and the account submitted at ``start``; an admin
        reviews one day later. Returns the moment the host is ready (approved
        or left in its state).
        """
        ctx, owner = self.ctx(account)
        with travel_to(start):
            docs = [hosts.add_document(ctx, doc_type=doc_type, file_url=DOCUMENT_URL)
                    for doc_type in sorted(REQUIRED_DOCUMENTS[account.host_type])]
            if target == "applied":
                return start
            hosts.submit_for_verification(ctx, owner)
        if target == "under_review":
            return start
        decided = start + timedelta(days=1)
        with travel_to(decided):
            for index, doc in enumerate(docs):
                reject = target == "changes_requested" and index == 0
                hosts.admin_review_document(self.admin, doc.id, approve=not reject,
                                            reason="The scan is blurred, please upload a sharper copy." if reject else "")
            if target == "changes_requested":
                hosts.admin_host_action(self.admin, account.id, "request-changes",
                                        reason="Please upload a sharper copy of the commerce register.")
                return decided
            hosts.admin_host_action(self.admin, account.id, "approve")
        account.refresh_from_db()
        return decided

    def topup(self, account: HostAccount, amount_dzd: int, when: datetime, *, approve: bool = True) -> None:
        """
        Record a deposit top-up with ``ledger.create_topup`` (BR-PAY-07).

        Amounts above the four-eyes threshold wait for a second admin; the
        finance admin approves them unless ``approve`` is False (left in the queue).
        """
        self.topups += 1
        methods = ["ccp_transfer", "bank_transfer", "baridimob", "cash_office"]
        with travel_to(when):
            row = ledger.create_topup(host_account=account, method=methods[self.topups % len(methods)],
                                      amount_minor=amount_dzd * 100, receipt_reference=f"DEMO-TOPUP-{self.topups:04d}",
                                      note="Demo deposit", actor=self.admin)
        if row.status == "pending_approval" and approve:
            with travel_to(when + timedelta(hours=2)):
                ledger.approve_topup(row.id, actor=self.second_admin)
        self.counts["wallet_topups"] += 1

    def mock_hosts(self) -> None:
        """Amina and Karim as solo hosts, the five mock organisations, Sarah's invitation, deposits."""
        self.host_ready: dict[str, datetime] = {}
        for key in ("usr_amina", "usr_karim"):
            user = self.users[key]
            start = user.date_joined + timedelta(days=1)
            with travel_to(start):
                account = hosts.become_individual_host(user)
            self.accounts[key] = account
            ready = self.verify(account, "approved", start)
            self.host_ready[key] = ready
            self.topup(account, 100_000, ready + timedelta(hours=1))
        for org in self.mocks["organizations"]:
            owner = self.users[org["ownerUserId"]]
            start = max(_ts(org["createdAt"]), owner.date_joined + timedelta(hours=2))
            fields = {
                "legal_name": org["name"], "description": org["description"], "business_email": org["businessEmail"],
                "business_phone_e164": _phone(org["businessPhone"]), "address_line": org["address"],
                "commune": self.place(ORG_PLACES[org["id"]]), "rc_number": org["businessRegistrationNumber"],
                "star_rating": org.get("hotelStarRating"), "check_in_time": _clock(org.get("checkInTime")),
                "check_out_time": _clock(org.get("checkOutTime")),
                "policies": {k: v for k, v in (("curfew", org.get("curfewPolicy")), ("age", org.get("agePolicy"))) if v},
            }
            with travel_to(start):
                account = hosts.create_organization(owner, business_category=org["businessCategory"],
                                                    display_name=org["name"], **fields)
                ctx, _ = self.ctx(account)
                hosts.update_host_account(ctx, default_approval_mode=org.get("bookingApprovalMode") or "request")
            self.accounts[org["id"]] = account
            self.counts["organizations"] += 1
            ready = self.verify(account, "approved", start)
            self.host_ready[org["id"]] = ready
            # The palace hotel deposits more than the four-eyes threshold: a second admin approves it.
            self.topup(account, 600_000 if org["id"] == "org_el_djazair_hotel" else 300_000, ready + timedelta(hours=1))
        # Pending team invitations of the mocks (BR-ORG-03).
        for row in self.mocks["memberships"]:
            if row["status"] != "invited":
                continue
            account = self.accounts[row["organizationId"]]
            ctx, owner = self.ctx(account)
            with travel_to(self.now - timedelta(days=3)):
                hosts.create_invitation(ctx, owner, role=row["role"], email=row["email"])
            self.counts["team_invitations"] += 1
        self.log("Mock hosts ready.")

    def generated_hosts(self) -> None:
        """Generated hosts of the four types in several verification states; two join a team by invitation."""
        for row in self.generated_host_rows:
            user = self.users[row["key"]]
            start = user.date_joined + timedelta(days=1)
            name, wilaya, city, _, _ = row["place"]
            with travel_to(start):
                if row["host_type"] == "individual":
                    account = hosts.become_individual_host(user)
                else:
                    account = hosts.create_organization(
                        user, business_category=row["host_type"], display_name=row["business_name"],
                        legal_name=f"{row['business_name']} SARL", business_email=row["email"],
                        business_phone_e164=row["phone"], commune=self.commune(name, wilaya),
                        address_line=f"Boulevard {row['first_name']} {row['last_name']}, {city}",
                        rc_number=row["rc_number"], tourism_licence_number=row["licence"],
                        star_rating=4 if row["host_type"] == "hotel" else None,
                        description=f"{row['business_name']}, a {row['host_type']} based in {city}.",
                    )
                    self.counts["organizations"] += 1
                ctx, _ = self.ctx(account)
                hosts.update_host_account(ctx, default_approval_mode=row["approval_mode"])
            self.accounts[row["key"]] = account
            target = "approved" if row["target"] == "suspended" else row["target"]
            ready = self.verify(account, target, start)
            self.host_ready[row["key"]] = ready
            if target == "approved":
                big = row["key"] == "host_08"  # left waiting for the second admin, shows the four-eyes queue
                self.topup(account, 650_000 if big else 120_000, ready + timedelta(hours=1), approve=not big)
        # Two generated guests join teams by invitation (they are left out of the booking plan).
        for guest_key, org_key, role in (("guest_23", "org_atlas_escapes", MembershipRole.AGENT),
                                         ("guest_24", "org_casbah_hostel", MembershipRole.GUIDE)):
            account, user = self.accounts[org_key], self.users[guest_key]
            ctx, owner = self.ctx(account)
            with travel_to(self.now - timedelta(days=40)):
                _, token = hosts.create_invitation(ctx, owner, role=role, email=user.email)
            with travel_to(self.now - timedelta(days=39)):
                hosts.accept_invitation(user, token)
            self.team_only.add(guest_key)
            self.counts["team_members_joined"] += 1
        self.log("Generated hosts ready.")

    # ------------------------------------------------------------------
    # 5. Listings and trips
    # ------------------------------------------------------------------
    def amenity_slugs(self, names: list[str], vertical: str) -> list[str]:
        """Mock amenity names mapped to taxonomy slugs that apply to ``vertical`` (others dropped)."""
        from apps.catalog.models import Amenity

        wanted = []
        for name in names:
            slug = AMENITY_ALIASES.get(name, name)
            if slug not in wanted:
                wanted.append(slug)
        usable = {a.slug for a in Amenity.objects.filter(slug__in=wanted, is_active=True) if vertical in (a.applies_to or [])}
        return [slug for slug in wanted if slug in usable]

    def publish(self, listing, when: datetime, *, status: str = "published", featured: bool = False,
                is_trip: bool = False) -> None:
        """
        Submit as the host, then moderate as an admin until ``status`` (BR-LST-03, DEC-003).

        ``draft`` stays a draft; ``pending_review`` waits in the queue;
        ``changes_requested``, ``rejected`` and ``suspended`` carry an admin
        reason; ``paused`` and ``archived`` are host moves after publication.
        """
        submit = trips.submit_trip if is_trip else catalog.submit_listing
        admin_move = trips.admin_change_trip_status if is_trip else catalog.admin_change_listing_status
        host_move = trips.change_host_trip_status if is_trip else catalog.change_host_listing_status
        if status == "draft":
            return
        with travel_to(when):
            submit(listing)
        if status == "pending_review":
            return
        with travel_to(when + timedelta(days=1)):
            if status in ("changes_requested", "rejected"):
                reason = ("Please add photos of every room and a precise address." if status == "changes_requested"
                          else "This offer duplicates another listing of the same host.")
                admin_move(listing, status, actor=self.admin, reason=reason)
                return
            admin_move(listing, ListingStatus.PUBLISHED, actor=self.admin)
            if featured and not is_trip:
                catalog.set_listing_featured(listing, {"is_featured": True}, actor=self.admin)
                self.counts["featured_listings"] += 1
        if status == "suspended":
            with travel_to(when + timedelta(days=20)):
                admin_move(listing, ListingStatus.SUSPENDED, actor=self.admin,
                           reason="Several guests reported that the photos do not match the place.")
        elif status in ("paused", "archived"):
            with travel_to(when + timedelta(days=15)):
                host_move(listing, status)

    def mock_listings(self) -> None:
        """The 18 website listings with their room types, photos, sessions and hotel services."""
        for row in self.mocks["listings"]:
            owner_key = row.get("organizationId") or row["hostUserId"]
            account = self.accounts[owner_key]
            vertical = row.get("businessCategory") or row["category"]
            created = max(_ts(row["createdAt"]), self.host_ready[owner_key] + timedelta(hours=1))
            policy = catalog.current_policy(row.get("cancellationPolicy") or "moderate")
            instant = row.get("instantBook")
            if row["id"] in REQUEST_MODE_LISTINGS:
                instant = False
            data = {
                "vertical": vertical, "title": row["title"], "description": row["description"],
                "source_language": "en",
                "property_type": self.taxonomy(PropertyType, vertical, PROPERTY_TYPES.get(row["type"], {
                    "hotel": "hotel", "hostel": "hostel", "experience": "activity"}.get(vertical))),
                "category": self.taxonomy(Category, vertical, LISTING_CATEGORIES.get(row["id"])),
                "commune": self.place(row["commune"]),
                "address_line": row.get("pickupLocation") or f"{row['commune']}, {row['city']}",
                "latitude": round(row["latlng"][0], 6), "longitude": round(row["latlng"][1], 6),
                "capacity_guests": row.get("guestCount") or row.get("seats") or row.get("groupSize") or 1,
                "bedrooms": row.get("bedroomCount"),
                "bathrooms": row.get("bathroomCount"),
                "base_price_minor": _minor(row["price"]) if vertical not in ("hotel", "hostel") else 0,
                "cleaning_fee_minor": _minor(row.get("cleaningFee") or 0),
                "min_nights": row.get("minNights") or 1, "max_nights": row.get("maxNights") or 90,
                "advance_notice_days": row.get("advanceNoticeDays") or 0,
                "check_in_time": _clock(row.get("checkInTime")), "check_out_time": _clock(row.get("checkOutTime")),
                "cancellation_policy": policy,
                "amenities": self.amenity_slugs(row.get("amenities", []), vertical),
            }
            if instant is not None:
                data["approval_mode"] = "instant" if instant else "request"
            elif row.get("bookingApprovalMode"):
                data["approval_mode"] = row["bookingApprovalMode"]
            if vertical == "vehicle":
                data["house_rules"] = [text for text in (row.get("mileagePolicy"), row.get("insuranceNotes")) if text]
                data["vehicle_detail"] = {
                    "make": row["make"], "model": row["model"], "year": row["year"], "seats": row["seats"],
                    "transmission": row["transmission"], "fuel": row["fuelType"],
                }
            if vertical == "experience":
                data["experience_type"] = row["experienceType"]
                data["experience_detail"] = {
                    "duration_minutes": int(row["durationHours"] * 60),
                    "languages": [LANGUAGE_CODES[n] for n in row.get("experienceLanguages", []) if n in LANGUAGE_CODES],
                    "meeting_point_text": f"{row['commune']}, {row['locationValue']}",
                    "max_group": row["groupSize"], "includes": row.get("includedItems", []),
                }
            with travel_to(created):
                listing = catalog.create_listing(account, data)
                for url in row["imageSrc"]:
                    catalog.add_photo(listing, url=url)
                for index, room in enumerate(row.get("roomTypes", [])):
                    beds = next((a for a in room.get("amenities", []) if "bed" in a.lower()), "")
                    room_type = catalog.create_room_type(listing, {
                        "name": room["name"], "description": room["description"],
                        "booking_unit": room["bookingUnit"], "unit_count": room["totalInventory"],
                        "capacity_per_unit": room["capacity"], "base_price_minor": _minor(room["price"]),
                        "beds_description": beds[:120], "sort_order": index,
                    })
                    self.room_types[room["id"]] = room_type
                    self.counts["room_types"] += 1
                    for url in room.get("imageSrc", []):
                        catalog.add_photo(listing, url=url, room_type=room_type)
                if vertical in ("hotel", "hostel"):
                    org = next(o for o in self.mocks["organizations"] if o["id"] == owner_key)
                    facilities = org.get("hotelAmenities") or org.get("hostelFacilities") or []
                    for name in dict.fromkeys(facilities + row.get("amenities", [])):
                        if name in SERVICE_KINDS:
                            kind, label = SERVICE_KINDS[name]
                            catalog.create_service(listing, {"kind": kind, "name": label})
                            self.counts["property_services"] += 1
            if vertical == "experience":
                self.future_sessions(listing, int(row["durationHours"] * 60), row["groupSize"], created)
            self.publish(listing, created + timedelta(hours=2), featured=row.get("featured", False))
            self.listings[row["id"]] = listing
            self.listing_rating[row["id"]] = float(row.get("rating") or 4.6)
            if row.get("availableFrom") or row.get("availableTo"):
                self.windows[row["id"]] = (_day(row["availableFrom"]) if row.get("availableFrom") else None,
                                           _day(row["availableTo"]) if row.get("availableTo") else None)
            self.counts["listings"] += 1
        self.log(f"Mock listings: {len(self.mocks['listings'])}.")

    def future_sessions(self, listing: Listing, minutes: int, seats: int, created: datetime) -> None:
        """Weekly experience sessions over the next two months (``inventory.create_slot``)."""
        tz = business_tz()
        with travel_to(created + timedelta(hours=1)):
            for week in range(8):
                day = self.today + timedelta(days=5 + 7 * week)
                start = datetime.combine(day, time(9, 0), tzinfo=tz)
                if not ExperienceSlot.objects.filter(listing=listing, starts_at=start).exists():
                    inventory.create_slot(listing, {"starts_at": start, "ends_at": start + timedelta(minutes=minutes),
                                                    "seats_total": seats})
                    self.counts["experience_sessions"] += 1

    def generated_listings(self) -> None:
        """
        About 26 generated listings of the generated hosts, in every listing
        state the admin panel shows (published, pending review, changes
        requested, rejected, suspended, paused, archived, draft).
        """
        plans = []
        statuses = iter(["pending_review", "changes_requested", "rejected", "suspended", "paused", "archived",
                         "draft", "pending_review"])
        for row in self.generated_host_rows:
            kind, target = row["host_type"], row["target"]
            if kind == "individual":
                specs = ([generated.home_listing(self.rng, row, i) for i in range(3)]
                         + [generated.vehicle_listing(self.rng, row, i) for i in range(2)]
                         if target == "approved" else [generated.home_listing(self.rng, row, 5)])
            elif kind == "agency":
                specs = ([generated.experience_listing(self.rng, row, i + len(plans)) for i in range(4)]
                         if target == "approved" else [generated.experience_listing(self.rng, row, 7)])
            else:
                specs = [generated.stay_listing(row, kind, self.rng)]
            for index, spec in enumerate(specs):
                if target == "approved":
                    # Every fourth listing of an approved host takes the next non-published state.
                    status = (next(statuses, "published") if index % 4 == 3 or row["key"] == "host_09"
                              else "published")
                elif target == "under_review":
                    status = "pending_review"
                elif target == "suspended":
                    status = "published"
                else:
                    status = "draft"
                plans.append((row, spec, status))
        for number, (row, spec, status) in enumerate(plans, start=1):
            account = self.accounts[row["key"]]
            name, wilaya, _, lat, lng = row["place"]
            created = min(self.host_ready[row["key"]] + timedelta(days=self.rng.randint(2, 40)),
                          self.now - timedelta(days=60))
            vertical = spec["vertical"]
            data = {
                "vertical": vertical, "title": spec["title"], "description": spec["description"],
                "source_language": "en",
                "property_type": self.taxonomy(PropertyType, vertical, spec.get("property_type")),
                "category": self.taxonomy(Category, vertical, spec.get("category")),
                "commune": self.commune(name, wilaya), "address_line": f"Rue de l'Independance, {row['place'][2]}",
                "latitude": round(lat + self.rng.uniform(-0.02, 0.02), 6),
                "longitude": round(lng + self.rng.uniform(-0.02, 0.02), 6),
                "capacity_guests": spec.get("guests", 1), "bedrooms": spec.get("bedrooms"),
                "bathrooms": spec.get("bathrooms"), "base_price_minor": spec.get("price", 0) * 100,
                "cleaning_fee_minor": spec.get("cleaning_fee", 0) * 100, "min_nights": spec.get("min_nights", 1),
                "max_nights": 30, "cancellation_policy": catalog.current_policy(spec["policy"]),
                "amenities": self.amenity_slugs(spec.get("amenities", []), vertical),
            }
            if vertical == "vehicle":
                data["vehicle_detail"] = spec["vehicle"]
            if vertical == "experience":
                data["experience_type"] = spec["experience_type"]
                data["experience_detail"] = {"duration_minutes": spec["duration_hours"] * 60,
                                             "languages": spec["languages"], "max_group": spec["guests"],
                                             "includes": spec["includes"], "meeting_point_text": row["place"][2]}
            with travel_to(created):
                listing = catalog.create_listing(account, data)
                for url in spec["photos"]:
                    catalog.add_photo(listing, url=url)
                for index, room in enumerate(spec.get("rooms", [])):
                    self.room_types[f"gen_{number}_{index}"] = catalog.create_room_type(listing, dict(room, sort_order=index))
                    self.counts["room_types"] += 1
            if vertical == "experience":
                self.future_sessions(listing, spec["duration_hours"] * 60, spec["guests"], created)
            self.publish(listing, created + timedelta(hours=3), status=status, featured=self.rng.random() < 0.12)
            key = f"gen_{number:02d}"
            self.listings[key] = listing
            self.listing_rating[key] = round(self.rng.uniform(4.3, 5.0), 2)
            self.counts["listings"] += 1
        # The suspended hostel host: published listing first, then the host is suspended (BR-HST-04).
        for row in self.generated_host_rows:
            if row["target"] == "suspended":
                with travel_to(self.now - timedelta(days=10)):
                    hosts.admin_host_action(self.admin, self.accounts[row["key"]].id, "suspend",
                                            reason="Licence expired, waiting for the renewed operating authorisation.")
        self.log(f"Generated listings: {len(plans)}.")

    def trip_departures(self, trip: Trip, starts: list[date], seats: int, when: datetime) -> None:
        """Dated departures of a trip (``trips.create_departure``)."""
        with travel_to(when):
            for start in starts:
                trips.create_departure(trip, {"starts_on": start, "ends_on": start + timedelta(days=trip.duration_days - 1),
                                              "seats_total": seats})
                self.counts["trip_departures"] += 1

    def mock_trips(self) -> None:
        """The four agency trips of the website, with itinerary, photos and departures."""
        for row in self.mocks["trips"]:
            account = self.accounts[row["organizationId"]]
            created = max(_ts(row["createdAt"]), self.host_ready[row["organizationId"]] + timedelta(hours=1))
            itinerary = []
            for day in row["itinerary"]:
                text = day["description"]
                extra = [f"Activities: {'; '.join(day['activities'])}." if day.get("activities") else "",
                         f"Meals: {day['meals']}." if day.get("meals") else "",
                         f"Overnight: {day['accommodation']}." if day.get("accommodation") else ""]
                itinerary.append({"day_number": day["day"], "title": day["title"][:120],
                                  "description": "\n".join([text, *[e for e in extra if e]])})
            data = {
                "trip_type": row["tripType"], "title": row["title"], "description": row["description"],
                "source_language": "en", "duration_days": row["durationDays"], "group_min": row["minGroupSize"],
                "group_max": row["maxGroupSize"], "price_per_person_minor": _minor(row["pricePerPerson"]),
                "inclusions": row.get("inclusions", []), "exclusions": row.get("exclusions", []),
                "start_commune": self.place(row["city"]), "meeting_point_latitude": round(row["latlng"][0], 6),
                "meeting_point_longitude": round(row["latlng"][1], 6), "meeting_point_text": row["meetingPoint"],
                "cancellation_policy": catalog.current_policy(row["cancellationPolicy"]), "itinerary": itinerary,
            }
            with travel_to(created):
                trip = trips.create_trip(account, data)
                # Direct write: keep the website's public URL name (create_trip derives one from the title).
                if not Trip.objects.filter(slug=row["slug"]).exclude(pk=trip.pk).exists():
                    Trip.objects.filter(pk=trip.pk).update(slug=row["slug"])
                    trip.slug = row["slug"]
                for url in dict.fromkeys([row["coverPhoto"], *row.get("gallery", [])]):
                    trips.add_photo(trip, url=url)
            self.trip_departures(trip, [_day(d) for d in row["departureDates"]], row["maxGroupSize"],
                                 created + timedelta(hours=1))
            self.publish(trip, created + timedelta(hours=2), is_trip=True)
            self.trips[row["id"]] = trip
            self.listing_rating[row["id"]] = float(row.get("rating") or 4.8)
            self.counts["trips"] += 1
        self.log(f"Mock trips: {len(self.mocks['trips'])}.")

    def generated_trips(self) -> None:
        """Two trips per approved generated agency (one left pending review), with future departures."""
        number = 0
        for row in self.generated_host_rows:
            if row["host_type"] != "agency" or row["target"] != "approved":
                continue
            for index in range(2):
                spec = generated.trip(self.rng, row, number)
                number += 1
                name, wilaya, _, lat, lng = row["place"]
                created = min(self.host_ready[row["key"]] + timedelta(days=10), self.now - timedelta(days=50))
                with travel_to(created):
                    trip = trips.create_trip(self.accounts[row["key"]], {
                        "trip_type": spec["trip_type"], "title": spec["title"], "description": spec["description"],
                        "source_language": "en", "duration_days": spec["duration_days"], "group_min": spec["group_min"],
                        "group_max": spec["group_max"], "price_per_person_minor": spec["price"] * 100,
                        "inclusions": spec["inclusions"], "exclusions": spec["exclusions"],
                        "start_commune": self.commune(name, wilaya), "meeting_point_latitude": round(lat, 6),
                        "meeting_point_longitude": round(lng, 6), "meeting_point_text": f"Agency office, {row['place'][2]}",
                        "itinerary": spec["itinerary"],
                    })
                    for url in spec["photos"]:
                        trips.add_photo(trip, url=url)
                starts = [self.today + timedelta(days=12 + 21 * k) for k in range(4)]
                self.trip_departures(trip, starts, spec["group_max"], created + timedelta(hours=1))
                self.publish(trip, created + timedelta(hours=2), status="pending_review" if index == 1 and number == 4
                             else "published", is_trip=True)
                key = f"gen_trip_{number}"
                self.trips[key] = trip
                self.listing_rating[key] = round(self.rng.uniform(4.5, 5.0), 2)
                self.counts["trips"] += 1
        self.log("Generated trips ready.")

    # ------------------------------------------------------------------
    # 6. Time line: bookings
    # ------------------------------------------------------------------
    def plan(self, **plan) -> None:
        """Put one booking on the time line (``plan`` keys: see :meth:`ev_book`)."""
        plan.setdefault("units", None)
        plan.setdefault("message", "")
        plan.setdefault("review", None)
        self.at(plan["created"], self.ev_book, plan)

    def plan_mock_reservations(self) -> None:
        """The nine website reservations, at their own dates, ending in their mock state."""
        outcomes = {"confirmed": "confirmed", "completed": "completed", "pending": "pending",
                    "cancelled": "cancelled", "declined": "declined"}
        for row in self.mocks["reservations"]:
            listing_key = row["listingId"]
            listing = self.listings[listing_key]
            guest = self.users[GUEST_SWAPS.get(row["id"], row["userId"])]
            check_in, check_out = _day(row["startDate"]), _day(row["endDate"])
            created = _ts(row["createdAt"])
            if row["status"] == "pending":
                # A request lives 24 hours: keep it open by asking now, and move dates that are no longer bookable.
                if not (self.now - timedelta(hours=20) < created < self.now):
                    created = self.now - timedelta(hours=1)
                while check_in <= self.today + timedelta(days=listing.advance_notice_days + 1):
                    check_in, check_out = check_in + timedelta(days=28), check_out + timedelta(days=28)
            plan = {
                "key": row["id"], "guest": guest, "created": created, "outcome": outcomes[row["status"]],
                "listing_key": listing_key, "check_in": check_in, "check_out": check_out,
                "guests": row["guestsCount"], "message": row.get("guestMessage", ""),
                "decline_reason": row.get("declineReason", ""),
            }
            if listing.vertical == "experience":
                plan["session"] = (check_in, check_out)
            if row["status"] == "cancelled":
                plan["cancel_at"] = created + timedelta(days=5)
            if row["status"] == "completed":
                plan["review"] = "both"
            self.occupy(listing_key, check_in, check_out)
            self.plan(**plan)

    def occupy(self, key: str, check_in: date, check_out: date) -> None:
        """Remember the nights a single-unit listing is taken by a planned booking."""
        self.occupied.setdefault(key, []).append((check_in, check_out))

    def free(self, key: str, listing: Listing, check_in: date, check_out: date) -> bool:
        """True when a planned stay fits the listing (no overlap on a single unit, inside its window)."""
        window = self.windows.get(key)
        if window and ((window[0] and check_in < window[0]) or (window[1] and check_out > window[1])):
            return False
        if listing.inventory_kind != "single":
            return True
        return all(check_out <= start or check_in >= end for start, end in self.occupied.get(key, []))

    def plan_generated_bookings(self) -> None:
        """
        About 50 bookings of generated guests on public offers, deterministic:
        completed stays with reviews, a disputed one, upcoming confirmed
        stays, open requests, guest cancellations with refunds, declined and
        expired requests, experience sessions and trip seats.
        """
        public = [k for k, listing in self.listings.items()
                  if Listing.objects.filter(pk=listing.pk, status=ListingStatus.PUBLISHED,
                                            host_account__verification_status="approved").exists()]
        guests = [g["key"] for g in self.generated_guests if g["key"] not in self.team_only]
        outcomes = (["completed"] * 18 + ["disputed"] + ["confirmed"] * 9 + ["pending"] * 5 + ["cancelled"] * 5
                    + ["declined"] * 3 + ["expired"] * 3)
        guest_cycle = itertools.cycle(guests)
        for number, outcome in enumerate(outcomes, start=1):
            for _ in range(40):
                key = self.rng.choice(public)
                listing = self.listings[key]
                nights = max(listing.min_nights, self.rng.randint(1, 4))
                if outcome in ("completed",):
                    check_in = self.today - timedelta(days=self.rng.randint(nights + 8, 150))
                elif outcome == "disputed":
                    check_in = self.today - timedelta(days=nights + 5)
                else:
                    check_in = self.today + timedelta(days=self.rng.randint(8, 60))
                check_out = check_in + timedelta(days=nights)
                created_days = self.rng.randint(5, 30)
                if outcome in ("completed", "disputed"):
                    created = business_datetime(check_in, time(10)) - timedelta(days=created_days)
                elif outcome == "pending":
                    created = self.now - timedelta(hours=self.rng.randint(1, 6))
                elif outcome == "expired":
                    created = self.now - timedelta(days=self.rng.randint(3, 6))
                else:
                    created = self.now - timedelta(days=min(created_days, 20))
                # Requests that stay open, are declined or expire need a listing in request mode.
                if outcome in ("pending", "declined", "expired") and \
                        pricing.effective_approval_mode(listing) != "request":
                    continue
                # A booking is only made once the offer is online.
                if listing.published_at and created > listing.published_at + timedelta(hours=1) and                         self.free(key, listing, check_in, check_out):
                    break
            else:
                continue
            guest = self.users[next(guest_cycle)]
            capacity = listing.capacity_guests if listing.inventory_kind == "single" else 2
            plan = {
                "key": f"gen_bkg_{number:02d}", "guest": guest, "created": created, "outcome": outcome,
                "listing_key": key, "check_in": check_in, "check_out": check_out,
                "guests": self.rng.randint(1, max(1, min(capacity, 4))),
                "decline_reason": "The property is closed for maintenance on these dates.",
                "review": ("both" if self.rng.random() < 0.75 else "guest") if outcome in ("completed", "disputed") else None,
            }
            if listing.vertical == "experience":
                plan["session"] = (check_in, check_in)
                plan["guests"] = self.rng.randint(1, 3)
            if listing.inventory_kind == "room_pool":
                room = listing.room_types.filter(is_active=True).order_by("sort_order").first()
                plan["room_type"] = room
                plan["guests"] = 1 if room.booking_unit == "bed" else self.rng.randint(1, room.capacity_per_unit)
            if outcome == "cancelled":
                plan["cancel_at"] = min(created + timedelta(days=1), self.now - timedelta(days=3))
                if plan["cancel_at"] <= created:
                    plan["created"] = plan["cancel_at"] - timedelta(days=2)
            self.occupy(key, check_in, check_out)
            self.plan(**plan)
        # Trip seats: a past departure completed with reviews, upcoming confirmed and requested seats.
        tassili = self.trips["trip_tassili_5day"]
        past = tassili.departures.filter(starts_on__lt=self.today - timedelta(days=tassili.duration_days + 3)).first()
        if past is not None:
            self.plan(key="gen_trip_bkg_1", guest=self.users["usr_sofiane"], outcome="completed", review="both",
                      created=business_datetime(past.starts_on, time(10)) - timedelta(days=20),
                      departure=past, guests=2)
        for number, (trip_key, outcome, guest_key) in enumerate(
                (("trip_taghit_3day", "confirmed", "usr_yacine"), ("trip_mzab_4day", "confirmed", "usr_leila"),
                 ("gen_trip_1", "confirmed", "guest_05"), ("gen_trip_3", "pending", "guest_06")), start=2):
            departure = (self.trips[trip_key].departures.filter(starts_on__gt=self.today + timedelta(days=3))
                         .order_by("starts_on").first())
            if departure is None:
                continue
            self.plan(key=f"gen_trip_bkg_{number}", guest=self.users[guest_key], outcome=outcome,
                      created=self.now - timedelta(days=2, hours=number), departure=departure, guests=2)

    def ev_book(self, plan: dict) -> None:
        """
        Quote and book (``pricing.build_quote`` + ``bookings.create_booking``),
        then schedule what happens next for the planned outcome.
        """
        target = {"guests": plan["guests"]}
        if plan.get("departure") is not None:
            target["trip_departure_id"] = plan["departure"].id
        else:
            listing = self.listings[plan["listing_key"]]
            target["listing_id"] = listing.id
            if plan.get("session"):
                tz = business_tz()
                minutes = listing.experience_detail.duration_minutes
                start = datetime.combine(plan["session"][0], time(9, 0), tzinfo=tz)
                slot = ExperienceSlot.objects.filter(listing=listing, starts_at=start).first()
                if slot is None:
                    end = start + timedelta(minutes=minutes)
                    if plan["session"][1] > plan["session"][0]:
                        end = max(end, datetime.combine(plan["session"][1], time(18, 0), tzinfo=tz))
                    slot = inventory.create_slot(listing, {"starts_at": start, "ends_at": end,
                                                           "seats_total": listing.capacity_guests})
                    self.counts["experience_sessions"] += 1
                target["experience_slot_id"] = slot.id
            else:
                target.update(check_in=plan["check_in"], check_out=plan["check_out"])
                if plan.get("room_type") is not None:
                    target["room_type_id"] = plan["room_type"].id
                elif listing.inventory_kind == "room_pool":
                    target["room_type_id"] = listing.room_types.order_by("sort_order").first().id
        quote = pricing.build_quote(guest=plan["guest"], **target)
        booking = bookings.create_booking(guest=plan["guest"], quote_id=quote.id)
        self.bookings[plan["key"]] = booking
        self.counts["bookings"] += 1
        if plan["message"]:
            conversation, _, _ = messaging.start_conversation(user=plan["guest"], booking_id=booking.id,
                                                              first_message=plan["message"])
            self.counts["messages"] += 1
        now = timezone.now()
        outcome = plan["outcome"]
        if booking.status == BookingStatus.PENDING:
            if outcome in ("confirmed", "completed", "disputed", "cancelled"):
                self.at(now + timedelta(hours=2), self.ev_accept, plan)
            elif outcome == "declined":
                self.at(now + timedelta(hours=3), self.ev_decline, plan)
            elif outcome == "expired":
                self.at(booking.request_expires_at + timedelta(minutes=1), self.ev_jobs)
            return
        self.after_confirmation(plan, booking)

    def after_confirmation(self, plan: dict, booking: Booking) -> None:
        """Schedule the life of a confirmed booking: cancellation, or stay, completion, reviews and dispute."""
        outcome = plan["outcome"]
        if outcome == "cancelled":
            self.at(plan["cancel_at"], self.ev_cancel, plan)
            return
        if outcome not in ("completed", "disputed"):
            return
        arrive = bookings.check_in_at(booking) + timedelta(hours=1)
        leave = bookings.check_out_at(booking) + bookings.COMPLETION_DELAY + timedelta(minutes=5)
        self.at(arrive, self.ev_stay, plan)
        self.at(leave, self.ev_jobs)
        if plan["review"]:
            self.at(leave + timedelta(days=1), self.ev_review, plan, "guest")
            if plan["review"] == "both":
                self.at(leave + timedelta(days=1, hours=3), self.ev_review, plan, "host")
        if outcome == "disputed":
            self.at(leave + timedelta(hours=20), self.ev_dispute, plan)

    def ev_accept(self, plan: dict) -> None:
        """The host accepts the request (``bookings.accept_booking``)."""
        booking = self.bookings[plan["key"]]
        ctx, actor = self.ctx(booking.host_account)
        bookings.accept_booking(ctx=ctx, booking_id=booking.id, actor=actor)
        booking.refresh_from_db()
        self.after_confirmation(plan, booking)

    def ev_decline(self, plan: dict) -> None:
        """The host declines with a reason (``bookings.decline_booking``)."""
        booking = self.bookings[plan["key"]]
        ctx, actor = self.ctx(booking.host_account)
        bookings.decline_booking(ctx=ctx, booking_id=booking.id, actor=actor, reason=plan["decline_reason"])

    def ev_cancel(self, plan: dict) -> None:
        """The guest cancels; a refund owed by the host is then paid and confirmed (review R8)."""
        booking = self.bookings[plan["key"]]
        bookings.cancel_by_guest(guest=plan["guest"], booking_id=booking.id, reason="Change of travel plans.")
        for refund in RefundObligation.objects.filter(booking=booking):
            self.at(timezone.now() + timedelta(days=1), self.ev_refund_paid, refund.id, booking.host_account)
            self.at(timezone.now() + timedelta(days=2), self.ev_refund_received, refund.id, plan["guest"])

    def ev_refund_paid(self, refund_id, account) -> None:
        """The host declares the refund sent (``bookings.declare_refund_paid``)."""
        ctx, actor = self.ctx(account)
        bookings.declare_refund_paid(ctx=ctx, refund_id=refund_id, actor=actor,
                                     payment_reference=f"CCP-DEMO-{str(refund_id)[-6:].upper()}")

    def ev_refund_received(self, refund_id, guest) -> None:
        """The guest confirms the money arrived (``bookings.confirm_refund_received``)."""
        bookings.confirm_refund_received(guest=guest, refund_id=refund_id)
        self.counts["refunds_settled"] += 1

    def ev_stay(self, plan: dict) -> None:
        """The guest confirms the stay took place (review R13), so it can be reviewed."""
        bookings.confirm_stay_by_guest(guest=plan["guest"], booking_id=self.bookings[plan["key"]].id)

    def ev_jobs(self) -> None:
        """The scheduled jobs as they would have run at this moment (complete stays, expire requests)."""
        bookings.complete_finished_stays(now=timezone.now())
        bookings.expire_pending_requests(now=timezone.now())

    def ev_review(self, plan: dict, side: str) -> None:
        """Guest or host review (``reviews.create_guest_review`` / ``create_host_review``), double-blind."""
        booking = self.bookings[plan["key"]]
        booking.refresh_from_db()
        if booking.status != BookingStatus.COMPLETED:
            return
        if side == "guest":
            target = booking.trip_departure.trip_id if booking.trip_departure_id else booking.listing_id
            key = next((k for k, v in {**self.listings, **self.trips}.items() if v.pk == target), None)
            rating = self.listing_rating.get(key, 4.6)
            overall = 5 if self.rng.random() < rating - 4 else 4
            comment, language = self.rng.choice(generated.REVIEW_COMMENTS)
            data = {"rating_overall": overall, "comment": comment, "language": language}
            for name in ("rating_cleanliness", "rating_accuracy", "rating_communication", "rating_location",
                         "rating_value"):
                data[name] = max(1, overall - (1 if self.rng.random() < 0.2 else 0))
            reviews.create_guest_review(guest=plan["guest"], booking_key=booking.id, data=data)
        else:
            ctx, actor = self.ctx(booking.host_account)
            comment, language = self.rng.choice(generated.HOST_REVIEW_COMMENTS)
            reviews.create_host_review(ctx=ctx, actor=actor, booking_key=booking.id,
                                       data={"rating_overall": 5, "comment": comment, "language": language})
        self.counts["reviews"] += 1

    def ev_dispute(self, plan: dict) -> None:
        """The guest opens a dispute about the stay (BR-CAN-05)."""
        bookings.open_dispute_as_guest(guest=plan["guest"], booking_id=self.bookings[plan["key"]].id,
                                       reason_code="check_in_issue", statement=DISPUTE_STATEMENT)
        self.counts["disputes"] += 1

    # ------------------------------------------------------------------
    # 6b. Time line: conversations and notifications
    # ------------------------------------------------------------------
    def plan_conversations(self) -> None:
        """The three website threads, started by the guest about a listing, with their messages and read state."""
        for conv in self.mocks["conversations"]:
            messages = sorted((m for m in self.mocks["messages"] if m["conversationId"] == conv["id"]),
                              key=lambda m: m["createdAt"])
            guest_key = next(p for p in conv["participants"] if self.users[p] != self.users[conv["otherUser"]["id"]])
            self.at(_ts(conv["createdAt"]), self.ev_start_thread, conv["id"], guest_key, conv["listingId"])
            for message in messages:
                self.at(_ts(message["createdAt"]), self.ev_message, conv["id"], message, guest_key)

    def ev_start_thread(self, conv_id: str, guest_key: str, listing_key: str) -> None:
        """``messaging.start_conversation`` by the guest about a public listing."""
        conversation, _, _ = messaging.start_conversation(user=self.users[guest_key],
                                                          listing_id=self.listings[listing_key].id)
        self.conversations[conv_id] = conversation
        self.counts["conversations"] += 1

    def ev_message(self, conv_id: str, message: dict, guest_key: str) -> None:
        """``messaging.send_message``; a message the mock marks as read is read 10 minutes later."""
        conversation = self.conversations[conv_id]
        sender = self.users[message["senderId"]]
        role = ParticipantRole.GUEST if message["senderId"] == guest_key else ParticipantRole.HOST_MEMBER
        row, _ = messaging.send_message(user=sender, conversation=conversation, role=role, body=message["text"])
        self.counts["messages"] += 1
        if message.get("read"):
            reader_role = ParticipantRole.HOST_MEMBER if role == ParticipantRole.GUEST else ParticipantRole.GUEST
            self.at(timezone.now() + timedelta(minutes=10), self.ev_read, conversation,
                    self.users[message["receiverId"]], reader_role, row.id)

    def ev_read(self, conversation, user: User, role: str, message_id) -> None:
        """``messaging.mark_read``."""
        messaging.mark_read(user=user, conversation=conversation, role=role, last_read_message_id=message_id)

    def plan_notifications(self) -> None:
        """
        Website notifications that have a matching kind in the catalogue:
        the booking confirmation and the new message. The price drop and the
        guest identity notices have no kind in the backend (not ported).
        """
        for row in self.mocks["notifications"]:
            if row["type"] in ("booking", "message"):
                self.at(_ts(row["createdAt"]), self.ev_notify, row)

    def ev_notify(self, row: dict) -> None:
        """``notifications.notify`` (in-app only), read when the mock says so."""
        user = self.users[row["userId"]]
        if row["type"] == "booking":
            booking = self.bookings["res_tipaza_01"]
            note = notifications.notify(user, "booking.confirmed", external=False,
                                        params={"reference": booking.reference, "title": booking.title},
                                        link=f"/trips/{booking.id}")
        else:
            conversation = self.conversations["conv_01"]
            note = notifications.notify(user, "message.received", external=False,
                                        params={"sender_name": self.users["usr_amina"].display_name,
                                                "title": conversation.listing.title},
                                        link=f"/messages/{conversation.id}")
        if row.get("read"):
            notifications.mark_read(user=user, notification_id=note.id)
        self.counts["notifications_ported"] += 1

    def run_events(self) -> None:
        """Run the time line in date order; events still in the future are left out (they have not happened)."""
        limit = self.now - timedelta(minutes=1)
        while self.events:
            when, _, func, args, kwargs = heapq.heappop(self.events)
            if when > limit:
                continue
            with travel_to(when):
                func(*args, **kwargs)
        self.log(f"Time line done: {self.counts['bookings']} bookings.")

    # ------------------------------------------------------------------
    # 7. Finish
    # ------------------------------------------------------------------
    def finish(self) -> None:
        """Favourites, availability windows, review moderation samples, scheduled jobs and the ledger check."""
        favorites = {"usr_amina": ["lst_tipaza_villa", "lst_oran_seafront"], "usr_yacine": ["lst_tipaza_villa"],
                     "usr_leila": ["lst_hotel_el_djazair", "lst_casbah_culinary"], "guest_01": ["lst_djanet_tassili"]}
        for user_key, listing_keys in favorites.items():
            for key in listing_keys:
                accounts.add_favorite(self.users[user_key], target_type="listing", target_id=self.listings[key].id)
                self.counts["favorites"] += 1
        accounts.add_favorite(self.users["usr_yacine"], target_type="trip", target_id=self.trips["trip_tassili_5day"].id)
        self.counts["favorites"] += 1
        # Availability windows of the mocks (booking rules stay live, no new review: BR-LST-02).
        for key, (start, end) in self.windows.items():
            start, end = bookable_window(start, end)
            catalog.update_listing(self.listings[key], {"available_from": start, "available_until": end})
        bookings.complete_finished_stays()
        bookings.expire_pending_requests()
        reviews.publish_due_reviews()
        self.moderation_samples()
        reviews.recompute_all_ratings()
        trust.sync_cases()
        differences = ledger.reconcile_balances()
        if differences:
            raise RuntimeError(f"Ledger does not reconcile after the demo seed: {differences}")
        self.counts["booking_states"] = dict(Counter(Booking.objects.filter(
            pk__in=[b.pk for b in self.bookings.values()]).values_list("status", flat=True)))
        self.log("Finished: ledger reconciled.")

    def moderation_samples(self) -> None:
        """A host reply, a reported review and a hidden review, so the moderation screens have content."""
        published = list(Review.objects.filter(status=ReviewStatus.PUBLISHED, author_role="guest",
                                               booking__in=list(self.bookings.values())).order_by("submitted_at"))
        if published:
            review = published[-1]
            ctx, actor = self.ctx(review.host_account)
            reviews.reply_to_review(ctx=ctx, actor=actor, review_id=review.id,
                                    body="Thank you for your kind words, you are welcome back anytime!")
        if len(published) > 2:
            reporter = self.users["usr_karim"]
            target = next((r for r in published[1:-1] if r.author_id != reporter.id and
                           r.host_account_id not in {a.id for a, _ in host_accounts_for(reporter)}), None)
            if target is not None:
                reviews.report_review(reporter=reporter, review_id=target.id, reason_code="off_topic",
                                      note="This review talks about another property.")
            hidden = published[0]
            reviews.hide_review(actor=self.admin, review_id=hidden.id,
                                reason="Contains personal details about the host family.", reason_code="personal_data")
