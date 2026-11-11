"""Builds compact/BLADUS-backend-compact.md: the short version of the blueprint.

Documentation tooling only. Run from docs/backend:
    python _tools/build_compact.py && node _tools/build_compact.mjs
Static text lives in this file; table lists, the API list and the SQL come from
schema.dbml, openapi.yaml and schema.sql so they always match the full blueprint.
"""
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "compact"
OUT.mkdir(exist_ok=True)
IMG = "../diagrams/rendered"

# ------------------------------------------------------------------ table descriptions
DESC = {
 "user": "Every person: guest, host, team member or admin. Email, phone, names in Latin and Arabic, language, status.",
 "staff_profile": "Marks a user as BLADUS staff. One role today: admin.",
 "staff_permission": "List of admin permissions (kept so roles can be split later).",
 "staff_role_permission": "Which role has which permission. Today: admin has all.",
 "consent_record": "History of accepted terms, privacy notice and marketing opt-in.",
 "favorite": "Listings and trips a guest saved.",
 "wilaya": "The 69 wilayas with names in three languages and map shape.",
 "daira": "Dairas, between wilaya and commune.",
 "commune": "The 1,541 communes; every listing points to one.",
 "host_account": "The one who hosts: either one person (solo host) or one organisation. Owns listings, trips and the deposit wallet.",
 "organization": "An agency, hotel or hostel business with its legal details.",
 "membership": "Who works in an organisation and with which role.",
 "invitation": "Invitation sent to a future team member (expires after 7 days).",
 "host_document": "Verification documents of a host (ID, commerce register, licence...), each reviewed on its own.",
 "payout_account": "The host's CCP or bank details, stored encrypted (used to return unused deposit; payouts later).",
 "category": "Categories shown on the site, per product family.",
 "property_type": "Villa, apartment, riad, SUV... per product family.",
 "amenity": "One shared list of amenities (Wi-Fi, pool, parking...).",
 "cancellation_policy": "Flexible, moderate, strict: refund percentages by days before arrival.",
 "listing": "Something to book: home, hotel, hostel, experience or vehicle. Price, place, rules, status.",
 "listing_revision": "Edits of a published listing waiting for admin review.",
 "vehicle_detail": "Extra fields for vehicles (make, model, gearbox, driver rules).",
 "experience_detail": "Extra fields for experiences (duration, languages, meeting point).",
 "room_type": "A kind of room or bed in a hotel or hostel, with how many exist. Can be imported from the hotel system.",
 "listing_amenity": "Which amenities a listing has.",
 "room_type_amenity": "Which amenities a room type has.",
 "listing_photo": "Photos of listings, room types and trips, in order, with a cover.",
 "featured_placement": "Listings or trips the admin features on the home page for a period.",
 "listing_day": "For a home or vehicle: a day the host blocked or priced differently.",
 "room_type_night": "For one room type and one night: units existing, held and booked. The database refuses overselling.",
 "experience_slot": "A dated time slot of an experience with its seats.",
 "trip": "A multi-day agency trip with type, price per person and policy.",
 "trip_itinerary_day": "Day by day programme of a trip.",
 "trip_departure": "A dated departure of a trip with seats and status.",
 "quote": "A price calculated by the server for chosen dates, valid 30 minutes.",
 "tax_rate": "Tourist tax and VAT rates with validity dates (used later).",
 "booking": "One reservation with frozen prices, commission and cancellation rules. The database refuses overlapping stays.",
 "booking_event": "Every status change of a booking, in order.",
 "refund": "Amounts owed back to the guest after a cancellation.",
 "dispute": "A disagreement about a stay and how it was resolved (later release).",
 "ledger_account": "Money accounts: one deposit wallet per host, BLADUS cash, BLADUS commission.",
 "ledger_transaction": "One money event (top-up, commission, commission returned). Never edited.",
 "ledger_entry": "The lines of a money event; they always add up to zero.",
 "account_balance": "Current balance of each account (always equals the sum of its lines).",
 "wallet_topup": "A host deposit recorded by the admin with its receipt reference.",
 "gateway_event": "Messages from a payment gateway. Not used until online payment exists.",
 "payment": "Guest payments by card. Not used until online payment exists.",
 "payout": "Money sent to hosts. Not used until online payment exists (except returning unused deposit).",
 "invoice": "Commission invoices to hosts (later release).",
 "review": "Rating and comment after a completed booking.",
 "review_reply": "The host's single public reply to a review.",
 "review_report": "A report against a review, for the admin to check.",
 "conversation": "A message thread between a guest and a host.",
 "conversation_participant": "Who is in a thread and what they have read.",
 "message": "One message; contact details are masked before a booking is confirmed.",
 "notification": "In-app notifications.",
 "notification_preference": "Which notifications a user wants by email, SMS or push.",
 "outbox_event": "Things to send after a change is saved (email, SMS, search refresh), so nothing is lost.",
 "delivery_log": "Result and cost of each email or SMS sent.",
 "media_asset": "Every uploaded file: public photos and private documents.",
 "reason_code": "Preset reasons (reject, decline, cancel, report) in three languages.",
 "moderation_case": "One item in the admin queue: a host to verify, a listing to review, a report.",
 "moderation_decision": "What the admin decided on a case and why.",
 "change_request_item": "The list of changes the admin asks a host to make.",
 "platform_settings": "Platform settings by version: commission rates, reply window, switches.",
 "onboarding_flow_version": "The steps of the become-a-host forms, by host type and version.",
 "onboarding_draft": "A host application in progress, saved on the server.",
 "coupon": "Discount codes (later release).",
 "coupon_redemption": "Use of a coupon on a booking (later release).",
 "audit_event": "Who did what and when. Cannot be edited or deleted.",
 "export_job": "CSV exports requested by the admin.",
 "data_subject_request": "Requests from users to see, fix or delete their data.",
 "idempotency_record": "Protects against a request being executed twice after a retry.",
 "incident_record": "Register of security incidents with the 5-day notification clock.",
 "calendar_feed": "iCal calendar links for importing or exporting availability (later release).",
 "otp_send_log": "Log of every SMS code sent (for cost control and fraud detection).",
 "property_integration": "Connection to a hotel's own system: which system, encrypted access key, what to sync, status.",
 "integration_sync_log": "One line per sync run with what changed or why it failed.",
 "property_service": "Services of a hotel or hostel (restaurant, spa, parking...), typed by hand or imported.",
 "listing_search_doc": "One ready-to-search line per published listing; makes search fast.",
}

