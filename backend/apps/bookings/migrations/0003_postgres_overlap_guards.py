"""
Database guards against double booking on PostgreSQL (BR-AVL-01, review R2).

What the database guarantees, by inventory kind:
- single unit (home, vehicle): the exclusion constraint ``booking_no_overlap``
  refuses two bookings of the same listing whose ``[check_in, check_out)``
  ranges overlap while both hold the dates (pending, confirmed, completed);
- blocked days: two triggers. One refuses blocking a day inside such a
  booking; the other refuses creating (or moving into a holding status) a
  booking that covers a blocked day;
- room pools, experience slots and trip departures are NOT covered here: they
  rely on the counter CHECK constraints (``held + booked <= total``) and on
  one conditional UPDATE per reservation (see apps.inventory and apps.trips).

The same rules run in the services under a lock on the listing row, so
SQLite (developer laptops) behaves the same; these statements are skipped there.
"""

from django.db import migrations

HOLDING = "('pending', 'confirmed', 'completed')"

FORWARD = [
    "CREATE EXTENSION IF NOT EXISTS btree_gist;",
    f"""
    ALTER TABLE bookings_booking ADD CONSTRAINT booking_no_overlap
    EXCLUDE USING gist (listing_id WITH =, daterange(check_in, check_out, '[)') WITH &&)
    WHERE (inventory_kind = 'single' AND status IN {HOLDING});
    """,
    f"""
    CREATE OR REPLACE FUNCTION bladus_refuse_block_on_booked_day() RETURNS trigger AS $$
    BEGIN
        IF NEW.is_blocked AND EXISTS (
            SELECT 1 FROM bookings_booking b
            WHERE b.listing_id = NEW.listing_id AND b.inventory_kind = 'single'
              AND b.status IN {HOLDING}
              AND b.check_in <= NEW.day AND NEW.day < b.check_out
        ) THEN
            RAISE EXCEPTION 'day % of listing % is booked', NEW.day, NEW.listing_id USING ERRCODE = 'exclusion_violation';
        END IF;
        RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
    """,
    """
    CREATE TRIGGER listing_day_block_guard BEFORE INSERT OR UPDATE OF is_blocked ON inventory_listingday
    FOR EACH ROW EXECUTE FUNCTION bladus_refuse_block_on_booked_day();
    """,
    f"""
    CREATE OR REPLACE FUNCTION bladus_refuse_booking_on_blocked_day() RETURNS trigger AS $$
    BEGIN
        IF NEW.inventory_kind = 'single' AND NEW.status IN {HOLDING} AND EXISTS (
            SELECT 1 FROM inventory_listingday d
            WHERE d.listing_id = NEW.listing_id AND d.is_blocked
              AND d.day >= NEW.check_in AND d.day < NEW.check_out
        ) THEN
            RAISE EXCEPTION 'booking covers a blocked day of listing %', NEW.listing_id USING ERRCODE = 'exclusion_violation';
        END IF;
        RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
    """,
    # Fires on insert and when dates or status change; moving a booking out of
    # a holding status (cancel, decline) never needs the check.
    """
    CREATE TRIGGER booking_blocked_day_guard BEFORE INSERT OR UPDATE OF status, check_in, check_out, listing_id
    ON bookings_booking FOR EACH ROW EXECUTE FUNCTION bladus_refuse_booking_on_blocked_day();
    """,
]

BACKWARD = [
    "DROP TRIGGER IF EXISTS booking_blocked_day_guard ON bookings_booking;",
    "DROP FUNCTION IF EXISTS bladus_refuse_booking_on_blocked_day();",
    "DROP TRIGGER IF EXISTS listing_day_block_guard ON inventory_listingday;",
    "DROP FUNCTION IF EXISTS bladus_refuse_block_on_booked_day();",
    "ALTER TABLE bookings_booking DROP CONSTRAINT IF EXISTS booking_no_overlap;",
]


def forward(apps, schema_editor):
    """Install the guards on PostgreSQL only."""
    if schema_editor.connection.vendor != "postgresql":
        return
    for statement in FORWARD:
        schema_editor.execute(statement)


def backward(apps, schema_editor):
    """Remove the guards on PostgreSQL only."""
    if schema_editor.connection.vendor != "postgresql":
        return
    for statement in BACKWARD:
        schema_editor.execute(statement)


class Migration(migrations.Migration):
    """Exclusion constraint and blocked-day triggers (PostgreSQL only)."""

    dependencies = [
        ("bookings", "0002_booking_check_in_code_booking_stay_confirmed_at_and_more"),
        ("inventory", "0002_inventoryconflict"),
    ]

    operations = [migrations.RunPython(forward, backward)]
