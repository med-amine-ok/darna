"""
Tests of the reviews app: guest and host reviews, double-blind publication,
replies, reports, moderation, public lists and rating caches.

Rules covered: BR-REV-01 to BR-REV-04, BR-BKG-09, BR-STF-02.
"""

from datetime import timedelta

import pytest
from django.utils import timezone

from apps.audit.models import AuditEvent
from apps.notifications.models import Notification
from apps.reviews import services
from apps.reviews.models import Review, ReviewReply, ReviewStatus
from conftest import client_for, make_user

from .conftest import finish_stay, host_client_for, make_booking

pytestmark = pytest.mark.django_db

BODY = {
    "rating_overall": 5, "rating_cleanliness": 4, "rating_accuracy": 5, "rating_communication": 5,
    "rating_location": 4, "rating_value": 5, "comment": "Lovely villa, very clean and close to the sea.",
    "language": "en",
}


def guest_review(client, booking, **changes):
    """``POST /me/bookings/{id}/review``."""
    return client.post(f"/api/v1/me/bookings/{booking.id}/review", {**BODY, **changes}, format="json")


def host_review(booking, **changes):
    """``POST /host/bookings/{id}/guest-review`` as the solo host."""
    return host_client_for(booking).post(f"/api/v1/host/bookings/{booking.id}/guest-review", {**BODY, **changes},
                                         format="json")


def published_review(user, user_client, stay):
    """A guest review published by the host reviewing back."""
    guest_review(user_client, stay)
    host_review(stay)
    return Review.objects.get(booking=stay, author_role="guest")


# ---------------------------------------------------------------------------
# BR-REV-01: who may review, once, in the window
# ---------------------------------------------------------------------------
def test_br_rev_01_guest_reviews_confirmed_stay(user_client, stay):
    """Happy path: 201, ``submitted`` while the host has not reviewed (BR-REV-02)."""
    response = guest_review(user_client, stay)
    assert response.status_code == 201, response.data
    assert response.data["status"] == "submitted"
    assert response.data["stay_month"] == stay.check_in.strftime("%Y-%m")
    assert response.data["author"]["display_name"]


def test_br_rev_01_review_refused_without_stay_confirmation(user, user_client):
    """Completed by the job but never confirmed: 409 ``stay_not_confirmed`` (BR-BKG-09)."""
    booking = finish_stay(make_booking(user), confirmed=False)
    response = guest_review(user_client, booking)
    assert response.status_code == 409
    assert response.data["code"] == "stay_not_confirmed"


def test_br_rev_01_not_completed_refused(user, user_client):
    """A confirmed booking in the future cannot be reviewed yet."""
    booking = make_booking(user)
    response = guest_review(user_client, booking)
    assert response.status_code == 409
    assert response.data["code"] == "booking_not_completed"


def test_br_rev_01_second_review_refused(user_client, stay):
    """One review per booking and side: 409 ``review_exists``."""
    assert guest_review(user_client, stay).status_code == 201
    response = guest_review(user_client, stay)
    assert response.status_code == 409
    assert response.data["code"] == "review_exists"


def test_br_rev_01_window_closed_after_14_days(user, user_client):
    """Check-out 20 days ago: 422 ``review_window_closed``."""
    booking = finish_stay(make_booking(user), days_ago=20)
    response = guest_review(user_client, booking)
    assert response.status_code == 422
    assert response.data["code"] == "review_window_closed"


def test_br_rev_01_ratings_must_be_1_to_5(user_client, stay):
    """Rating 6 and a too short comment are field errors (400)."""
    response = guest_review(user_client, stay, rating_overall=6, comment="short")
    assert response.status_code == 400
    assert set(response.data["errors"]) >= {"rating_overall", "comment"}


def test_other_guest_booking_is_404(stay):
    """Another guest cannot review my booking (looks missing)."""
    other = client_for(make_user(email="other@example.dz"))
    assert guest_review(other, stay).status_code == 404


def test_anonymous_cannot_review(api, stay):
    """Signed-out callers get 401."""
    assert guest_review(api, stay).status_code == 401


