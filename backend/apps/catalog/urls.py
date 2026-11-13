"""URL routes of the catalog app, mounted under ``/api/v1/`` (paths follow docs/backend/openapi.yaml)."""

from django.urls import path

from . import views

# Host status buttons and admin decisions: one URL per action.
HOST_ACTIONS = ["submit", "pause", "resume", "archive", "withdraw", "reopen"]
ADMIN_ACTIONS = {
    "approve": "approve", "reject": "reject", "request-changes": "request_changes",
    "suspend": "suspend", "unsuspend": "unsuspend", "restore": "restore",
}

urlpatterns = [
    # Public
    path("listings", views.ListingSearchView.as_view(), name="listing-search"),
    path("listings/<str:key>", views.ListingDetailView.as_view(), name="listing-detail"),
    path("listings/<str:key>/services", views.ListingServicesView.as_view(), name="listing-services"),
    path("reference/amenities", views.AmenityListView.as_view(), name="reference-amenities"),
    path("reference/property-types", views.PropertyTypeListView.as_view(), name="reference-property-types"),
    path("reference/categories", views.CategoryListView.as_view(), name="reference-categories"),
    path("reference/cancellation-policies", views.CancellationPolicyListView.as_view(), name="reference-policies"),
    path("reference/experience-types", views.ExperienceTypeListView.as_view(), name="reference-experience-types"),
    path("reference/trip-types", views.TripTypeListView.as_view(), name="reference-trip-types"),
    # Host
    path("host/listings", views.HostListingListView.as_view(), name="host-listings"),
    path("host/listings/<uuid:listing_id>", views.HostListingDetailView.as_view(), name="host-listing"),
    *[
        path(f"host/listings/<uuid:listing_id>/{name}", views.HostListingActionView.as_view(action_name=name),
             name=f"host-listing-{name}")
        for name in HOST_ACTIONS
    ],
    path("host/listings/<uuid:listing_id>/room-types", views.HostRoomTypeListView.as_view(), name="host-room-types"),
    path("host/room-types/<uuid:room_type_id>", views.HostRoomTypeDetailView.as_view(), name="host-room-type"),
    path("host/listings/<uuid:listing_id>/photos", views.HostPhotoListView.as_view(), name="host-photos"),
    path("host/listings/<uuid:listing_id>/photos/order", views.HostPhotoOrderView.as_view(), name="host-photos-order"),
    path("host/listings/<uuid:listing_id>/photos/<uuid:photo_id>", views.HostPhotoDetailView.as_view(), name="host-photo"),
    path("host/listings/<uuid:listing_id>/services", views.HostServiceListView.as_view(), name="host-services"),
    path("host/listings/<uuid:listing_id>/services/<uuid:service_id>", views.HostServiceDetailView.as_view(),
         name="host-service"),
    # Admin
    path("admin/listings", views.AdminListingListView.as_view(), name="admin-listings"),
    path("admin/listings/<uuid:listing_id>", views.AdminListingDetailView.as_view(), name="admin-listing"),
    *[
        path(f"admin/listings/<uuid:listing_id>/{url}", views.AdminListingActionView.as_view(action_name=name),
             name=f"admin-listing-{url}")
        for url, name in ADMIN_ACTIONS.items()
    ],
]
