"""URL routes of the catalog app, mounted under ``/api/v1/`` (paths follow docs/backend/openapi.yaml)."""

from django.urls import path, re_path

from . import views

# Admin decisions that keep their own URL in the plan; every other staff move
# goes through ``POST /admin/listings/{id}/status``.
ADMIN_ACTIONS = {
    "approve": "approve", "reject": "reject", "request-changes": "request_changes",
    "suspend": "suspend", "restore": "restore",
}

# ``listings/facets`` and ``listings/map`` belong to apps.search, whose routes
# are included after this app: the listing page must not swallow those two words.
LISTING_KEY = r"(?P<key>(?!facets$|map$)[^/]+)"

urlpatterns = [
    # Public
    path("listings", views.ListingSearchView.as_view(), name="listing-search"),
    re_path(rf"^listings/{LISTING_KEY}$", views.ListingDetailView.as_view(), name="listing-detail"),
    path("listings/<str:key>/services", views.ListingServicesView.as_view(), name="listing-services"),
    path("reference", views.ReferenceDataView.as_view(), name="reference"),
    # Host
    path("host/listings", views.HostListingListView.as_view(), name="host-listings"),
    path("host/listings/<uuid:listing_id>", views.HostListingDetailView.as_view(), name="host-listing"),
    path("host/listings/<uuid:listing_id>/status", views.HostListingStatusView.as_view(), name="host-listing-status"),
    path("host/listings/<uuid:listing_id>/room-types", views.HostRoomTypeListView.as_view(), name="host-room-types"),
    path("host/listings/<uuid:listing_id>/room-types/<uuid:room_type_id>", views.HostRoomTypeDetailView.as_view(),
         name="host-room-type"),
    path("host/listings/<uuid:listing_id>/photos", views.HostPhotoListView.as_view(), name="host-photos"),
    path("host/listings/<uuid:listing_id>/services", views.HostServiceListView.as_view(), name="host-services"),
    path("host/listings/<uuid:listing_id>/services/<uuid:service_id>", views.HostServiceDetailView.as_view(),
         name="host-service"),
    # Admin: listings
    path("admin/listings", views.AdminListingListView.as_view(), name="admin-listings"),
    path("admin/listings/<uuid:listing_id>", views.AdminListingDetailView.as_view(), name="admin-listing"),
    *[
        path(f"admin/listings/<uuid:listing_id>/{url}", views.AdminListingActionView.as_view(action_name=name),
             name=f"admin-listing-{url}")
        for url, name in ADMIN_ACTIONS.items()
    ],
    path("admin/listings/<uuid:listing_id>/status", views.AdminListingStatusView.as_view(), name="admin-listing-status"),
    path("admin/listings/<uuid:listing_id>/featured", views.AdminListingFeaturedView.as_view(),
         name="admin-listing-featured"),
    # Admin: taxonomy (BR-LST-04)
    path("admin/categories", views.AdminCategoryListView.as_view(), name="admin-categories"),
    path("admin/categories/<uuid:category_id>", views.AdminCategoryDetailView.as_view(), name="admin-category"),
    path("admin/amenities", views.AdminAmenityListView.as_view(), name="admin-amenities"),
    path("admin/amenities/<uuid:amenity_id>", views.AdminAmenityDetailView.as_view(), name="admin-amenity"),
    path("admin/property-types", views.AdminPropertyTypeListView.as_view(), name="admin-property-types"),
    path("admin/property-types/<uuid:property_type_id>", views.AdminPropertyTypeDetailView.as_view(),
         name="admin-property-type"),
]
