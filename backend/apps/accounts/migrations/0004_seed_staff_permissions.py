"""
Seed the staff permission list and give every permission to the admin role (BR-STF-01, DEC-016).

The list is copied here (not imported from models) so the migration keeps
working when the model constant changes later.
"""

from django.db import migrations

PERMISSIONS = [
    ("hosts.view", "See host accounts and their files."),
    ("hosts.approve", "Approve a host account or a document."),
    ("hosts.reject", "Reject a host account or a document."),
    ("hosts.suspend", "Suspend or ban a host account."),
    ("hosts.delete", "Soft-delete or restore a host account."),
    ("hosts.commission_override", "Set a commission rate or credit floor for one host."),
    ("kyc.view_documents", "Open identity and business documents (every view audited)."),
    ("listings.view", "See listings and trips under review."),
    ("listings.approve", "Approve a listing or trip."),
    ("listings.reject", "Reject a listing or trip."),
    ("listings.suspend", "Suspend a listing or trip."),
    ("listings.feature", "Feature a listing."),
    ("listings.delete", "Soft-delete a listing."),
    ("reviews.view", "See reviews and reports."),
    ("reviews.moderate", "Publish or hide reviews."),
    ("reviews.delete", "Remove a review."),
    ("users.view", "See users."),
    ("users.suspend", "Suspend or lift a suspension."),
    ("users.ban", "Ban a user."),
    ("users.delete", "Soft-delete or restore a user."),
    ("privacy.handle_requests", "Handle data protection requests (BR-PRV-02)."),
    ("bookings.view", "See bookings."),
    ("bookings.cancel", "Cancel a booking."),
    ("bookings.dispute", "Resolve a dispute."),
    ("bookings.refund", "Record a refund."),
    ("wallets.view", "See host wallets and the ledger."),
    ("wallets.recharge", "Record or approve a wallet top-up."),
    ("commissions.manage", "Change default commission rates."),
    ("ledger.adjust", "Record a manual wallet adjustment."),
    ("payouts.approve", "Approve payouts (dormant, DEC-019)."),
    ("onboarding.edit", "Edit and publish onboarding flows."),
    ("team.manage", "Invite, change and deactivate staff."),
    ("settings.manage", "Change platform settings."),
    ("categories.manage", "Manage categories, amenities and property types."),
    ("promotions.manage", "Manage coupons."),
    ("reports.export", "Export datasets as CSV."),
    ("reports.view", "See reports and dashboards."),
    ("audit.view", "Read the audit log."),
]


def seed(apps, schema_editor):
    """Insert every permission and grant it to the admin role (idempotent)."""
    StaffPermission = apps.get_model("accounts", "StaffPermission")
    StaffRolePermission = apps.get_model("accounts", "StaffRolePermission")
    for code, description in PERMISSIONS:
        permission, _ = StaffPermission.objects.update_or_create(code=code, defaults={"description": description})
        StaffRolePermission.objects.get_or_create(role="admin", permission=permission)


def unseed(apps, schema_editor):
    """Remove the seeded rows (reverse migration)."""
    StaffPermission = apps.get_model("accounts", "StaffPermission")
    StaffPermission.objects.filter(code__in=[code for code, _ in PERMISSIONS]).delete()


class Migration(migrations.Migration):
    """Data migration: staff permissions (BR-STF-01)."""

    dependencies = [("accounts", "0003_mfa_staff_privacy_favorites")]

    operations = [migrations.RunPython(seed, unseed)]