GROUP_TEXT = {
 "Accounts": "People and access. One `user` table for everybody; an admin is a user with a `staff_profile`.",
 "Geography": "Algeria's official places. A listing points to a commune and the wilaya is deduced from it.",
 "Host Accounts And Organisations": "Who hosts. A `host_account` is either one person or one organisation; team members are linked through `membership`.",
 "Taxonomy": "Shared lists used by listings: categories, property types, amenities, cancellation policies.",
 "Catalogue: Listings And Room Types": "What is offered. A `listing` holds the common fields; vehicles and experiences have an extra detail table; hotels and hostels have room types.",
 "Inventory And Calendar": "What is free and at which price, per day (homes, vehicles), per night and room type (hotels, hostels) or per time slot (experiences).",
 "Trips (Agency Only)": "Multi-day trips sold by agencies, with a day by day programme and dated departures.",
 "Pricing": "Prices are always calculated by the server and stored as a quote.",
 "Bookings": "Reservations and their history. A booking points to exactly one target: a listing, a room type, an experience slot or a trip departure.",
 "Money: Ledger, Wallet, Dormant Payments": "Host deposits and BLADUS commission, written as balanced lines that are never edited. The payment, payout and gateway tables exist but are not used until online payment is added.",
 "Reviews": "Ratings and comments after completed stays, the host reply and reports.",
 "Messaging And Notifications": "Message threads, notifications and the reliable sending of emails and SMS.",
 "Media": "Uploaded files.",
 "Moderation, Config, Audit, Privacy, System": "Admin work (queues, decisions), settings, onboarding forms, the audit log, privacy requests, hotel system connections and technical helpers.",
}