# ---------------------------------------------------------------------------
# BR-REV-02: double-blind
# ---------------------------------------------------------------------------
def test_br_rev_02_hidden_until_both_sides_reviewed(user, user_client, stay):
    """The guest review is invisible publicly until the host reviews; then both are published and both sides told."""
    guest_review(user_client, stay)
    listing_url = f"/api/v1/listings/{stay.listing_id}/reviews"
    assert client_for(make_user(email="reader@example.dz")).get(listing_url).data["results"] == []
    assert host_client_for(stay).get("/api/v1/host/reviews").data["results"] == []
    response = host_review(stay)
    assert response.status_code == 201
    assert Review.objects.filter(booking=stay, status=ReviewStatus.PUBLISHED).count() == 2
    public = client_for(make_user(email="reader2@example.dz")).get(listing_url).data
    assert len(public["results"]) == 1 and public["results"][0]["author_role"] == "guest"
    assert public["summary"]["review_count"] == 1 and public["summary"]["rating_avg"] == 5.0
    assert Notification.objects.filter(user=user, kind="review.published").count() == 1


def test_br_rev_02_job_publishes_after_window(user, user_client):
    """Only one side reviewed: the job publishes it once the 14 days are over."""
    booking = finish_stay(make_booking(user), days_ago=3)
    guest_review(user_client, booking)
    assert services.publish_due_reviews() == 0
    assert services.publish_due_reviews(now=timezone.now() + timedelta(days=15)) == 1
    assert Review.objects.get(booking=booking).status == ReviewStatus.PUBLISHED


def test_host_review_needs_permission_and_own_booking(stay):
    """Another host's booking is 404 for this workspace."""
    from apps.catalog.tests import factories as f

    other_account, other_user = f.approved_individual_host()
    response = client_for(other_user, other_account).post(f"/api/v1/host/bookings/{stay.id}/guest-review", BODY,
                                                         format="json")
    assert response.status_code == 404


# ---------------------------------------------------------------------------
# BR-REV-04: rating caches
# ---------------------------------------------------------------------------
def test_br_rev_04_rating_equals_average_of_published(user, user_client, stay):
    """Listing and host account caches follow published reviews and drop when one is hidden."""
    review = published_review(user, user_client, stay)
    stay.listing.refresh_from_db()
    stay.host_account.refresh_from_db()
    assert stay.listing.review_count == 1 and float(stay.listing.rating_avg) == 5.0
    assert stay.host_account.review_count == 1
    other = make_user(email="second@example.dz")
    second = finish_stay(make_booking(other, stay.listing, start=20, end=22))
    guest_review(client_for(other), second, rating_overall=2)
    host_review(second)
    stay.listing.refresh_from_db()
    assert stay.listing.review_count == 2 and float(stay.listing.rating_avg) == 3.5
    services.hide_review(actor=None, review_id=review.id, reason="Contains a phone number.")
    stay.listing.refresh_from_db()
    assert stay.listing.review_count == 1 and float(stay.listing.rating_avg) == 2.0


# ---------------------------------------------------------------------------
# Lists
# ---------------------------------------------------------------------------
def test_me_reviews_and_user_reviews(user, user_client, stay):
    """``/me/reviews`` shows my submitted review; ``/users/{id}/reviews`` shows published ones only."""
    guest_review(user_client, stay)
    mine = user_client.get("/api/v1/me/reviews").data
    assert len(mine["results"]) == 1 and mine["results"][0]["status"] == "submitted"
    assert user_client.get(f"/api/v1/users/{user.id}/reviews", {"role": "author"}).data["results"] == []
    host_review(stay)
    by_author = user_client.get(f"/api/v1/users/{user.id}/reviews", {"role": "author"}).data
    assert len(by_author["results"]) == 1
    host_user = stay.host_account.user
    received = user_client.get(f"/api/v1/users/{host_user.id}/reviews").data
    assert len(received["results"]) == 1 and received["summary"]["review_count"] == 1


def test_trip_reviews_unknown_trip_is_404(api):
    """A trip that does not exist answers 404."""
    assert api.get("/api/v1/trips/00000000-0000-7000-8000-000000000000/reviews").status_code == 404


