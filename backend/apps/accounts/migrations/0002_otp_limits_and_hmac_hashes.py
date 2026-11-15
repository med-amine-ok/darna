"""
OTP send limits index and the switch from SHA-256 to HMAC-SHA256 hashes (BR-ACC-02, R9).

Hashes written before this migration are plain SHA-256 and no longer match
:func:`apps.accounts.models.hash_secret`. They cannot be converted (the raw
tokens and codes are not stored), so the data step revokes open sessions and
voids unused one-time codes: everybody signs in again. Old send log rows stop
counting for their destination, which only relaxes limits for one day.
Pending team invitations (app hosts) also stop matching and must be sent again.
"""

from django.db import migrations, models
from django.utils import timezone


def void_sha256_hashes(apps, schema_editor):
    """Revoke sessions and void unused codes whose hash was plain SHA-256 (R9)."""
    now = timezone.now()
    SessionToken = apps.get_model("accounts", "SessionToken")
    OneTimeCode = apps.get_model("accounts", "OneTimeCode")
    SessionToken.objects.filter(revoked_at__isnull=True).update(revoked_at=now)
    OneTimeCode.objects.filter(used_at__isnull=True).update(used_at=now)


class Migration(migrations.Migration):
    """Help texts, the SMS budget index and the hash data step."""

    dependencies = [
        ("accounts", "0001_initial"),
    ]

    operations = [
        migrations.AlterField(
            model_name="otpsendlog",
            name="destination_hash",
            field=models.CharField(help_text="HMAC-SHA256 of the phone or email (R9).", max_length=64),
        ),
        migrations.AlterField(
            model_name="otpsendlog",
            name="status",
            field=models.CharField(
                default="sent", help_text="sent, failed, blocked_rate_limit or blocked_budget.", max_length=20
            ),
        ),
        migrations.AddIndex(
            model_name="otpsendlog",
            index=models.Index(fields=["channel", "created_at"], name="otpsendlog_channel_created"),
        ),
        migrations.RunPython(void_sha256_hashes, migrations.RunPython.noop),
    ]