# ------------------------------------------------------------------ diagrams (file, title, description)
ARCH = [
 ("01-system-context", "Who uses BLADUS and what it talks to",
  "Guests and hosts use the website; the admin uses the admin app. Both apps call one Django API, which is the only place where data is stored and rules are applied. The API sends SMS and emails, stores photos and documents, and exchanges data with hotel systems. The payment gateway is drawn with a dotted line because online payment is not part of the first release."),
 ("02-containers", "What runs where",
  "The browser reaches a reverse proxy, then the two Next.js servers. These servers keep the login cookie and call the Django API on the user's behalf, so the browser never talks to Django directly. Background workers send messages and run timed jobs (expire requests, complete stays, sync hotel systems). PostgreSQL keeps all data, Redis is used for queues and limits, and file storage keeps photos and documents. Everything that holds personal data is planned in Algerian data centres, with a copy in a second site."),
 ("03-django-apps", "How the backend code is organised",
  "The backend is one Django project split into small apps arranged in layers. An arrow means \"may use\". An app may only use apps in lower layers: for example `bookings` uses `pricing` and `ledger`, never the opposite. This keeps the code easy to change and to test. Emails, SMS and search updates are not called directly: they go through the outbox in `notifications`."),
]
STATES = [
 ("10-booking-states", "Life of a booking",
  "Each box is a status and each arrow an allowed move. A booking starts as `pending` (the host must answer within 24 hours) or directly `confirmed` (instant booking). A pending request can be accepted, declined, withdrawn by the guest, or expire by itself. A confirmed booking ends as `completed` after check-out or `cancelled`. `disputed` is for a later release. Any move not drawn is refused by the API."),
 ("11-listing-states", "Life of a listing or a trip",
  "A host writes a draft and submits it. The admin approves it (published), asks for changes or rejects it. Only published listings appear in search and can be booked. The host can pause or archive a listing; the admin can suspend it. Deleting is reversible by the admin."),
 ("12-host-verification-states", "Verification of a host",
  "A new host applies and sends documents. The admin approves when all required documents are approved, asks for changes, or rejects. Changing legal details sends an approved host back to review. The admin can suspend or ban a host; a suspended host's listings are paused automatically."),
 ("13-review-states", "Life of a review",
  "A guest can write a review only after a completed stay, within 14 days. It becomes public when published. If someone reports it, the admin can dismiss the report, hide the review or remove it."),
]
FLOWS = [
 ("20-seq-instant-booking", "Instant booking, step by step",
  "Read from top to bottom. The website first asks the API for a price (quote), then creates the booking with that quote. Everything happens in one database transaction: the booking is saved, the database itself refuses overlapping dates, the commission is taken from the host's deposit, and the messages to send are written in the outbox. After the save, a worker sends the SMS, email and notifications. The exact address is shown to the guest only after confirmation."),
 ("21-seq-request-to-book", "Request to book",
  "The guest sends a request and the dates are blocked while it waits. Three endings are possible: the host accepts (the booking is confirmed and the commission is taken), the host declines (dates are freed), or nobody answers and a timed job expires the request after 24 hours and tells both sides."),
 ("22-seq-wallet-topup", "Host deposit top-up",
  "There is no online payment in the first release. The host sends money to BLADUS by CCP or bank transfer; the admin records the top-up with the receipt reference (the same receipt cannot be used twice). Large amounts need a second admin to approve. Each confirmed booking then takes its commission from this deposit, and a cancelled booking gives the full commission back."),
 ("23-seq-host-onboarding", "Becoming a host",
  "The form steps come from the published configuration, and the draft is saved on the server so the host can continue later. Documents are uploaded directly to private storage. When the host submits, a case appears in the admin queue; the admin checks each document, then approves the host, who can then create a first listing."),
 ("25-seq-hotel-sync", "Connecting a hotel's own system",
  "A hotel owner enters the access key of the hotel system. The API tests the connection, saves the key encrypted, and a job imports room types, prices, availability and services (restaurants, spa, parking...). The job then refreshes availability and prices every 15 minutes. If a sync fails, the last good data stays and the connection is flagged."),
 ("24-seq-message-sync", "Messages",
  "The website asks the API for messages after the last one it already has (a cursor), so repeated checks are cheap. Before a booking is confirmed, phone numbers, emails and payment account numbers written in a message are masked for the other person, to protect guests from off-platform scams."),
 ("30-money-flow", "Where the money goes",
  "In the first release the guest pays the host directly. The host keeps a deposit at BLADUS, topped up by transfer. BLADUS takes its commission from that deposit when a booking is confirmed and returns it in full if the booking is cancelled. Online card payment comes later."),
]


