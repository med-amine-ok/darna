# Explain it like I'm new

> **In plain words**
> This page explains the whole BLADUS backend plan with no jargon, as a story.
> Read it first if words like "API", "database" or "ledger" feel unclear.
> It follows one guest, one host and one staff member through the system.
> Every other document goes deeper into one part of this story.
> Words in **bold** are explained in [glossary.md](glossary.md).

---

## 1. What we have today, and what is missing

BLADUS already has two websites:

- the **website** where travellers search and book, and where hosts manage their places (the `frontend` folder);
- the **admin** where BLADUS staff check hosts, listings, bookings and money (the `admin` folder).

Both look finished, but behind the screens there is no real storage. Every booking, every host, every message lives in the computer's memory and disappears when the server restarts. The two websites also do not talk to each other: a booking made on the website never appears in the admin.

The missing piece is the **backend**: one program, running on a server, that keeps all the data safely in a **database** and is the single source of truth for both websites. We will build it with **Django** (a Python framework the owner already knows).

## 2. The main idea in one picture

```
Traveller / Host browser ──> Website (Next.js) ──┐
                                                 ├──> Django API ──> PostgreSQL database
Staff browser ───────────> Admin (Next.js)  ─────┘          │
                                                           └──> SMS, email, file storage
```

- The websites stay as they are. Only the inside of their "data" functions changes: instead of reading memory, they ask the API.
- The **API** is a list of addresses like `POST /api/v1/bookings` ("create a booking"). The full list is in [06-api-design.md](06-api-design.md) and [openapi.yaml](openapi.yaml).
- The **database** is PostgreSQL. It has 77 tables (like 77 spreadsheet tabs) described in [05-database-schema.md](05-database-schema.md).

## 3. A guest books a villa

Yacine wants 3 nights in a villa in Tipaza.

1. **Search.** The website asks the API for villas in Tipaza for his dates. The API looks in the database and only returns villas whose nights are free.
2. **Price.** He opens the villa. The API calculates the price itself (3 nights x 18,500 DZD + 4,000 cleaning = 59,500 DZD). Guests pay **no BLADUS fee**.
3. **Book.** He clicks Reserve. The API saves the booking. The database has a built-in rule that refuses two bookings on the same night for the same villa, so even if two people click at the same second, only one wins.
4. **Pay.** At launch Yacine pays the host directly (cash or transfer). BLADUS does not touch the guest's money. (This is decision **DEC-001**; the reason is Algerian payment law, see [02-research.md](02-research.md) section C.1.)
5. **Messages.** He and the host chat in the app. Phone numbers are hidden until the booking is confirmed, to stop scams.

## 4. How BLADUS earns money

BLADUS takes a **commission** from the host, not from the guest:

| Host type | Commission |
|---|---|
| Individual | 12% |
| Agency | 15% |
| Hotel | 18% |
| Hostel | 10% |

Each host keeps a **deposit** with BLADUS (like a prepaid phone card). When a booking is confirmed, the commission is taken from that deposit. For Yacine's villa: 12% of 55,500 = 6,660 DZD.

Every money movement is written in a **ledger**: a notebook where lines are only added, never erased. If there is a mistake, a correcting line is added. This makes it easy to prove where every dinar went.

## 5. A host joins

Amina wants to rent her home.

1. She signs up and verifies her phone with a code by SMS.
2. She fills the "become a host" steps. Her answers are saved on the server, so she can continue on another device.
3. She uploads her ID and proof of ownership. These files go to private storage that only staff can open, and every opening is recorded.
4. A moderator checks the documents and approves her.
5. She creates a listing. It is checked by staff before it appears in search (**DEC-003**).

What each host type can publish is fixed (**DEC-014**): individuals publish homes and vehicles, agencies publish experiences and trips, hotels and hostels publish their property with its rooms.

## 6. Staff work in the admin

Nadia, a moderator, opens the admin. She sees queues: hosts to verify, listings to review, reported reviews. Each item shows how long it has been waiting. When she approves or refuses, the reason is saved and the host is notified. Every action she takes is written in an **audit log** that nobody can edit.

Finance staff record host deposits (for example a transfer to BLADUS's CCP account). Above 500,000 DZD a second person must approve, to prevent mistakes and fraud.

## 7. Things that happen by themselves

Some work runs in the background on a schedule (**jobs**):

- a request that the host does not answer within 24 hours expires and both sides are told;
- after check-out, the booking becomes "completed" and the review window opens;
- SMS and emails are sent after a change is saved, and retried if they fail.

## 8. Why Algeria matters in the design

- **Hosting**: Algerian law likely requires an e-commerce site hosted in Algeria with a `.com.dz` name, and personal data should not leave the country without permission. So the plan puts the servers in Algeria (VERIFY WITH A PROFESSIONAL).
- **Payments**: collecting guests' money and paying hosts may need a payment licence, which is why we start with the deposit model.
- **Geography**: 69 wilayas and 1,541 communes, in Arabic, French and English.
- **Formats**: weekend is Friday and Saturday, Latin digits even in Arabic, phone numbers start with +213 5, 6 or 7.

## 9. Where to read next

| If you want to know... | Read |
|---|---|
| What exists today and what is broken | [01-system-inventory.md](01-system-inventory.md) |
| What other platforms do and which tools we chose | [02-research.md](02-research.md) |
| The full list of what the backend must do | [03-requirements.md](03-requirements.md) |
| The exact rules (prices, refunds, statuses) | [04-business-rules.md](04-business-rules.md) |
| The database | [05-database-schema.md](05-database-schema.md) |
| The API | [06-api-design.md](06-api-design.md) |
| How it is built, secured, hosted and tested | [07](07-architecture.md), [08](08-security-privacy.md), [09](09-devops-hosting.md), [10](10-testing-quality.md) |
| The plan, risks and open decisions | [11](11-roadmap.md), [12](12-risks.md), [13](13-decisions-needed.md), [14](14-open-questions.md) |

---

## Check yourself

- [ ] Why does a booking made today on the website not appear in the admin?
- [ ] Who pays BLADUS, the guest or the host? How much for an agency?
- [ ] What stops two people from booking the same night?
- [ ] Why does BLADUS not collect guests' money at launch?
- [ ] What is a ledger, and why are its lines never erased?
- [ ] Name two things that happen by themselves without anyone clicking.
