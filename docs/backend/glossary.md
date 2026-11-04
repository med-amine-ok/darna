# Glossary

> **In plain words**
> Every technical or business word used in the blueprint, explained in one or two sentences.
> If a document uses a word you do not know, look here first. The list grows with each phase.

| Term | Meaning |
|---|---|
| ADR | Architecture Decision Record: a short note saying what was decided, why, and what else was considered. |
| ANPDP | Algeria's personal data protection authority (Autorité nationale de protection des données à caractère personnel). |
| API | The set of web addresses (endpoints) the apps call to read and change data. |
| `ActionResult` | What a Next.js server action returns today: success with data, or an error code. |
| Allauth (headless) | A Django library for sign-up, login, phone codes and two-factor login, used through an API. |
| Audit log | A list of who did what and when; never edited, only added to. |
| BFF | Backend for frontend: the Next.js server keeps the login cookie and calls Django on the browser's behalf. |
| Booking / Reservation | One guest's purchase of a unit for a time. The admin calls it Booking, the website Reservation. |
| Celery | A Python tool that runs background jobs (expire requests, send SMS) outside the web request. |
| Centimes | Hundredths of a dinar. We store money as whole centimes to avoid rounding errors. |
| CIB / Edahabia | Algeria's bank card and postal card, accepted online through SATIM. |
| Commission | The percentage BLADUS earns on a booking, paid by the host. Guests pay no BLADUS fee. |
| Double-entry ledger | Money records where each movement has lines that add up to zero, so money is never created or lost by mistake. |
| DRF | Django REST Framework, the library that turns Django into an API. |
| Exclusion constraint | A PostgreSQL rule that refuses overlapping date ranges for the same unit. |
| Half-open range | A date range that includes the first day and excludes the last: `[check-in, check-out)`. Check-out day is free for the next guest. |
| Hold | A short reservation of inventory while a guest pays; it expires automatically. |
| Host type | individual, agency, hotel or hostel. |
| Idempotency key | A unique request ID; repeating the request with the same key does not repeat its effect. |
| KYC | Know your customer: checking identity and business documents. |
| `lib/data` seam | The folder of data functions both apps call; each becomes an API call. |
| Mock store | Data kept in server memory for demos; lost on restart. |
| Modular monolith | One application split internally into separate parts with clear rules about who talks to whom. |
| OpenAPI | A standard file (`openapi.yaml`) describing every endpoint, from which typed client code is generated. |
| Organisation | An agency, hotel or hostel business with team members. |
| PostGIS | The map and geography extension for PostgreSQL. |
| PSP | Payment service provider: a licensed company that holds and moves other people's money. |
| RBAC | Role-based access control: rights come from a role (owner, manager, moderator...). |
| Room type | A kind of room or bed in a hotel or hostel, with a count of identical units. |
| SATIM | The interbank company that runs card payments in Algeria. |
| Server action | A Next.js function that runs on the server when a form is submitted. |
| Snapshot | A copy of a value (price, rate, policy) saved on a booking so later changes do not affect it. |
| Soft delete | Marking a row as deleted instead of removing it, so it can be restored. |
| State machine | The allowed list of statuses and the allowed moves between them. |
| Taxe de séjour | Tourist tax per person per night, depending on the hotel's star rating. |
| Vertical | A product family: homes, hotels, experiences, vehicles, trips. |
| Wilaya / commune | Algerian province / municipality. Today 69 wilayas and 1,541 communes. |