def fig(name, title, text):
    return f"### {title}\n\n![{title}]({IMG}/{name}.svg)\n\n{text}\n"


# ------------------------------------------------------------------ schema parse
src = (ROOT / "schema.dbml").read_text(encoding="utf-8")
sections, current = {}, None
lines = src.splitlines()
for i, line in enumerate(lines):
    if line.startswith("// ====") and i + 1 < len(lines) and lines[i + 1].startswith("// ") and not lines[i + 1].startswith("// ===="):
        current = lines[i + 1][3:].strip().title()
        sections.setdefault(current, [])
    m = re.match(r"Table (\w+) \{", line)
    if m and current:
        sections[current].append(m.group(1))
sections = {k: v for k, v in sections.items() if v}
all_tables = [t for v in sections.values() for t in v]
missing = [t for t in all_tables if t not in DESC]
assert not missing, f"no description for {missing}"


def erd_block():
    out = []
    for idx, (sec, names) in enumerate(sections.items(), 1):
        slug = re.sub(r"[^a-z0-9]+", "-", sec.lower()).strip("-")
        title = sec.replace(" And ", " and ").replace("(Agency Only)", "(agency only)")
        out.append(f"### {idx}. {title}\n")
        out.append(f"![{title}]({IMG}/erd-{idx:02d}-{slug}.svg)\n")
        out.append(GROUP_TEXT.get(sec, "") + " Boxes that show only `id` are tables from another group, drawn to show the link.\n")
        out.append("| Table | What it holds |\n|---|---|")
        out += [f"| `{t}` | {DESC[t]} |" for t in names]
        out.append("")
    return "\n".join(out)


# ------------------------------------------------------------------ API list
def api_block():
    ops, path, cur = [], None, None
    for line in (ROOT / "openapi.yaml").read_text(encoding="utf-8").splitlines():
        if line.startswith("  /") and line.rstrip().endswith(":"):
            path = line.strip()[:-1]
        elif path and re.match(r"^    (get|post|put|patch|delete):\s*$", line):
            cur = {"m": line.strip()[:-1].upper(), "p": path, "s": "", "tag": "", "dormant": False}
            ops.append(cur)
        elif cur is not None:
            s = line.strip()
            if s.startswith("summary:") and not cur["s"]:
                cur["s"] = s[8:].strip().strip("'\"")
            elif s.startswith("- ") and not cur["tag"] and re.match(r"^- [a-z]+(\.[a-z_]+)?$", s):
                cur["tag"] = s[2:]
            elif s == "x-dormant: true":
                cur["dormant"] = True
        if line.startswith("components:"):
            break
    live = [o for o in ops if not o["dormant"]]
    groups = [("auth", "Sign-up and sign-in"), ("public", "Public (no login needed)"), ("me", "Signed-in guest"),
              ("messaging", "Messages"), ("media", "File uploads"), ("host", "Host workspace"), ("admin", "Admin"), ("webhooks", "Webhooks")]
    out = [f"The contract has {len(ops)} operations; {len(ops) - len(live)} of them (card payments, payouts, gateway) are switched off until online payment exists and are not listed here. The full machine-readable contract is `openapi.yaml`.\n"]
    for key, title in groups:
        rows = [o for o in live if o["tag"].split(".")[0] == key]
        if not rows:
            continue
        out.append(f"#### {title} ({len(rows)})\n\n| Method | Path | What it does |\n|---|---|---|")
        out += [f"| {o['m']} | `{o['p'].replace('/api/v1', '')}` | {o['s'].replace('|', '/')} |" for o in rows]
        out.append("")
    return "\n".join(out), len(ops), len(live)


