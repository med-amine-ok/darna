"""Django console pages of the pricing app (read only: quotes are written by the server alone, BR-PRC-01)."""

from django.contrib import admin

from .models import Quote


@admin.register(Quote)
class QuoteAdmin(admin.ModelAdmin):
    """Read-only list of quotes, to help support explain a price."""

    list_display = ("id", "listing", "trip_departure", "check_in", "check_out", "guests", "total_minor", "expires_at")
    list_filter = ("currency",)
    search_fields = ("id",)
    readonly_fields = [f.name for f in Quote._meta.fields]

    def has_add_permission(self, request) -> bool:
        """Quotes are only created by the API."""
        return False

    def has_change_permission(self, request, obj=None) -> bool:
        """A quote is never edited."""
        return False
