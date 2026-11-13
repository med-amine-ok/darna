"""
Django admin site registration for the catalog (internal console).

The BLADUS admin app uses the ``/api/v1/admin/listings`` endpoints, which
apply the state machine and write the audit log; this console is for
support and debugging, so status is read-only here.
"""

from django.contrib import admin

from .models import (
    Amenity,
    CancellationPolicy,
    Category,
    ExperienceDetail,
    Listing,
    ListingAmenity,
    ListingPhoto,
    PropertyService,
    PropertyType,
    RoomType,
    VehicleDetail,
)


@admin.register(Category, PropertyType)
class TaxonomyAdmin(admin.ModelAdmin):
    """Categories and property types per vertical (deactivate, never delete a used row, BR-LST-04)."""

    list_display = ("vertical", "slug", "name_fr", "is_active")
    list_filter = ("vertical", "is_active")


@admin.register(Amenity)
class AmenityAdmin(admin.ModelAdmin):
    """The single amenity vocabulary."""

    list_display = ("slug", "group_code", "name_fr", "is_active")
    list_filter = ("group_code", "is_active")


@admin.register(CancellationPolicy)
class CancellationPolicyAdmin(admin.ModelAdmin):
    """Policy templates and versions (BR-CAN-01)."""

    list_display = ("code", "version", "is_current", "created_at")


class RoomTypeInline(admin.TabularInline):
    """Room types shown inside their listing."""

    model = RoomType
    extra = 0


class PhotoInline(admin.TabularInline):
    """Photos shown inside their listing."""

    model = ListingPhoto
    extra = 0


@admin.register(Listing)
class ListingAdmin(admin.ModelAdmin):
    """Browse listings. Status changes go through the API (state machine + audit), so it is read-only here."""

    list_display = ("reference", "title", "vertical", "status", "host_account", "created_at")
    list_filter = ("vertical", "status")
    search_fields = ("reference", "title")
    readonly_fields = ("reference", "status", "status_before_delete", "inventory_kind", "public_latitude",
                       "public_longitude", "submitted_at", "published_at", "deleted_at")
    inlines = [RoomTypeInline, PhotoInline]


admin.site.register(RoomType)
admin.site.register(VehicleDetail)
admin.site.register(ExperienceDetail)
admin.site.register(ListingAmenity)
admin.site.register(ListingPhoto)
admin.site.register(PropertyService)
