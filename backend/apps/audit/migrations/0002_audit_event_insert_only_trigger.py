"""
Database guard of the audit log: rows can be inserted, never changed or removed (BR-STF-02, R9, R11).

On PostgreSQL a trigger refuses every UPDATE and DELETE on the audit table,
and a statement trigger refuses TRUNCATE, whoever the database user is (the
Python guard in ``AuditEvent.save``/``delete`` does not cover raw SQL or
``QuerySet.update``). On SQLite (development) this migration does nothing.
The database role split (app role with SELECT and INSERT only) is set up by
operations, not by migrations (R11).
"""

from django.db import migrations

FUNCTION = "audit_event_refuse_change"


def _table(apps) -> str:
    """Real table name of ``AuditEvent`` (``audit_auditevent`` by default)."""
    return apps.get_model("audit", "AuditEvent")._meta.db_table


def create_trigger(apps, schema_editor):
    """Install the insert-only triggers on PostgreSQL; no-op on other databases."""
    if schema_editor.connection.vendor != "postgresql":
        return
    table = schema_editor.quote_name(_table(apps))
    schema_editor.execute(
        f"""
        CREATE OR REPLACE FUNCTION {FUNCTION}() RETURNS trigger LANGUAGE plpgsql AS $$
        BEGIN
            RAISE EXCEPTION 'audit events are insert-only (% refused)', TG_OP
                USING ERRCODE = 'insufficient_privilege';
        END;
        $$;
        """
    )
    schema_editor.execute(f"DROP TRIGGER IF EXISTS audit_event_no_update_delete ON {table};")
    schema_editor.execute(
        f"CREATE TRIGGER audit_event_no_update_delete BEFORE UPDATE OR DELETE ON {table} "
        f"FOR EACH ROW EXECUTE FUNCTION {FUNCTION}();"
    )
    schema_editor.execute(f"DROP TRIGGER IF EXISTS audit_event_no_truncate ON {table};")
    schema_editor.execute(
        f"CREATE TRIGGER audit_event_no_truncate BEFORE TRUNCATE ON {table} "
        f"FOR EACH STATEMENT EXECUTE FUNCTION {FUNCTION}();"
    )


def drop_trigger(apps, schema_editor):
    """Remove the triggers and their function (reverse migration, PostgreSQL only)."""
    if schema_editor.connection.vendor != "postgresql":
        return
    table = schema_editor.quote_name(_table(apps))
    schema_editor.execute(f"DROP TRIGGER IF EXISTS audit_event_no_update_delete ON {table};")
    schema_editor.execute(f"DROP TRIGGER IF EXISTS audit_event_no_truncate ON {table};")
    schema_editor.execute(f"DROP FUNCTION IF EXISTS {FUNCTION}();")


class Migration(migrations.Migration):
    """PostgreSQL-only trigger, no model change."""

    dependencies = [
        ("audit", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(create_trigger, drop_trigger),
    ]
