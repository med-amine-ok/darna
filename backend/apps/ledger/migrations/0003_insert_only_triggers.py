"""
PostgreSQL triggers that make the ledger insert-only at the database level (review R11).

The Python models already refuse ``save()`` on an existing row and
``delete()``, but a raw SQL statement or a bug could still change a line.
These triggers refuse every UPDATE and DELETE on the two ledger tables.
Together with the role split (tables owned by ``bladus_migrator``, the app
connects as ``bladus_app`` with SELECT and INSERT only, see
docs/backend/08-security-privacy.md) the history cannot be rewritten.
SQLite (developer laptops) has no such triggers: nothing is done there.
"""

from django.db import migrations

TABLES = ("ledger_ledgertransaction", "ledger_ledgerentry")

CREATE_FUNCTION = """
CREATE OR REPLACE FUNCTION bladus_refuse_change() RETURNS trigger AS $$
BEGIN
    RAISE EXCEPTION 'table % is insert-only', TG_TABLE_NAME USING ERRCODE = 'insufficient_privilege';
END;
$$ LANGUAGE plpgsql;
"""


def create_triggers(apps, schema_editor):
    """Install the insert-only triggers on PostgreSQL; do nothing elsewhere."""
    if schema_editor.connection.vendor != "postgresql":
        return
    schema_editor.execute(CREATE_FUNCTION)
    for table in TABLES:
        schema_editor.execute(
            f"CREATE TRIGGER {table}_insert_only BEFORE UPDATE OR DELETE ON {table} "
            f"FOR EACH ROW EXECUTE FUNCTION bladus_refuse_change();"
        )


def drop_triggers(apps, schema_editor):
    """Remove the triggers (the shared function stays, other apps may use it)."""
    if schema_editor.connection.vendor != "postgresql":
        return
    for table in TABLES:
        schema_editor.execute(f"DROP TRIGGER IF EXISTS {table}_insert_only ON {table};")


class Migration(migrations.Migration):
    """Insert-only triggers on the ledger tables (PostgreSQL only)."""

    dependencies = [("ledger", "0002_alter_ledgeraccount_kind_and_more")]

    operations = [migrations.RunPython(create_triggers, drop_triggers)]
