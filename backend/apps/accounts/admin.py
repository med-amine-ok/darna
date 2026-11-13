"""Django admin site registration for accounts (internal console, read-mostly)."""

from django.contrib import admin

from .models import ConsentRecord, SessionToken, StaffProfile, User


@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    """Browse and search users. Passwords are never shown or edited here."""

    list_display = ("email", "phone_e164", "status", "is_staff", "date_joined")
    list_filter = ("status", "is_staff")
    search_fields = ("email", "phone_e164", "first_name_latin", "last_name_latin")
    exclude = ("password",)
    readonly_fields = ("date_joined", "last_login")


@admin.register(StaffProfile)
class StaffProfileAdmin(admin.ModelAdmin):
    """Who is BLADUS staff."""

    list_display = ("user", "role", "status")


@admin.register(SessionToken)
class SessionTokenAdmin(admin.ModelAdmin):
    """Open sessions; revoke one by setting ``revoked_at``."""

    list_display = ("user", "created_at", "expires_at", "revoked_at", "ip")
    exclude = ("token_hash",)


admin.site.register(ConsentRecord)
