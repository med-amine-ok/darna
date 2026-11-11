"""Worked examples (also copied into 06-api-design.md section 11). Money is in centimes."""


def m(dzd):
    return {"amount_minor": dzd * 100, "currency": "DZD"}


MODERATE = {"code": "moderate", "version": 1, "label": "Moderate",
            "windows": [{"min_days_before": 5, "refund_bp": 10000}, {"min_days_before": 1, "refund_bp": 5000}, {"min_days_before": 0, "refund_bp": 0}]}
LINES = [
    {"kind": "night", "label": "Night of 2026-12-18", "date": "2026-12-18", "quantity": 1, "unit_amount": m(18500), "amount": m(18500)},
    {"kind": "night", "label": "Night of 2026-12-19", "date": "2026-12-19", "quantity": 1, "unit_amount": m(18500), "amount": m(18500)},
    {"kind": "night", "label": "Night of 2026-12-20", "date": "2026-12-20", "quantity": 1, "unit_amount": m(18500), "amount": m(18500)},
    {"kind": "cleaning_fee", "label": "Cleaning fee", "date": None, "quantity": 1, "unit_amount": m(4000), "amount": m(4000)},
]
HOST = {"host_account_id": "01933b7e-8a10-7c3e-9f00-1a2b3c4d5e01", "kind": "individual", "host_type": "individual",
        "display_name": "Karim B.", "verified": True, "rating_avg": 4.8, "review_count": 23, "joined_year": 2025}
BOOKING_BASE = {
    "id": "01933c10-0000-7000-8000-00000000b001", "reference": "BLD-2026-7K2M9Q", "status": "pending", "payment_status": "not_collected",
    "inventory_kind": "single", "vertical": "home", "listing_id": "01933b80-1111-7aaa-8bbb-000000000001",
    "title": "Villa with sea view in Tipaza", "check_in": "2026-12-18", "check_out": "2026-12-21",
    "check_in_at": "2026-12-18T14:00:00Z", "check_out_at": "2026-12-21T10:00:00Z",
    "guests_adults": 4, "guests_children": 1, "units": 1, "approval_mode_applied": "request",
    "request_expires_at": "2026-11-10T09:30:00Z", "price_lines": LINES,
    "subtotal": m(55500), "discount": m(0), "cleaning_fee": m(4000), "taxes": m(0), "total": m(59500),
    "refund_due": m(0), "refunds": [], "cancellation_policy": MODERATE,
    "conversation_id": "01933c10-0000-7000-8000-00000000c001", "created_at": "2026-11-09T09:30:00Z",
}