# ---------------------------------------------------------------------------
# Host reply
# ---------------------------------------------------------------------------
def test_host_reply_editable_48h(user, user_client, stay):
    """Write, edit, then 409 ``reply_locked`` after 48 hours."""
    review = published_review(user, user_client, stay)
    host = host_client_for(stay)
    url = f"/api/v1/host/reviews/{review.id}/reply"
    response = host.put(url, {"body": "Thank you, come back soon!"}, format="json")
    assert response.status_code == 200, response.data
    assert response.data["reply"]["body"] == "Thank you, come back soon!"
    assert host.put(url, {"body": "Thank you again!"}, format="json").status_code == 200
    ReviewReply.objects.filter(review=review).update(editable_until=timezone.now() - timedelta(minutes=1))
    response = host.put(url, {"body": "Too late."}, format="json")
    assert response.status_code == 409 and response.data["code"] == "reply_locked"
    listed = host.get("/api/v1/host/reviews", {"has_reply": "true"}).data
    assert len(listed["results"]) == 1


def test_guest_cannot_reply(user_client, user, stay):
    """A guest without a host workspace gets 403."""
    review = published_review(user, user_client, stay)
    response = user_client.put(f"/api/v1/host/reviews/{review.id}/reply", {"body": "Me too"}, format="json")
    assert response.status_code == 403


# ---------------------------------------------------------------------------
# Reports and moderation (BR-REV-03)
# ---------------------------------------------------------------------------
def test_br_rev_03_report_once_and_flag_after_threshold(user, user_client, stay):
    """One report per user (409); after 3 reports the review is flagged and leaves the public list."""
    review = published_review(user, user_client, stay)
    url = f"/api/v1/reviews/{review.id}/reports"
    clients = [client_for(make_user(email=f"r{i}@example.dz")) for i in range(3)]
    assert clients[0].post(url, {"reason_code": "fake"}, format="json").status_code == 204
    response = clients[0].post(url, {"reason_code": "fake"}, format="json")
    assert response.status_code == 409 and response.data["code"] == "already_reported"
    assert clients[1].post(url, {"reason_code": "nonsense"}, format="json").status_code == 422
    assert user_client.post(url, {"reason_code": "spam"}, format="json").status_code == 422  # own review
    clients[1].post(url, {"reason_code": "spam"}, format="json")
    clients[2].post(url, {"reason_code": "offensive"}, format="json")
    review.refresh_from_db()
    assert review.status == ReviewStatus.FLAGGED


def test_br_rev_03_admin_hide_restore_dismiss(user, user_client, stay, admin_client):
    """Hide needs a reason; restore publishes again; dismiss closes reports; each move audited."""
    review = published_review(user, user_client, stay)
    client_for(make_user(email="rep@example.dz")).post(f"/api/v1/reviews/{review.id}/reports",
                                                       {"reason_code": "fake"}, format="json")
    listed = admin_client.get("/api/v1/admin/reviews", {"reported": "true"}).data
    assert listed["meta"]["total_count"] == 1 and listed["results"][0]["open_reports"] == 1
    assert listed["results"][0]["booking_reference"] == stay.reference
    base = f"/api/v1/admin/reviews/{review.id}"
    assert admin_client.post(f"{base}/hide", {}, format="json").status_code == 400
    response = admin_client.post(f"{base}/hide", {"reason": "Fake review, same IP as host."}, format="json")
    assert response.status_code == 200 and response.data["status"] == "hidden"
    assert response.data["open_reports"] == 0
    response = admin_client.post(f"{base}/restore", {}, format="json")
    assert response.status_code == 200 and response.data["status"] == "published"
    assert admin_client.post(f"{base}/dismiss-reports", {}, format="json").status_code == 200
    actions = set(AuditEvent.objects.filter(object_id=str(review.id)).values_list("action", flat=True))
    assert {"REVIEW_HIDE", "REVIEW_RESTORE", "REVIEW_DISMISS_REPORTS"} <= actions


def test_br_rev_03_remove_only_super_admin_and_final(user, user_client, stay, admin_client, admin_user):
    """An admin who is not super admin gets 403; a super admin removes; restore is then refused."""
    review = published_review(user, user_client, stay)
    base = f"/api/v1/admin/reviews/{review.id}"
    response = admin_client.delete(base)
    assert response.status_code == 403 and response.data["code"] == "super_admin_required"
    admin_user.is_superuser = True
    admin_user.save(update_fields=["is_superuser"])
    assert admin_client.delete(base).status_code == 204
    response = admin_client.post(f"{base}/restore", {}, format="json")
    assert response.status_code == 409 and response.data["code"] == "review_removed"


def test_admin_routes_refuse_guests(user_client):
    """A guest gets 403 on the moderation queue."""
    assert user_client.get("/api/v1/admin/reviews").status_code == 403
