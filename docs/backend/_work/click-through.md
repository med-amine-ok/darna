# Click-through observations (website, dev server, 2026-11-04)

Signed in with the documented demo accounts (password from `frontend/lib/data/auth.ts` DEMO_PASSWORD).

| # | Flow | What happened | Backend implication |
|---|---|---|---|
| O1 | Guest login (yacine.traveler@bladus.dz) | Works, redirects home. | Email + password login exists; no OTP, no email verification step observed. |
| O2 | Instant book, Tipaza villa, Dec 10 to 13 | Confirmed immediately. Card: 18,500 DZD/night x 3 = 55,500 + cleaning 4,000 = 59,500 DZD, "No BLADUS fees". | No payment step exists at all: a booking becomes "confirmed" with no money moving. Real flow needs payment intent before confirmation. |
| O3 | Same link carried `guestCount=2` | Booking card showed "1 guest". | URL param name mismatch (`guestCount` vs `guests`); API must define one name. |
| O4 | Overlap: Dec 12 to 14 on same villa | Blocked: "Some of the selected dates are no longer available". Reserve disabled. | Overlap check exists in app code; must move to a database-level guarantee. |
| O5 | Back-to-back: Dec 13 to 15 | Allowed. | Confirms half-open date ranges [check-in, check-out). |
| O6 | Request to book, Constantine residence, Dec 20 to 23 | "Request sent, host usually replies within 24 hours, you are not charged until then", status Awaiting approval, total 36,000 DZD. | Request mode with pending status; expiry job needed (24 h). |
| O7 | Trips page | Lists both new bookings. Every card says "Payment: CIB / Edahabia Card, Total paid", including the pending request where nothing was paid. | Payment method and paid status are not modelled; UI fakes them. Need payments table and booking payment status. |
| O8 | Messages | Threads per listing with read receipts and unread count. | Conversations, messages, read state needed. |
| O9 | Become a host | 4 host types: Individual, Agency/Fleet, Hotel & Resort, Hostel & Community; each starts a guided flow with draft saving and live preview. | Onboarding drafts must be persisted per user; flow content per host type. |
| O10 | Host mode as Karim (agency owner, also owns 2 hotels) | Today page shows "Agency command centre", rating 4.96 across 159 reviews but "No guest reviews yet", prepaid wallet 145,000 DZD, "Prepaid commission deposit ledger (platform take rate 15%)", "Deducted per confirmed booking (agency rate)". | Wallet model = PREPAID COMMISSION DEPOSIT: host tops up, BLADUS deducts commission per confirmed booking. Different from Airbnb's payout model; must be a ledger. Rating aggregates inconsistent with review rows. A user can own several organizations: active-organization context needed. |
| O11 | Gross host earnings show 0 DZD while there is an active confirmed booking | Earnings only count completed stays? | Define earnings recognition rule (at check-in, check-out, or confirmation). |