EXAMPLES = {
    "searchListings": {"response": {
        "results": [{
            "id": "01933b80-1111-7aaa-8bbb-000000000001", "reference": "LST-7K2M9Q", "vertical": "home", "experience_type": None,
            "title": "Villa with sea view in Tipaza", "property_type": "villa",
            "commune": {"id": 4201, "name": "Tipaza", "wilaya_code": 42, "wilaya_name": "Tipaza"},
            "location_public": {"lat": 36.5921, "lng": 2.4433}, "cover_photo": None,
            "price_from": m(18500), "price_unit": "night", "rating_avg": 4.8, "review_count": 23, "instant_bookable": False,
            "host_type": "individual", "matched_availability": {"full_match": True, "from": "2026-12-18", "to": "2026-12-21"},
            "quoted_total": m(59500), "is_favorite": False}],
        "next_cursor": "eyJyIjowLjkxLCJpZCI6IjAxOTMzYjgwIn0", "has_more": True, "total_estimate": 37}},
    "createQuote": {
        "request": {"listing_id": "01933b80-1111-7aaa-8bbb-000000000001", "check_in": "2026-12-18", "check_out": "2026-12-21",
                    "guests_adults": 4, "guests_children": 1, "units": 1},
        "response": {"id": "01933c0f-aaaa-7bbb-8ccc-00000000a001", "expires_at": "2026-11-09T10:00:00Z",
                     "listing_id": "01933b80-1111-7aaa-8bbb-000000000001", "room_type_id": None, "experience_slot_id": None, "trip_departure_id": None,
                     "check_in": "2026-12-18", "check_out": "2026-12-21", "nights": 3, "guests_adults": 4, "guests_children": 1, "units": 1,
                     "lines": LINES, "subtotal": m(55500), "discount": m(0), "cleaning_fee": m(4000), "taxes": m(0), "total": m(59500),
                     "platform_fee": m(0), "approval_mode": "request", "cancellation_policy": MODERATE}},
    "createBooking": {
        "request": {"quote_id": "01933c0f-aaaa-7bbb-8ccc-00000000a001", "guest_message": "We arrive around 16:00 with a baby.", "terms_version": "2026-10"},
        "response": dict(BOOKING_BASE, host=HOST, address_line=None, location_exact=None, host_phone_e164=None,
                         can_cancel=True, can_review=False, review_deadline=None)},
    "acceptBookingRequest": {
        "request": {"message_to_guest": "Welcome! The key box code will be sent the day before."},
        "response": dict(BOOKING_BASE, status="confirmed", request_expires_at=None, confirmed_at="2026-11-09T11:02:00Z",
                         host_account_id=HOST["host_account_id"],
                         guest={"id": "01933a00-0000-7000-8000-0000000a0001", "display_name": "Yacine M.", "avatar_url": None},
                         guest_phone_e164="+213555123456", guest_message="We arrive around 16:00 with a baby.",
                         commission={"rate_bp": 1200, "base": m(55500), "amount": m(6660), "reversed": m(0)},
                         allowed_actions=["cancel", "message"])},
    "adminApproveTopup": {"response": {
        "id": "01933d00-0000-7000-8000-0000000e0001", "host_account_id": "01933b7e-8a10-7c3e-9f00-1a2b3c4d5e02",
        "host": {"host_account_id": "01933b7e-8a10-7c3e-9f00-1a2b3c4d5e02", "kind": "organization", "host_type": "agency",
                 "display_name": "Atlas Escapes", "verified": True},
        "method": "ccp_transfer", "amount": m(600000), "receipt_reference": "CCP-0012345-2026-11-08", "status": "approved",
        "requested_by": {"id": "01933a00-0000-7000-8000-0000000d0001", "display_name": "Samira (finance)"},
        "approved_by": {"id": "01933a00-0000-7000-8000-0000000d0002", "display_name": "Nadir (finance)"},
        "approved_at": "2026-11-09T12:15:00Z", "rejection_reason": None, "ledger_transaction_id": "01933d00-0000-7000-8000-0000000f0001",
        "needs_second_approval": True, "wallet_balance_after": m(612400), "created_at": "2026-11-09T09:05:00Z"}},
    "syncConversations": {"response": {
        "conversations": [{"id": "01933c10-0000-7000-8000-00000000c001", "kind": "booking", "my_role": "guest",
                           "host_account_id": HOST["host_account_id"],
                           "subject": {"listing_id": "01933b80-1111-7aaa-8bbb-000000000001", "trip_id": None, "booking_id": "01933c10-0000-7000-8000-00000000b001",
                                       "booking_reference": "BLD-2026-7K2M9Q", "title": "Villa with sea view in Tipaza", "photo": None},
                           "other_party": {"id": "01933a00-0000-7000-8000-0000000a0009", "display_name": "Karim B.", "avatar_url": None},
                           "last_message": {"id": 90412, "preview": "Welcome! The key box code...", "created_at": "2026-11-09T11:02:05Z", "sender_is_me": False},
                           "last_read_message_id": 90398, "unread_count": 1, "muted": False, "last_message_at": "2026-11-09T11:02:05Z"}],
        "messages": [{"id": 90412, "conversation_id": "01933c10-0000-7000-8000-00000000c001",
                      "sender": {"id": "01933a00-0000-7000-8000-0000000a0009", "display_name": "Karim B.", "avatar_url": None},
                      "sender_role": "host_member", "kind": "text", "body": "Welcome! The key box code will be sent the day before.",
                      "is_masked": False, "client_message_id": None, "created_at": "2026-11-09T11:02:05Z"}],
        "unread_total": 1, "next_cursor": "m90412", "has_more": False, "poll_after_ms": 10000}},
}
