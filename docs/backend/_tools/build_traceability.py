"""Build traceability.csv and traceability.md from requirements.csv plus the mapping below.

Documentation tooling only (no backend code). Run from docs/backend:
    python _tools/build_traceability.py

For each requirement ID in requirements.csv the mapping gives:
    milestone  roadmap milestone from 11-roadmap.md (M0..M7, R2-A, R2-B, LATER)
    tables     schema tables from schema.dbml (short names, without the Django app prefix)
    api        API area, plain REST names under /api/v1 (06-api-design.md and openapi.yaml
               carry the final paths with x-requirements tags); "job:" means a scheduled task,
               "internal:" means a service with no public endpoint
    tests      test file area in the future Django repo
    lib_data   which website (web:) or admin (admin:) lib/data module switches from mock to API
The business rules column is copied from requirements.csv.
Edit the mapping here, not the generated files.
"""
import collections
import csv
import pathlib
import re

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parent

MILESTONES = ["M0", "M1", "M2", "M3", "M4", "M5", "M6", "M7", "R2-A", "R2-B", "LATER"]
MILESTONE_NAMES = {
    "M0": "Foundations",
    "M1": "Accounts, staff and host verification",
    "M2": "Catalogue, trips and moderation",
    "M3": "Search, availability and quotes",
    "M4": "Bookings, cancellations and the commission wallet",
    "M5": "Messaging and reviews",
    "M6": "Reports, privacy and hardening",
    "M7": "Production in Algeria, closed beta, launch",
    "R2-A": "Release 2, online money (gateway, invoices, taxes)",
    "R2-B": "Release 2, trust and growth",
    "LATER": "Later, behind a legal or business gate",
}
RELEASE_OF = {m: "MVP" for m in MILESTONES[:8]}
RELEASE_OF.update({"R2-A": "R2", "R2-B": "R2", "LATER": "Later"})

