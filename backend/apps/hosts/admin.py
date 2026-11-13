"""
Django admin site registration for hosts (internal console, read-mostly).

Status changes, document reviews and team changes must go through the API
(``/api/v1/admin/...`` and ``/api/v1/host/...``) so that the business rules
run and an audit row is written; the console is for browsing and support.
"""

from django.contrib import admin

from .models import HostAccount, HostDocument, Invitation, Membership, Organization, PropertyIntegration


class MembershipInline(admin.TabularInline):
    """Team of an organisation, shown on the organisation page (read only)."""

    model = Membership
    extra = 0
    fields = ("user", "role", "is_active", "joined_at", "removed_at")
    readonly_fields = fields
    can_delete = False


@admin.register(Organization)
class OrganizationAdmin(admin.ModelAdmin):
    """Browse organisations and their teams."""

    list_display = ("display_name", "business_category", "slug", "created_at", "deleted_at")
    list_filter = ("business_category",)
    search_fields = ("display_name", "legal_name", "slug", "rc_number", "nif")
    readonly_fields = ("business_category", "slug", "created_by", "created_at")  # BR-ORG-02
    inlines = [MembershipInline]


@admin.register(HostAccount)
class HostAccountAdmin(admin.ModelAdmin):
    """Browse host accounts. The verification status is read only here (use the admin API, BR-HST-04)."""

    list_display = ("__str__", "kind", "verification_status", "commission_rate_override_bp", "submitted_at")
    list_filter = ("kind", "verification_status")
    readonly_fields = ("kind", "user", "organization", "verification_status", "submitted_at", "approved_at")


@admin.register(Membership)
class MembershipAdmin(admin.ModelAdmin):
    """Browse team memberships; changes go through the team API so they are audited."""

    list_display = ("user", "organization", "role", "is_active", "joined_at")
    list_filter = ("role", "is_active")
    readonly_fields = ("organization", "user", "role", "is_active", "joined_at", "removed_at")


@admin.register(Invitation)
class InvitationAdmin(admin.ModelAdmin):
    """Browse invitations. The token hash is hidden: it is useless to people and sensitive."""

    list_display = ("organization", "email", "phone_e164", "role", "status", "expires_at")
    list_filter = ("status", "role")
    exclude = ("token_hash",)


@admin.register(HostDocument)
class HostDocumentAdmin(admin.ModelAdmin):
    """Browse verification documents; reviews go through the admin API (BR-HST-03)."""

    list_display = ("host_account", "doc_type", "status", "created_at", "reviewed_at")
    list_filter = ("doc_type", "status")
    readonly_fields = ("status", "reviewed_by", "reviewed_at", "rejection_reason")


@admin.register(PropertyIntegration)
class PropertyIntegrationAdmin(admin.ModelAdmin):
    """Browse hotel system connections (DEC-017). Stored credentials are never displayed."""

    list_display = ("organization", "kind", "system_name", "status", "last_synced_at")
    list_filter = ("kind", "status")
    exclude = ("credentials_encrypted",)
