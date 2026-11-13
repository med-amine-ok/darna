"""URL routes of the trips app, mounted under ``/api/v1/`` (paths follow docs/backend/openapi.yaml)."""

from django.urls import path

from . import views

HOST_ACTIONS = ["submit", "pause", "resume", "archive", "withdraw", "reopen"]
ADMIN_ACTIONS = {
    "approve": "approve", "reject": "reject", "request-changes": "request_changes",
    "suspend": "suspend", "unsuspend": "unsuspend", "restore": "restore",
}

urlpatterns = [
    # Public
    path("trips", views.TripSearchView.as_view(), name="trip-search"),
    path("trips/<str:key>", views.TripDetailView.as_view(), name="trip-detail"),
    path("trips/<str:key>/departures", views.TripDeparturesView.as_view(), name="trip-departures"),
    # Host (agency)
    path("host/trips", views.HostTripListView.as_view(), name="host-trips"),
    path("host/trips/<uuid:trip_id>", views.HostTripDetailView.as_view(), name="host-trip"),
    *[
        path(f"host/trips/<uuid:trip_id>/{name}", views.HostTripActionView.as_view(action_name=name),
             name=f"host-trip-{name}")
        for name in HOST_ACTIONS
    ],
    path("host/trips/<uuid:trip_id>/itinerary", views.HostItineraryView.as_view(), name="host-trip-itinerary"),
    path("host/trips/<uuid:trip_id>/photos", views.HostTripPhotoView.as_view(), name="host-trip-photos"),
    path("host/trips/<uuid:trip_id>/departures", views.HostDepartureListView.as_view(), name="host-departures"),
    path("host/trips/<uuid:trip_id>/departures/<uuid:departure_id>", views.HostDepartureDetailView.as_view(),
         name="host-departure"),
    path("host/trips/<uuid:trip_id>/departures/<uuid:departure_id>/cancel", views.HostDepartureCancelView.as_view(),
         name="host-departure-cancel"),
    # Admin
    path("admin/trips", views.AdminTripListView.as_view(), name="admin-trips"),
    path("admin/trips/<uuid:trip_id>", views.AdminTripDetailView.as_view(), name="admin-trip"),
    *[
        path(f"admin/trips/<uuid:trip_id>/{url}", views.AdminTripActionView.as_view(action_name=name),
             name=f"admin-trip-{url}")
        for url, name in ADMIN_ACTIONS.items()
    ],
]
