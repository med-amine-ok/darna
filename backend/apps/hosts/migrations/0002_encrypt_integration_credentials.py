"""
Encrypt the hotel system credentials written by the former placeholder (DEC-017, R9).

Rows whose ``credentials_encrypted`` starts with the placeholder prefix held
plain text; they are rewritten with Fernet under the first key of
``settings.INTEGRATION_KEYS``. Going back leaves the encrypted rows as they are.
"""

from django.db import migrations


def encrypt_placeholder_rows(apps, schema_editor):
    """Re-encrypt every placeholder credential with :func:`apps.hosts.crypto.rotate_secret`."""
    from apps.hosts.crypto import PLACEHOLDER_PREFIX, rotate_secret

    PropertyIntegration = apps.get_model("hosts", "PropertyIntegration")
    for row in PropertyIntegration.objects.exclude(credentials_encrypted__isnull=True).only("pk", "credentials_encrypted"):
        if bytes(row.credentials_encrypted).startswith(PLACEHOLDER_PREFIX):
            PropertyIntegration.objects.filter(pk=row.pk).update(credentials_encrypted=rotate_secret(row.credentials_encrypted))


class Migration(migrations.Migration):
    """Data migration only: no schema change."""

    dependencies = [
        ("hosts", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(encrypt_placeholder_rows, migrations.RunPython.noop),
    ]