# ------------------------------------------------------------------ SQL
def sql_blocks():
    full = (ROOT / "schema.sql").read_text(encoding="utf-8")
    kept, skip = [], False
    for line in full.splitlines():
        if line.startswith("COMMENT ON"):
            skip = not line.rstrip().endswith(";")
            continue
        if skip:
            skip = not line.rstrip().endswith(";")
            continue
        kept.append(line)
    text = re.sub(r"\n{3,}", "\n\n", "\n".join(kept)).strip()
    doc = (ROOT / "05-database-schema.md").read_text(encoding="utf-8")
    cons = re.search(r"```sql\n(.*?)```", doc, re.S).group(1).strip()
    cons = cons.replace("'awaiting_payment',", "")
    return cons, text


api_md, n_ops, n_live = api_block()
cons_sql, full_sql = sql_blocks()
n_tables = len(all_tables)

MD = f"""# BLADUS backend: compact blueprint

**What we will build, the choices, the flows, the database and the API.** Version of 2026-11-11. The complete blueprint (all research, requirements and details) stays in `dist/BLADUS-backend-blueprint.pdf`.

## 1. What we will build

BLADUS has a website (guests and hosts) and an admin app, but no real backend: data lives in memory, disappears on restart, and the two apps do not share it. We will build **one Django backend with a PostgreSQL database** that both apps call through an API.

| Topic | Decision |
|---|---|
| Products | Homes, hotels, hostels, experiences, vehicles, agency trips |
| Who publishes what | Solo host: homes and vehicles. Agency: experiences and trips. Hotel and hostel: their property with rooms and services |
| BLADUS income | Commission paid by the host: individual 12%, agency 15%, hotel 18%, hostel 10%. Guests pay no BLADUS fee |
| Payment | **No online payment in the first release.** The guest pays the host directly; the host keeps a deposit at BLADUS. Online payment comes later |
| Cancellation | The host **always recovers the full commission** when a confirmed booking is cancelled |
| Admin | **One role: admin**, with all permissions |
| Hotels | BLADUS **connects directly to the hotel's own system** to import rooms, availability, prices and services |
| Moderation | New listings and trips are checked by the admin before going live |
| Double booking | Impossible: the database itself refuses it |
| Languages | English, French, Arabic (right-to-left), Latin digits |
| Geography | 69 wilayas, 1,541 communes |
| Size | {n_tables} tables, {n_live} API operations in the first release |

## 2. Technical choices, with short comparisons

| Need | We choose | Instead of | Why |
|---|---|---|---|
| Backend framework | **Django 6.1** (Python) | Node/NestJS, Laravel | The owner knows Django; admin tools, security and database support are built in |
| API layer | **Django REST Framework** | Django Ninja | Mature permissions, rate limits and documentation tools; most Django developers know it |
| Database | **PostgreSQL + PostGIS** | MySQL, MongoDB | Date ranges and exclusion rules stop double booking inside the database; real map queries |
| Sign-in | **django-allauth (headless)**, session tokens | JWT tokens with SimpleJWT | Phone codes and two-step login included; sessions can be cancelled at once |
| Session in the apps | **Next.js server keeps an httpOnly cookie** and calls Django | Token stored in the browser | The browser never holds a token that scripts could steal |
| Background jobs | **Celery + Redis** | Django tasks, Dramatiq | Schedules, retries and monitoring are proven |
| Search | **PostgreSQL** (text + map + availability) | Meilisearch, Elasticsearch | One system, always consistent with availability; add a search engine only if needed |
| Messages | **Polling "what is new since..."** | WebSockets from day one | Much simpler to run; real-time can be added later |
| Files | **S3-compatible storage hosted in Algeria**, direct uploads | Files on the app server, Cloudinary | Cheap, safe, and personal documents stay in the country |
| Money storage | **Whole centimes + double-entry ledger** | Decimal numbers, simple balance column | No rounding errors; every dinar can be explained |
| Code structure | **One project, small apps in layers** | Many microservices | Right size for a small team |
| API contract | **OpenAPI file + generated TypeScript client** | Hand-written fetch calls | The two apps cannot drift from the API |
| Hosting | **Algerian data centre** (two sites) | European cloud | Algerian e-commerce and personal data laws point to hosting in Algeria (to confirm with a lawyer) |
| Tests | **pytest + property tests + contract tests** | Manual testing | Money and date rules are checked on thousands of cases automatically |

## 3. Payment: now and later

| | First release (now) | Later |
|---|---|---|
| Guest pays | Directly to the host: cash on arrival or transfer | By CIB or Edahabia card on BLADUS, through a payment gateway |
| BLADUS is paid | From the host's deposit: commission taken at confirmation | Commission kept from the guest's payment |
| Host deposit top-up | Transfer to BLADUS (CCP or bank); the admin records it with the receipt reference | Also online by card |
| Refund to guest | Owed by the host; BLADUS shows the amount to both sides | Made by BLADUS through the gateway |
| What is needed first | Nothing more | Gateway contract and legal confirmation that BLADUS may collect guests' money |

The database and API already contain the tables and operations for online payment (`payment`, `payout`, `gateway_event`), but they stay switched off. Adding online payment later will not need a redesign.

## 4. People and roles

| Who | Where | What they can do |
|---|---|---|
| Visitor | Website | Search, view listings and trips |
| Guest | Website | Book, cancel, message hosts, save favourites, review after a stay |
| Solo host | Website, host mode | Publish homes and vehicles, manage calendar and bookings, see the deposit |
| Organisation member | Website, host mode | Works for an agency, hotel or hostel with a team role (table below) |
| **Admin** | Admin app | Everything on the staff side: verify hosts, review listings, handle bookings and reports, record deposits, settings, exports. Two-step login is required |

There is **one admin role**. Sensitive actions that need two people (a deposit top-up above 500,000 DZD) need a second admin account. The permission tables stay in the database so roles can be split later without changing the design.

Team roles inside an organisation:

| Can do | owner | admin | manager | agent | guide |
|---|---|---|---|---|---|
| Edit organisation, manage team | yes | yes (cannot delete or transfer) | | | |
| Manage listings, trips, calendar, hotel system connection | yes | yes | yes | | |
| See bookings | yes | yes | yes | yes | own departures |
| Accept or decline requests | yes | yes | yes | | |
| Cancel as host | yes | yes | | | |
| Reply to messages | yes | yes | yes | yes | yes |
| See deposit and commission | yes | yes | | | |
| Edit bank or CCP details | yes | | | | |

## 5. Hotels: connecting their own system

When a hotel or hostel becomes a host, BLADUS connects to the system the hotel already uses, so the hotel does not type everything twice and availability stays correct.

| Way to connect | What BLADUS gets | Good for | Limit |
|---|---|---|---|
| **Channel manager** (the tool hotels use to feed booking sites) | Room types, prices, availability per night; can receive BLADUS bookings | Hotels already selling on several sites | One adapter to write per channel manager |
| **Hotel management system (PMS)** API | Same, plus services (restaurant, spa, parking) | Larger hotels with a modern system | Each system has its own API and access rules |
| **iCal calendar link** | Blocked and free dates only | Small hotels and hostels | No prices, no room details |
| **CSV file import** | Rooms, prices and services once | Hotels with no connected system | Not automatic |
| **Manual entry** | Whatever the hotel types | Always available | Hotel must keep it up to date |

How it works: the hotel owner chooses the system and enters its access key; BLADUS tests it, stores the key encrypted, imports room types, prices, availability and services, then refreshes every 15 minutes. Imported fields are read-only on BLADUS while the connection is active. A booking made on BLADUS lowers BLADUS availability immediately and is sent to the hotel system when that system accepts reservations. If a sync fails, the last good data stays and the connection is flagged for the hotel and the admin. Which hotel systems are used in Algeria must be checked with the first partner hotels; the design uses one small adapter per system, so new systems can be added without touching the rest.

## 6. Main rules

**Price.** The server calculates every price: nights x price per night (with per-day prices and weekly or monthly discounts) + cleaning fee. No BLADUS fee for the guest.

**Commission.** Rate by host type x the nights total (cleaning fee excluded). Taken from the host's deposit when the booking is confirmed. **Returned in full if the booking is cancelled**, whoever cancels. If the deposit goes more than 20,000 DZD below zero, instant bookings become requests until the host tops up.

**Dates.** Check-in day is booked, check-out day is free for the next guest. Two bookings can never overlap on the same home or vehicle; rooms, beds and seats can never be oversold.

**Booking modes.** Instant (confirmed at once) or request (host answers within 24 hours, otherwise it expires automatically).

**Cancellation by the guest** (refund owed by the host on the nights total; the cleaning fee is always returned before arrival):

| Policy | Full refund | Half refund | No refund |
|---|---|---|---|
| Flexible | 1 day or more before arrival | on arrival day | |
| Moderate | 5 days or more before | 4 to 1 days before | on arrival day |
| Strict | 14 days or more before | 13 to 7 days before | 6 days or less |

**Worked example** (villa, individual host, 12%): 3 nights x 18,500 = 55,500 DZD + cleaning 4,000 = **59,500 DZD** paid by the guest to the host.

| Event | Host deposit | BLADUS commission |
|---|---|---|
| Admin records a 50,000 DZD top-up | 50,000 | 0 |
| Booking confirmed: commission 12% x 55,500 | 43,340 (-6,660) | 6,660 |
| Guest cancels 3 days before (moderate policy): host owes the guest 27,750 + 4,000 = 31,750 | **50,000 (+6,660, full commission back)** | 0 |

**Reviews.** Only after a completed stay, within 14 days, one per booking. Ratings on listings and hosts are always calculated from reviews.

**Safety.** Phone verified before the first booking; exact address shown only after confirmation; contact details masked in messages before confirmation; every admin action written in a log that cannot be edited.

## 7. Architecture

{chr(10).join(fig(*d) for d in ARCH)}

## 8. Life cycles

{chr(10).join(fig(*d) for d in STATES)}

## 9. Flows

{chr(10).join(fig(*d) for d in FLOWS)}

## 10. Database

The database has **{n_tables} tables** in 14 groups. Conventions: every row has a time-ordered unique id; money is stored in whole centimes with a currency code; rates are stored in hundredths of a percent (1,200 = 12%); times are stored in UTC and stay dates in Algerian time; names of platform lists exist in English, French and Arabic; deleting is "soft" (a deleted date) wherever the admin must be able to restore.

### Relation diagram (overview)

![Relation diagram]({IMG}/erd-00-overview.svg)

This is the map of the central tables. Each box is a table; a line links a table to the table it points to, and the label is the linking column. Read it from `host_account` in the middle: on one side it is linked to `user` or `organization` (who hosts), on the other side it owns `listing`, `trip` and the money accounts. A `booking` points to the guest (`user`), the host account, and exactly one target: a listing, a room type, an experience slot or a trip departure. Money lines (`ledger_entry`) belong to a `ledger_transaction` and an account. The detailed diagrams below show every column.

{erd_block()}

### Rules the database enforces by itself

These rules are inside PostgreSQL, so even a bug in the code cannot break them: no overlapping stays, no overselling, exactly one owner per organisation, money lines that always balance, and logs that cannot be edited.

```sql
{cons_sql}
```

## 11. API design

**Conventions.** All addresses start with `/api/v1`. Data is JSON with `snake_case` names. Money is `{{"amount_minor": 5950000, "currency": "DZD"}}` (centimes). Dates are ISO 8601. Errors always have the same shape: a stable `code`, a message in the user's language (en, fr, ar) and field errors. Lists are paginated. Creating a booking or recording money needs an `Idempotency-Key` header, so a retry never creates a duplicate. Requests are rate limited.

**Access.** Four areas: public (no login), `me` (signed-in guest), `host` (the active workspace: the user as solo host or one of their organisations, re-checked on every call), and `admin` (staff only, two-step login). The website and admin never call Django from the browser: their Next.js server does, with the session kept in an httpOnly cookie.

**Example: create a booking**

```http
POST /api/v1/me/bookings
Idempotency-Key: 6f1c2a9e-...
{{ "quote_id": "0192f3a1-..." }}

201 Created
{{ "reference": "BLD-2026-7K2M9Q", "status": "confirmed",
  "total": {{"amount_minor": 5950000, "currency": "DZD"}},
  "payment_status": "not_collected" }}

409 Conflict (someone booked these dates first)
{{ "code": "dates_unavailable", "message": "Ces dates ne sont plus disponibles." }}
```

### Endpoint list

{api_md}

## 12. Build plan

Assumed team: 2 backend developers and 1 part-time frontend developer. The apps switch from demo data to the API one module at a time.

| Step | What is delivered | Weeks |
|---|---|---|
| M0 Foundations | Project, automatic checks, sign-up and sign-in with phone codes, wilayas and communes, settings | 3 |
| M1 Accounts and hosts | Profiles, organisations and teams, become-a-host forms, documents, admin sign-in, host verification | 5 |
| M2 Catalogue | Listings, room types, hotel system connection, trips and departures, experience and trip types, admin review | 4 |
| M3 Search | Search with filters and map, availability, prices | 3 |
| M4 Bookings and deposit | Instant and request bookings, cancellations, host deposit, commission, admin top-ups | 5 |
| M5 Messages and reviews | Conversations, notifications, reviews | 3 |
| M6 Hardening | Reports, exports, privacy requests, security and load tests | 3 |
| M7 Launch | Production hosting in Algeria, closed test with real hosts, public launch | 3 |
| Later | Online payment by card, invoices, coupons, disputes, calendar links | after launch |

Before real customers use the platform, a lawyer must confirm two points: hosting in Algeria with a `.com.dz` name, and the rules for personal data.

## Appendix: database SQL

The tables as PostgreSQL statements, generated from the schema (`schema.dbml`). Column comments are left out to keep this short; they are in the data dictionary of the full blueprint. The special rules of section 10 are added on top of these statements.

<div class="sql">

```sql
{full_sql}
```

</div>
"""

assert chr(0x2014) not in MD, "em dash"
(OUT / "BLADUS-backend-compact.md").write_text(MD, encoding="utf-8")
print(f"tables {n_tables}, operations {n_ops} (listed {n_live}), sql lines {full_sql.count(chr(10))}, md chars {len(MD)}")