# id: (milestone, tables, api, tests, lib_data)
T = {
    # ACC
    "ACC-01": ("M0", "user; consent_record; allauth email tables", "POST /api/v1/auth/signup; POST /api/v1/auth/verify", "tests/accounts/test_signup.py", "web:auth.ts"),
    "ACC-02": ("M0", "user; allauth tables (one-time codes in Redis)", "POST /api/v1/auth/login; POST /api/v1/auth/otp/request; POST /api/v1/auth/otp/verify", "tests/accounts/test_login_otp.py", "web:auth.ts"),
    "ACC-03": ("M0", "allauth session tables", "GET /api/v1/auth/session; POST /api/v1/auth/logout", "tests/accounts/test_sessions.py", "web:auth.ts"),
    "ACC-04": ("M0", "user; allauth tables", "POST /api/v1/auth/password/reset; POST /api/v1/auth/password/change", "tests/accounts/test_password.py", "web:auth.ts"),
    "ACC-05": ("M1", "allauth MFA authenticator tables; staff_profile", "POST /api/v1/auth/mfa/totp; POST /api/v1/auth/mfa/passkey", "tests/accounts/test_mfa.py", "admin:credentials.ts"),
    "ACC-06": ("M1", "user", "GET /api/v1/me; PATCH /api/v1/me", "tests/accounts/test_profile.py", "web:auth.ts"),
    "ACC-07": ("M0", "none (Redis counters)", "POST /api/v1/auth/login (throttle)", "tests/accounts/test_login_lockout.py", "web:auth.ts"),
    "ACC-08": ("M1", "user; host_account; membership", "GET /api/v1/me/host-accounts", "tests/hosts/test_one_user_many_roles.py", "web:organizations.ts"),
    "ACC-09": ("M2", "favorite", "GET /api/v1/me/favorites; PUT /api/v1/me/favorites/{id}; DELETE /api/v1/me/favorites/{id}", "tests/accounts/test_favorites.py", "web:favorites.ts"),
    # ORG
    "ORG-01": ("M1", "organization; host_account; membership", "POST /api/v1/organizations", "tests/hosts/test_org_create.py", "web:organizations.ts"),
    "ORG-02": ("M1", "membership; host_account", "GET /api/v1/me/host-accounts; PUT /api/v1/me/active-host-account", "tests/hosts/test_active_host_account.py", "web:organizations.ts"),
    "ORG-03": ("M1", "invitation; membership; outbox_event", "POST /api/v1/host/organization/invitations; POST /api/v1/invitations/{token}/accept", "tests/hosts/test_invitations.py", "web:organizations.ts"),
    "ORG-04": ("M1", "membership; audit_event", "PATCH /api/v1/host/organization/members/{id}; DELETE /api/v1/host/organization/members/{id}; POST /api/v1/host/organization/transfer-ownership", "tests/hosts/test_members.py", "web:organizations.ts"),
    "ORG-05": ("M1", "membership", "permission layer on every /api/v1/host/* call", "tests/hosts/test_org_permissions.py", "web:organizations.ts"),
    "ORG-06": ("M1", "organization; moderation_case", "PATCH /api/v1/host/organization", "tests/hosts/test_org_reverification.py", "web:organizations.ts"),
    "ORG-07": ("M1", "organization; host_account; listing; trip", "GET /api/v1/organizations/{slug}", "tests/hosts/test_org_public_profile.py", "web:organizations.ts"),
    # HST
    "HST-01": ("M1", "onboarding_flow_version; onboarding_draft", "GET /api/v1/onboarding/flows/{host_type}", "tests/hosts/test_onboarding_flow.py", "web:auth.ts (updateUserHostStatus)"),
    "HST-02": ("M1", "onboarding_draft", "GET /api/v1/host/onboarding/draft; PUT /api/v1/host/onboarding/draft; POST /api/v1/host/onboarding/submit", "tests/hosts/test_onboarding_draft.py", "web:auth.ts (updateUserHostStatus)"),
    "HST-03": ("M1", "host_document; media_asset", "POST /api/v1/host/documents; GET /api/v1/host/documents", "tests/hosts/test_documents_upload.py", "web:organizations.ts"),
    "HST-04": ("M1", "host_account; moderation_case; moderation_decision", "POST /api/v1/admin/hosts/{id}/approve|reject|request-changes|suspend|ban", "tests/hosts/test_verification_states.py", "admin:hosts.ts"),
    "HST-05": ("M4", "payout_account; audit_event", "GET /api/v1/host/payout-account; PUT /api/v1/host/payout-account", "tests/hosts/test_payout_account.py", "web:wallet.ts"),
    "HST-06": ("M1", "host_account; listing; platform_settings", "PATCH /api/v1/host/settings", "tests/hosts/test_approval_mode_default.py", "web:organizations.ts"),
    "HST-08": ("M2", "property_integration; integration_sync_log; property_service; room_type; room_type_night", "host integration endpoints", "tests/hosts/test_property_integration.py", "web:organizations.ts"),
    "HST-07": ("M2", "host_account; organization; listing; trip", "POST /api/v1/host/listings; POST /api/v1/host/trips (offer rule check)", "tests/catalog/test_host_offer_rule.py", "web:listings.ts"),
    # LST
    "LST-01": ("M2", "listing; vehicle_detail; experience_detail; listing_revision", "POST /api/v1/host/listings; PATCH /api/v1/host/listings/{id}; POST /api/v1/host/listings/{id}/submit", "tests/catalog/test_listing_create.py", "web:listings.ts"),
    "LST-02": ("M2", "listing; listing_revision; moderation_case", "POST /api/v1/admin/listings/{id}/approve|reject|request-changes", "tests/catalog/test_listing_review.py", "admin:listings.ts"),
    "LST-03": ("M2", "listing", "POST /api/v1/host/listings/{id}/pause|resume; POST /api/v1/admin/listings/{id}/status", "tests/catalog/test_listing_states.py", "admin:listings.ts"),
    "LST-04": ("M2", "room_type; room_type_amenity", "GET /api/v1/host/listings/{id}/room-types; POST /api/v1/host/listings/{id}/room-types; PATCH /api/v1/host/room-types/{id}", "tests/catalog/test_room_types.py", "web:listings.ts"),
    "LST-05": ("M2", "amenity; category; property_type; listing_amenity", "GET /api/v1/catalog/amenities; GET /api/v1/catalog/categories; GET /api/v1/catalog/property-types", "tests/catalog/test_reference_lists.py", "admin:categories.ts"),
    "LST-06": ("M2", "listing; commune; wilaya", "PATCH /api/v1/host/listings/{id} (location); GET /api/v1/geo/communes", "tests/catalog/test_listing_location.py", "web:listings.ts"),
    "LST-07": ("M2", "listing; cancellation_policy", "GET /api/v1/catalog/cancellation-policies; PATCH /api/v1/host/listings/{id}", "tests/catalog/test_stay_rules.py", "web:listings.ts"),
    "LST-08": ("M2", "listing", "DELETE /api/v1/host/listings/{id}; POST /api/v1/admin/listings/{id}/restore", "tests/catalog/test_listing_soft_delete.py", "web:listings.ts"),
    "LST-09": ("R2-B", "featured_placement", "GET /api/v1/admin/featured-placements; POST /api/v1/admin/featured-placements", "tests/catalog/test_featured.py", "admin:listings.ts"),
    "LST-10": ("M2", "vehicle_detail", "PATCH /api/v1/host/listings/{id} (vehicle block)", "tests/catalog/test_vehicle_fields.py", "web:vehicles.ts"),
    "LST-11": ("M2", "experience_detail; experience_slot", "GET /api/v1/host/listings/{id}/slots; POST /api/v1/host/listings/{id}/slots", "tests/catalog/test_experience_fields.py", "web:experiences.ts"),
    "LST-12": ("M2", "listing (experience_type enum)", "GET /api/v1/catalog/experience-types", "tests/catalog/test_experience_types.py", "web:experiences.ts"),
    # TRP
    "TRP-01": ("M2", "trip; host_account; organization", "POST /api/v1/host/trips", "tests/trips/test_agency_only.py", "web:trips.ts"),
    "TRP-02": ("M2", "trip; trip_itinerary_day", "PATCH /api/v1/host/trips/{id}", "tests/trips/test_itinerary.py", "web:trips.ts"),
    "TRP-03": ("M2", "trip_departure", "GET /api/v1/host/trips/{id}/departures; POST /api/v1/host/trips/{id}/departures", "tests/trips/test_departures.py", "web:trips.ts"),
    "TRP-04": ("M2", "trip; moderation_case", "POST /api/v1/admin/trips/{id}/approve|reject|request-changes", "tests/trips/test_trip_review.py", "admin:listings.ts"),
    "TRP-05": ("M3", "trip_departure; listing_search_doc", "GET /api/v1/trips?from=&to=", "tests/search/test_trip_dates.py", "web:trips.ts"),
    "TRP-06": ("R2-B", "trip_departure; booking; refund; ledger_transaction", "POST /api/v1/host/trips/{id}/departures/{departure_id}/cancel", "tests/trips/test_departure_cancel.py", "web:trips.ts"),
    "TRP-07": ("M2", "trip (trip_type enum)", "GET /api/v1/catalog/trip-types", "tests/trips/test_trip_types.py", "web:trips.ts"),
    # AVL
    "AVL-01": ("M4", "booking (exclusion constraint on unit and stay range)", "POST /api/v1/bookings (refuses overlap)", "tests/bookings/test_no_double_booking.py", "web:reservations.ts"),
    "AVL-02": ("M4", "room_type_night; experience_slot; trip_departure", "POST /api/v1/bookings; GET /api/v1/listings/{id}/availability", "tests/inventory/test_pooled_inventory.py", "web:reservations.ts"),
    "AVL-03": ("M2", "listing_day; room_type_night", "PUT /api/v1/host/listings/{id}/calendar; PUT /api/v1/host/room-types/{id}/calendar", "tests/inventory/test_host_calendar.py", "web:calendar.ts"),
    "AVL-04": ("M3", "listing_day; room_type_night; listing_search_doc", "GET /api/v1/listings?check_in=&check_out=; GET /api/v1/listings/{id}/availability", "tests/inventory/test_partial_availability.py", "web:listings.ts"),
    "AVL-05": ("M4", "room_type_night; experience_slot; trip_departure; quote", "POST /api/v1/bookings (hold step); job: inventory.release_holds", "tests/inventory/test_holds.py", "web:reservations.ts"),
    "AVL-06": ("LATER", "new table needed (ical_feed, not in schema.dbml yet)", "GET /api/v1/host/listings/{id}/ical; POST /api/v1/host/listings/{id}/ical-imports", "tests/inventory/test_ical_sync.py", "web:calendar.ts"),
    # PRC
    "PRC-01": ("M3", "quote; listing_day; room_type_night; tax_rate", "POST /api/v1/quotes; GET /api/v1/quotes/{id}", "tests/pricing/test_quote.py", "web:reservations.ts"),
    "PRC-02": ("M3", "quote", "POST /api/v1/quotes", "tests/pricing/test_no_guest_fee.py", "web:reservations.ts"),
    "PRC-03": ("M3", "listing; quote", "POST /api/v1/quotes", "tests/pricing/test_length_of_stay_discount.py", "web:reservations.ts"),
    "PRC-04": ("R2-A", "tax_rate; quote; platform_settings", "POST /api/v1/quotes; GET /api/v1/admin/tax-rates; PUT /api/v1/admin/tax-rates/{id}", "tests/pricing/test_tax_lines.py", "admin:settings.ts"),
    "PRC-05": ("M3", "quote; booking", "POST /api/v1/quotes", "tests/pricing/test_rounding.py", "web:reservations.ts"),
    # BKG
    "BKG-01": ("M4", "booking; booking_event; ledger_transaction; account_balance", "POST /api/v1/bookings", "tests/bookings/test_booking_create_instant.py", "web:reservations.ts"),
    "BKG-02": ("M4", "booking; booking_event", "POST /api/v1/bookings; POST /api/v1/host/bookings/{id}/accept; POST /api/v1/host/bookings/{id}/decline", "tests/bookings/test_request_to_book.py", "web:reservations.ts"),
    "BKG-03": ("M4", "booking; booking_event; outbox_event", "job: bookings.expire_requests", "tests/bookings/test_request_expiry.py", "web:reservations.ts"),
    "BKG-04": ("M4", "booking; booking_event", "job: bookings.complete_stays", "tests/bookings/test_auto_complete.py", "web:reservations.ts"),
    "BKG-05": ("M4", "booking; booking_event", "GET /api/v1/bookings/{id}", "tests/bookings/test_booking_states.py", "admin:bookings.ts"),
    "BKG-06": ("M4", "booking; quote", "POST /api/v1/bookings", "tests/bookings/test_booking_snapshot.py", "web:reservations.ts"),
    "BKG-07": ("M4", "booking", "GET /api/v1/me/bookings; GET /api/v1/host/bookings", "tests/bookings/test_booking_lists.py", "web:reservations.ts"),
    "BKG-08": ("M4", "booking", "GET /api/v1/bookings/{reference}", "tests/bookings/test_booking_reference.py", "admin:bookings.ts"),
    "BKG-09": ("M4", "booking; trip_departure", "POST /api/v1/bookings (target trip_departure)", "tests/bookings/test_trip_booking.py", "web:reservations.ts"),
    "BKG-10": ("M4", "idempotency_record", "POST /api/v1/bookings (Idempotency-Key header)", "tests/bookings/test_booking_idempotency.py", "web:reservations.ts"),
    "BKG-11": ("R2-B", "dispute; media_asset; moderation_case", "POST /api/v1/bookings/{id}/disputes; POST /api/v1/admin/disputes/{id}/resolve", "tests/bookings/test_disputes.py", "admin:bookings.ts"),
    # CAN
    "CAN-01": ("M4", "booking; refund; booking_event; cancellation_policy", "POST /api/v1/bookings/{id}/cancel", "tests/bookings/test_guest_cancel.py", "web:reservations.ts"),
    "CAN-02": ("M4", "booking; refund; ledger_transaction", "POST /api/v1/host/bookings/{id}/cancel", "tests/bookings/test_host_cancel.py", "web:reservations.ts"),
    "CAN-03": ("M4", "refund; booking; audit_event", "POST /api/v1/admin/bookings/{id}/cancel; POST /api/v1/admin/bookings/{id}/refunds", "tests/bookings/test_staff_refund.py", "admin:bookings.ts"),
    "CAN-04": ("M4", "ledger_transaction; ledger_entry", "internal: ledger.reverse_commission", "tests/ledger/test_commission_reversal.py", "web:wallet.ts"),
    # PAY
    "PAY-01": ("M4", "ledger_account; ledger_transaction; ledger_entry", "GET /api/v1/admin/finance/ledger", "tests/ledger/test_double_entry.py", "admin:ledger.ts"),
    "PAY-02": ("M4", "ledger_account; account_balance", "GET /api/v1/host/wallet", "tests/ledger/test_wallet_balance.py", "web:wallet.ts"),
    "PAY-03": ("M4", "ledger_transaction; ledger_entry; booking", "internal: ledger.post_commission (on confirm)", "tests/ledger/test_commission_on_confirm.py", "web:wallet.ts"),
    "PAY-04": ("M4", "host_account; platform_settings; booking", "PATCH /api/v1/admin/hosts/{id}/commission", "tests/ledger/test_rate_resolution.py", "admin:hosts.ts"),
    "PAY-05": ("M4", "wallet_topup; ledger_transaction", "POST /api/v1/admin/finance/topups; POST /api/v1/admin/finance/topups/{id}/approve", "tests/ledger/test_manual_topup.py", "admin:finance.ts"),
    "PAY-06": ("R2-A", "wallet_topup; gateway_event; payment", "POST /api/v1/host/wallet/topups", "tests/ledger/test_online_topup.py", "web:wallet.ts"),
    "PAY-07": ("M4", "account_balance; platform_settings; notification", "GET /api/v1/host/wallet; GET /api/v1/admin/finance/wallets?negative=true", "tests/ledger/test_negative_balance.py", "admin:finance.ts"),
    "PAY-08": ("M4", "ledger_entry; account_balance", "GET /api/v1/host/wallet/entries", "tests/ledger/test_wallet_history.py", "web:wallet.ts"),
    "PAY-09": ("R2-A", "gateway_event", "POST /api/v1/webhooks/chargily", "tests/ledger/test_gateway_webhooks.py", "none (server to server)"),
    "PAY-10": ("LATER", "payment; payout; payout_account; ledger_account", "GET /api/v1/admin/finance/payouts; POST /api/v1/admin/finance/payouts/{id}/approve (disabled by setting)", "tests/ledger/test_payout_models.py", "admin:finance.ts"),
    "PAY-11": ("R2-A", "invoice", "GET /api/v1/host/invoices; GET /api/v1/admin/finance/invoices", "tests/ledger/test_commission_invoices.py", "admin:finance.ts"),
    "PAY-12": ("M0", "all *_minor columns with currency", "every money field in /api/v1/*", "tests/core/test_money.py", "none (shared convention)"),
    # REV
    "REV-01": ("M5", "review; booking", "POST /api/v1/bookings/{id}/review", "tests/reviews/test_write_review.py", "web:reviews.ts"),
    "REV-02": ("R2-B", "review", "POST /api/v1/host/bookings/{id}/guest-review", "tests/reviews/test_double_blind.py", "web:reviews.ts"),
    "REV-03": ("M5", "review_reply", "POST /api/v1/host/reviews/{id}/reply; PATCH /api/v1/host/reviews/{id}/reply", "tests/reviews/test_host_reply.py", "web:reviews.ts"),
    "REV-04": ("M5", "review; review_report; moderation_case", "POST /api/v1/reviews/{id}/reports; POST /api/v1/admin/reviews/{id}/hide|restore|remove", "tests/reviews/test_review_moderation.py", "admin:reviews.ts"),
    "REV-05": ("M5", "review; listing; host_account; organization", "GET /api/v1/listings/{id}/reviews; job: reviews.recompute_ratings", "tests/reviews/test_ratings.py", "web:reviews.ts"),
    # MSG
    "MSG-01": ("M5", "conversation; conversation_participant; message", "GET /api/v1/conversations; POST /api/v1/conversations; POST /api/v1/conversations/{id}/messages", "tests/messaging/test_conversations.py", "web:conversations.ts"),
    "MSG-02": ("M5", "message", "GET /api/v1/conversations/sync?cursor=", "tests/messaging/test_sync_cursor.py", "web:conversations.ts"),
    "MSG-03": ("M5", "conversation_participant", "POST /api/v1/conversations/{id}/read; GET /api/v1/me/unread-counts", "tests/messaging/test_read_state.py", "web:conversations.ts"),
    "MSG-04": ("M5", "message", "POST /api/v1/conversations/{id}/messages (masking)", "tests/messaging/test_contact_masking.py", "web:conversations.ts"),
    "MSG-05": ("R2-B", "message; media_asset", "POST /api/v1/conversations/{id}/attachments", "tests/messaging/test_attachments.py", "web:conversations.ts"),
    "MSG-06": ("R2-B", "conversation; message; audit_event", "POST /api/v1/admin/messages; POST /api/v1/admin/broadcasts", "tests/messaging/test_staff_broadcast.py", "admin (messages pages, no lib/data module yet)"),
    # NTF
    "NTF-01": ("M4", "notification; outbox_event", "GET /api/v1/me/notifications; POST /api/v1/me/notifications/{id}/read; POST /api/v1/me/notifications/read-all", "tests/notifications/test_in_app.py", "web:notifications.ts"),
    "NTF-02": ("M4", "outbox_event; delivery_log", "internal: notifications.send_email_sms", "tests/notifications/test_email_sms.py", "none (workers)"),
    "NTF-03": ("R2-B", "notification_preference", "GET /api/v1/me/notification-preferences; PUT /api/v1/me/notification-preferences", "tests/notifications/test_preferences.py", "web:notifications.ts"),
    "NTF-04": ("M1", "outbox_event; delivery_log", "internal: core.outbox_dispatch", "tests/core/test_outbox.py", "none (workers)"),
    # SRC
    "SRC-01": ("M3", "listing_search_doc", "GET /api/v1/listings (filters and facets)", "tests/search/test_filters_facets.py", "web:listings.ts"),
    "SRC-02": ("M3", "listing_search_doc", "GET /api/v1/listings/map?bbox=", "tests/search/test_map_search.py", "web:listings.ts"),
    "SRC-03": ("M3", "listing_search_doc; wilaya; commune", "GET /api/v1/listings?q=; GET /api/v1/geo/places?q=", "tests/search/test_text_search_ar_fr_en.py", "web:listings.ts"),
    "SRC-04": ("M0", "wilaya; daira; commune", "GET /api/v1/geo/wilayas; GET /api/v1/geo/wilayas/{code}/communes", "tests/geo/test_seed_69_wilayas.py", "web:lib/algeria.ts (static list)"),
    "SRC-05": ("M3", "listing_search_doc", "GET /api/v1/listings?sort=&cursor=", "tests/search/test_sort_pagination.py", "web:listings.ts"),
    "SRC-06": ("M3", "listing; listing_search_doc", "GET /api/v1/listings?vertical=hotel", "tests/search/test_hotel_vertical.py", "web:listings.ts"),
    # MED
    "MED-01": ("M2", "media_asset; listing_photo", "POST /api/v1/media/uploads; POST /api/v1/media/{id}/complete", "tests/media/test_photo_pipeline.py", "web:listings.ts"),
    "MED-02": ("M1", "media_asset; host_document; audit_event", "POST /api/v1/host/documents; GET /api/v1/admin/documents/{id}/url", "tests/media/test_private_documents.py", "admin:hosts.ts"),
    "MED-03": ("M2", "listing_photo", "PUT /api/v1/host/listings/{id}/photos/order", "tests/media/test_photo_order.py", "web:listings.ts"),
    # MOD
    "MOD-01": ("M1", "moderation_case", "GET /api/v1/admin/moderation/queues", "tests/trust/test_queues.py", "admin:approvals.ts"),
    "MOD-02": ("M1", "moderation_case; change_request_item", "POST /api/v1/admin/moderation/cases/{id}/change-requests; GET /api/v1/host/change-requests", "tests/trust/test_change_requests.py", "admin:approvals.ts"),
    "MOD-03": ("M1", "reason_code", "GET /api/v1/admin/reason-codes", "tests/trust/test_reason_codes.py", "admin:approvals.ts"),
    "MOD-04": ("R2-B", "moderation_decision; audit_event", "POST /api/v1/admin/moderation/bulk", "tests/trust/test_bulk_actions.py", "admin:approvals.ts"),
    "MOD-05": ("R2-B", "moderation_decision; audit_event", "POST /api/v1/admin/moderation/decisions/{id}/undo", "tests/trust/test_undo.py", "admin:approvals.ts"),
    "MOD-06": ("M2", "host_account; listing; trip; booking; moderation_case", "POST /api/v1/admin/hosts/{id}/suspend; POST /api/v1/admin/hosts/{id}/ban", "tests/trust/test_suspension_cascade.py", "admin:hosts.ts"),
    "MOD-07": ("R2-B", "moderation_case", "job: trust.evaluate_risk_rules", "tests/trust/test_risk_flags.py", "admin:approvals.ts"),
    "MOD-08": ("M1", "host_document; moderation_decision", "POST /api/v1/admin/documents/{id}/approve; POST /api/v1/admin/documents/{id}/reject", "tests/trust/test_document_review.py", "admin:hosts.ts"),
    # STF
    "STF-01": ("M1", "staff_profile; staff_permission; staff_role_permission", "GET /api/v1/admin/me/permissions; GET /api/v1/admin/team/roles", "tests/accounts/test_staff_permissions.py", "admin:team.ts"),
    "STF-02": ("M1", "staff_profile; user; allauth session tables", "POST /api/v1/admin/team/invitations; POST /api/v1/admin/team/{id}/deactivate", "tests/accounts/test_staff_invite.py", "admin:team.ts"),
    "STF-03": ("M1", "audit_event", "GET /api/v1/admin/audit", "tests/audit/test_append_only.py", "admin:audit.ts"),
    "STF-04": ("M1", "every actor foreign key (ledger_transaction, moderation_decision, onboarding_flow_version, refund)", "none (schema rule)", "tests/audit/test_actor_ids.py", "admin:audit.ts"),
    "STF-05": ("M1", "none", "/api/v1/admin/* router (staff tokens only)", "tests/accounts/test_admin_surface.py", "admin:credentials.ts"),
    "STF-06": ("M6", "export_job; audit_event", "POST /api/v1/admin/exports; GET /api/v1/admin/exports/{id}", "tests/audit/test_exports.py", "admin:analytics.ts"),
    # CFG
    "CFG-01": ("M0", "platform_settings", "GET /api/v1/settings/public; GET /api/v1/admin/settings; PUT /api/v1/admin/settings", "tests/config/test_settings.py", "admin:settings.ts (switches in M1, after staff sign-in works)"),
    "CFG-02": ("M1", "onboarding_flow_version", "GET /api/v1/admin/onboarding/flows/{host_type}/draft; POST /api/v1/admin/onboarding/flows/{host_type}/publish", "tests/config/test_flow_versions.py", "admin:onboarding.ts"),
    "CFG-03": ("R2-B", "onboarding_flow_version", "PATCH /api/v1/admin/onboarding/flows/{host_type}/draft", "tests/config/test_field_editor.py", "admin:onboarding.ts"),
    "CFG-04": ("M1", "onboarding_flow_version; onboarding_draft", "GET /api/v1/onboarding/flows/{host_type}", "tests/config/test_serve_flow.py", "web:auth.ts (updateUserHostStatus)"),
    "CFG-05": ("M2", "category; amenity; property_type", "GET|POST|PATCH /api/v1/admin/catalog/categories|amenities|property-types", "tests/catalog/test_taxonomy_admin.py", "admin:categories.ts"),
    # PRM
    "PRM-01": ("R2-B", "coupon; coupon_redemption; quote", "GET /api/v1/admin/coupons; POST /api/v1/admin/coupons; POST /api/v1/quotes (coupon_code)", "tests/promotions/test_coupons.py", "admin:promotions.ts"),
    "PRM-02": ("R2-B", "coupon; ledger_transaction", "internal: ledger.post_coupon_funding", "tests/promotions/test_coupon_funding.py", "admin:promotions.ts"),
    # RPT
    "RPT-01": ("M6", "booking; ledger_entry; listing; host_account", "GET /api/v1/admin/analytics/kpis", "tests/reports/test_kpis.py", "admin:analytics.ts"),
    "RPT-02": ("R2-B", "booking; listing; host_account", "GET /api/v1/admin/analytics/host-type-by-vertical", "tests/reports/test_crosstab.py", "admin:analytics.ts"),
    "RPT-03": ("M6", "booking; ledger_entry", "GET /api/v1/host/earnings", "tests/reports/test_host_earnings.py", "web:wallet.ts"),
    # PRV
    "PRV-01": ("M0", "consent_record", "POST /api/v1/auth/signup (consents); POST /api/v1/me/consents", "tests/privacy/test_consents.py", "web:auth.ts"),
    "PRV-02": ("M6", "data_subject_request", "POST /api/v1/me/data-requests; GET /api/v1/admin/privacy/requests", "tests/privacy/test_data_requests.py", "admin:users.ts (privacy actions; the module itself switches in M1)"),
    "PRV-03": ("M7", "none (infrastructure and backups)", "none", "tests/ops/test_residency_checklist.md (manual)", "none"),
    "PRV-04": ("M6", "host_document; media_asset; data_subject_request", "job: privacy.apply_retention", "tests/privacy/test_retention.py", "none (jobs)"),
    "PRV-05": ("M6", "no table yet (incident register, decision T5 in 13-decisions-needed.md)", "none (runbook)", "tests/ops/breach_drill.md (manual)", "none"),
    "PRV-06": ("R2-B", "user (nationality_iso2); booking", "PATCH /api/v1/me (nationality, ID type when required)", "tests/privacy/test_foreign_guest_fields.py", "web:auth.ts"),
    # NFR
    "NFR-01": ("M6", "all", "all /api/v1/*", "tests/perf/locust_api.py", "none"),
    "NFR-02": ("M6", "listing_search_doc", "GET /api/v1/listings", "tests/perf/locust_search.py", "none"),
    "NFR-03": ("M7", "none", "GET /api/v1/health", "tests/ops/test_health.py", "none"),
    "NFR-04": ("M7", "all", "none", "tests/ops/restore_drill.md (manual)", "none"),
    "NFR-05": ("M0", "none", "all /api/v1/*", "tests/security/test_baseline.py", "none"),
    "NFR-06": ("M0", "name_en/name_fr/name_ar columns on reference tables", "all errors and notifications", "tests/core/test_i18n_errors.py", "none"),
    "NFR-07": ("M0", "timestamptz and date columns", "all /api/v1/*", "tests/core/test_time_rules.py", "none"),
    "NFR-08": ("M0", "none", "GET /api/v1/schema (OpenAPI)", "tests/core/test_openapi_contract.py", "both apps: generated typed client"),
    "NFR-09": ("M0", "none", "GET /api/v1/health; metrics endpoint", "tests/core/test_logging.py", "none"),
    "NFR-10": ("M0", "all", "all", "CI coverage gate (pytest-cov) and tests/**/test_*_property.py", "none"),
    "NFR-11": ("M0", "none (Redis)", "throttles per endpoint group", "tests/core/test_rate_limits.py", "none"),
    "NFR-12": ("M0", "all primary keys (UUIDv7); booking.reference", "all ids in /api/v1/*", "tests/core/test_ids.py", "none"),
    "NFR-13": ("M0", "none", "error envelope on all /api/v1/*", "tests/core/test_error_codes.py", "both apps: ActionResult mapping"),
}


