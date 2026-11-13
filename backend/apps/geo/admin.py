"""Django admin site registration for geography (internal console)."""

from django.contrib import admin

from .models import Commune, Daira, Wilaya


@admin.register(Wilaya)
class WilayaAdmin(admin.ModelAdmin):
    """Browse the 69 wilayas. Rows normally come from ``manage.py seed_geo``."""

    list_display = ("code", "name_fr", "name_ar", "name_en", "legacy_code_58", "source")
    search_fields = ("name_fr", "name_ar", "name_en")


@admin.register(Daira)
class DairaAdmin(admin.ModelAdmin):
    """Browse dairas (districts) by wilaya."""

    list_display = ("name_fr", "name_ar", "wilaya")
    list_filter = ("wilaya",)
    search_fields = ("name_fr", "name_ar")


@admin.register(Commune)
class CommuneAdmin(admin.ModelAdmin):
    """Browse and search communes; listings and organisations point to them."""

    list_display = ("name_fr", "name_ar", "wilaya", "daira", "postal_code")
    list_filter = ("wilaya",)
    search_fields = ("name_fr", "name_ar", "name_en", "postal_code")
    # A daira dropdown with 591 rows is slow: use a search box instead.
    autocomplete_fields = ("daira",)
