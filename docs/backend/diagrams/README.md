# Diagrams

> **In plain words**
> Pictures of the planned system: who uses it, what runs where, how statuses change, how a booking flows step by step, and how the tables link.
> Each picture has a short caption and a legend explaining its symbols.
> The `.mmd` files are the editable sources (Mermaid text). The `rendered/` folder holds SVG (sharp at any zoom) and PNG versions.
> The table diagrams (`erd-*`) are generated from [../schema.dbml](../schema.dbml), so they always match the schema.

How to re-render: `python ../_tools/build_schema_docs.py` (ERD sources), then `python ../_tools/render_diagrams.py` (needs `@mermaid-js/mermaid-cli` installed in a tools folder outside the repo and a local Chrome; see the script header).

## Legends

| Diagram type | How to read it |
|---|---|
| **Flowchart** (01, 02, 03, 30, 40) | Boxes are systems or parts; rounded boxes are people; cylinders are data stores. A solid arrow is a call or a flow; a dotted arrow is optional, later (R2) or asynchronous. Grey frames group things that run together. |
| **State diagram** (10 to 13) | Each box is a status. An arrow is an allowed move, labelled with who or what causes it. The black dot is the start; the circled dot is the end. A move not drawn is forbidden. |
| **Sequence diagram** (20 to 24) | Columns are actors (people) and participants (systems). Time goes down. Solid arrows are requests, dashed arrows are replies, open arrows are messages sent later by a worker. Numbered steps match the text. `alt` boxes show alternative paths. |
| **ERD** (erd-*) | Each box is a table with its columns (type, name, and PK = primary key, FK = link, UK = unique). A line links a table to the one it points to; the label is the linking column. `||` = exactly one, `o{` = zero or many, `o|` = zero or one. Boxes with only `id` are tables from another group, shown for context. |

## Architecture

| File | Caption |
|---|---|
| [01-system-context](rendered/01-system-context.svg) | Who uses BLADUS and which outside services it talks to. Guests and hosts use the website, staff use the admin app; both call one Django API. The payment gateway is dotted because online payment comes in release R2. |
| [02-containers](rendered/02-containers.svg) | What runs where. Everything holding personal data runs in Algerian data centres (research C.3, to be confirmed by a lawyer). The Next.js servers keep the login cookie and call Django on the browser's behalf (BFF). Workers send messages and run timed jobs. |
| [03-django-apps](rendered/03-django-apps.svg) | The backend is one application split into apps with one direction of calls. Example: bookings may call pricing and the ledger, never the reverse. Dotted arrows are events sent through the outbox. |
| [30-money-flow](rendered/30-money-flow.svg) | Where money goes. At launch (M1) the guest pays the host, the host keeps a deposit at BLADUS, and BLADUS takes its commission from that deposit. M4 (BLADUS collects and pays out) is drawn for later and needs a licence. |
| [40-document-map](rendered/40-document-map.svg) | How the blueprint documents feed each other, from inventory to tests. |

## Lifecycles (state machines)

| File | Caption |
|---|---|
| [10-booking-states](rendered/10-booking-states.svg) | Every status a booking can have. A request waits up to 24 hours for the host; a confirmed booking becomes completed automatically after check-out. `awaiting_payment` stays unused until online payment exists. Rules BR-BKG-01 to 07. |
| [11-listing-states](rendered/11-listing-states.svg) | A listing or trip is checked by staff before it is published (DEC-003). Hosts can pause; staff can suspend or ask for changes. Deleting is reversible by staff. |
| [12-host-verification-states](rendered/12-host-verification-states.svg) | A host (person or organisation) is approved only when all required documents are approved. Changing legal details sends it back to review. |
| [13-review-states](rendered/13-review-states.svg) | A review is written after a completed stay, published when both sides wrote or after 14 days, and can be hidden after a report. |

## Key flows (sequences)

| File | Caption |
|---|---|
| [20-seq-instant-booking](rendered/20-seq-instant-booking.svg) | An instant booking from price quote to confirmation in one database transaction; the database itself refuses overlapping dates; the commission is posted to the host's wallet; messages go out after the save. |
| [21-seq-request-to-book](rendered/21-seq-request-to-book.svg) | A request: the host accepts, declines, or a timed job expires it after 24 hours. Dates stay blocked while it waits. |
| [22-seq-wallet-topup](rendered/22-seq-wallet-topup.svg) | A host tops up the commission deposit by transfer; finance records it with the receipt reference; large amounts need a second person. |
| [23-seq-host-onboarding](rendered/23-seq-host-onboarding.svg) | Becoming a host: the steps come from the published configuration, the draft is saved on the server, documents go to private storage, staff verify. |
| [24-seq-message-sync](rendered/24-seq-message-sync.svg) | Messages are fetched with a cursor so polling is cheap; phone numbers are masked until a booking is confirmed (anti-fraud). |

## Database (ERDs, generated)

| File | Caption |
|---|---|
| [erd-00-overview](rendered/erd-00-overview.svg) | The 26 central tables and their main links. Start here. `host_account` sits between people and organisations on one side and listings, trips and wallets on the other. |
| [erd-01-accounts](rendered/erd-01-accounts.svg) | People, staff roles and permissions, consents, favourites. |
| [erd-02-geography](rendered/erd-02-geography.svg) | 69 wilayas, dairas and 1,541 communes. |
| [erd-03-host-accounts-and-organisations](rendered/erd-03-host-accounts-and-organisations.svg) | Host accounts, organisations, team members, invitations, verification documents, payout accounts. |
| [erd-04-taxonomy](rendered/erd-04-taxonomy.svg) | Shared lists: categories, property types, amenities, cancellation policies. |
| [erd-05-catalogue-listings-and-room-types](rendered/erd-05-catalogue-listings-and-room-types.svg) | Listings, edits under review, vehicle and experience details, room types, photos, featured places. |
| [erd-06-inventory-and-calendar](rendered/erd-06-inventory-and-calendar.svg) | What is free per day (homes, vehicles), per night and room type (hotels, hostels) and per time slot (experiences). |
| [erd-07-trips-agency-only](rendered/erd-07-trips-agency-only.svg) | Agency trips, day-by-day itinerary, dated departures with seats. |
| [erd-08-pricing](rendered/erd-08-pricing.svg) | Price quotes and tax rates. |
| [erd-09-bookings](rendered/erd-09-bookings.svg) | Bookings, their status history, refunds owed, disputes. |
| [erd-10-money-ledger-wallet-dormant-payments](rendered/erd-10-money-ledger-wallet-dormant-payments.svg) | The ledger, balances, deposit top-ups, gateway webhooks, and the tables kept unused until the money model changes. |
| [erd-11-reviews](rendered/erd-11-reviews.svg) | Reviews, replies, reports. |
| [erd-12-messaging-and-notifications](rendered/erd-12-messaging-and-notifications.svg) | Conversations, messages, notifications, preferences, the outbox and delivery log. |
| [erd-13-media](rendered/erd-13-media.svg) | Uploaded files (public photos, private documents). |
| [erd-14-moderation-config-audit-privacy-system](rendered/erd-14-moderation-config-audit-privacy-system.svg) | Staff queues and decisions, settings and onboarding versions, coupons, audit log, exports, privacy requests, idempotency, search table. |

## Check yourself

- [ ] In the booking state diagram, which statuses are final?
- [ ] In the instant booking sequence, at which step could a double booking be refused, and by what?
- [ ] In an ERD, what does a box with only `id` mean?
- [ ] Which diagram shows that personal data stays in Algeria?