def openapi_ops_by_requirement():
    """Reads openapi.yaml without a YAML library: path lines, method lines, x-requirements lists."""
    spec = ROOT / "openapi.yaml"
    if not spec.exists():
        return {}
    out, path, method, in_reqs = {}, None, None, False
    for line in spec.read_text(encoding="utf-8").splitlines():
        if line.startswith("  /") and line.rstrip().endswith(":"):
            path, method, in_reqs = line.strip()[:-1], None, False
        elif path and re.match(r"^    (get|post|put|patch|delete):\s*$", line):
            method, in_reqs = line.strip()[:-1].upper(), False
        elif method and line.strip() == "x-requirements:":
            in_reqs = True
        elif in_reqs and re.match(r"^\s*- [A-Z]{3}-\d+\s*$", line):
            out.setdefault(line.strip()[2:], []).append(f"{method} {path}")
        elif in_reqs:
            in_reqs = False
        if line and not line.startswith(" "):
            path = None if not line.startswith("paths") else path
    return out


def main():
    with open(ROOT / "requirements.csv", encoding="utf-8", newline="") as f:
        reqs = list(csv.DictReader(f))
    ids = [r["id"] for r in reqs]
    missing = [i for i in ids if i not in T]
    extra = [i for i in T if i not in ids]
    assert not missing, f"no mapping for {missing}"
    assert not extra, f"mapping for unknown ids {extra}"
    rules_text = (ROOT / "04-business-rules.md").read_text(encoding="utf-8")
    for r in reqs:
        m = T[r["id"]][0]
        assert m in MILESTONES, r["id"]
        assert RELEASE_OF[m] == r["release"], f"{r['id']}: milestone {m} does not match release {r['release']}"
        for rule in filter(None, re.split(r"[;, ]+", r["rules"])):
            assert f"| {rule} |" in rules_text, f"{r['id']}: rule {rule} not found in 04-business-rules.md"
    for row in T.values():
        assert chr(0x2014) not in "".join(row), "em dash in mapping"

    # API column: taken from openapi.yaml (operations whose x-requirements list the ID).
    # Requirements with no operation (jobs, quality targets) keep the planned description,
    # prefixed "no endpoint:" so the gap is visible.
    ops_by_req = openapi_ops_by_requirement()
    cols = ["id", "module", "title", "priority", "release", "milestone", "rules", "tables", "api", "tests", "lib_data"]
    rows = []
    for r in reqs:
        m, tables, api, tests, lib = T[r["id"]]
        ops = ops_by_req.get(r["id"])
        if ops:
            api = "; ".join(ops[:6]) + (f"; (+{len(ops) - 6} more)" if len(ops) > 6 else "")
        elif ops_by_req:
            api = f"no endpoint: {api}"
        rows.append([r["id"], r["module"], r["title"], r["priority"], r["release"], m, r["rules"], tables, api, tests, lib])
    order = {m: i for i, m in enumerate(MILESTONES)}
    with open(ROOT / "traceability.csv", "w", encoding="utf-8", newline="") as f:
        w = csv.writer(f)
        w.writerow(cols)
        w.writerows(rows)

    modules = list(dict.fromkeys(r["module"] for r in reqs))
    by_m = collections.Counter(row[5] for row in rows)
    cross = collections.Counter((row[1], row[5]) for row in rows)
    must = collections.Counter(row[5] for row in rows if row[3] == "Must")

    def esc(s):
        return s.replace("|", "\\|")

    out = []
    out.append("# Traceability matrix: requirement to rule, table, API, test and milestone")
    out.append("")
    out.append("> **In plain words**")
    out.append("> One line per requirement (all 147 from [requirements.csv](requirements.csv)).")
    out.append("> Each line says which business rules it follows, which database tables hold its data, which API calls serve it,")
    out.append("> where its tests will live, in which roadmap milestone it is built, and which app data module stops using demo data.")
    out.append("> Use it to answer \"if we change X, what else moves?\" and \"is everything planned somewhere?\".")
    out.append("> This page and [traceability.csv](traceability.csv) are generated by `python _tools/build_traceability.py`. Edit the script, not the tables.")
    out.append("")
    out.append("**Terms used here** (see [glossary.md](glossary.md)):")
    out.append("- **Traceability**: being able to follow one need from the request, through the rules and the database, to the test that proves it.")
    out.append("- **Milestone**: a block of build work with an exit test, defined in [11-roadmap.md](11-roadmap.md).")
    out.append("- **API area**: the family of web addresses (endpoints) the apps call. Final paths are in `06-api-design.md` and `openapi.yaml` (tagged with `x-requirements`); names here are plain REST guesses.")
    out.append("- **job:** a scheduled background task (Celery). **internal:** a service called by other code, with no public address.")
    out.append("- **`lib/data` module**: the file in the website (`web:`) or admin (`admin:`) app whose functions switch from demo data to the API, behind a per-module flag.")
    out.append("")
    out.append("---")
    out.append("")
    out.append("## 1. Requirements per milestone")
    out.append("")
    out.append("| Milestone | Name | Release | Requirements | of which Must |")
    out.append("|---|---|---|---|---|")
    for m in MILESTONES:
        out.append(f"| {m} | {MILESTONE_NAMES[m]} | {RELEASE_OF[m]} | {by_m[m]} | {must[m]} |")
    out.append(f"| **Total** | | | **{len(rows)}** | **{sum(must.values())}** |")
    out.append("")
    out.append("## 2. Requirements per module and milestone")
    out.append("")
    out.append("| Module | " + " | ".join(MILESTONES) + " | Total |")
    out.append("|---|" + "---|" * (len(MILESTONES) + 1))
    for mod in modules:
        cells = [str(cross[(mod, m)]) if cross[(mod, m)] else "" for m in MILESTONES]
        out.append(f"| {mod} | " + " | ".join(cells) + f" | {sum(cross[(mod, m)] for m in MILESTONES)} |")
    out.append("| **Total** | " + " | ".join(str(by_m[m]) for m in MILESTONES) + f" | **{len(rows)}** |")
    out.append("")
    out.append("## 3. Full matrix (sorted by milestone, then ID order of requirements.csv)")
    out.append("")
    out.append("| ID | Requirement | Pri. | Milestone | Rules | Tables | API area | Tests | `lib/data` switch |")
    out.append("|---|---|---|---|---|---|---|---|---|")
    for row in sorted(rows, key=lambda x: order[x[5]]):
        out.append(f"| {row[0]} | {esc(row[2])} | {row[3]} | {row[5]} | {row[6]} | {esc(row[7])} | {esc(row[8])} | `{row[9]}` | {esc(row[10])} |")
    out.append("")
    out.append("## 4. Known gaps found while building this matrix")
    out.append("")
    out.append("| Requirement | Gap | Where it is tracked |")
    out.append("|---|---|---|")
    out.append("| AVL-06 | No table for external calendar feeds in `schema.dbml` (Later release, so not urgent) | T5 in [13-decisions-needed.md](13-decisions-needed.md) |")
    out.append("| PRV-05 | No incident register table; the breach runbook needs one to record the 5-day ANPDP clock | T5 in [13-decisions-needed.md](13-decisions-needed.md) |")
    out.append("| ACC-02 | One-time codes are kept in Redis, not in a table; the audit of code sends relies on `delivery_log` | T5 in [13-decisions-needed.md](13-decisions-needed.md) |")
    out.append("| MSG-06 | The admin messages pages have no `lib/data` module today (screens are mocked inline) | [11-roadmap.md](11-roadmap.md) R2-B |")
    out.append("")
    out.append("## Check yourself")
    out.append("")
    out.append("- [ ] In which milestone is BKG-01 (instant booking) built, and why can it not come before the wallet?")
    out.append("- [ ] Which tables hold the data for AVL-01, and which database feature stops double bookings?")
    out.append("- [ ] Which `lib/data` modules switch to the API in M4?")
    out.append("- [ ] How many requirements are planned for R2-A, and which outside answers (F1 to F4) do they wait for?")
    out.append("- [ ] Find a requirement with no business rule. Is that a problem? Why or why not?")
    out.append("- [ ] If you change BR-PAY-04, which requirements and test files must you look at?")
    out.append("- [ ] Where do you change a mapping so the CSV and this page stay the same?")
    out.append("")
    (ROOT / "traceability.md").write_text("\n".join(out), encoding="utf-8")
    print(f"{len(rows)} requirements written; per milestone: " + ", ".join(f"{m}={by_m[m]}" for m in MILESTONES))


if __name__ == "__main__":
    main()
