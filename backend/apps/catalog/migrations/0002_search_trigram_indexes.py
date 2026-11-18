"""
Free-text search support on PostgreSQL (R15, BR-SRC-01).

PostgreSQL full-text search has no Arabic stemmer, so the search uses pg_trgm
trigram word similarity plus unaccent for French. This migration, on
PostgreSQL only:

- creates the extensions ``pg_trgm`` and ``unaccent`` (needs a role allowed to
  create extensions, run by the migration role, R11);
- creates ``f_unaccent(text)``, an IMMUTABLE wrapper of ``unaccent`` (the
  extension function is only STABLE, which an index expression refuses);
- creates GIN trigram indexes on ``f_unaccent(title)`` of listings and on
  ``f_unaccent(name_fr | name_ar | name_en)`` of geo communes, the exact
  expressions used by ``apps.catalog.selectors._filter_text``.

The commune indexes live here, not in the geo app, because only the catalog
search uses them. On SQLite this migration does nothing.
"""

from django.db import migrations


def _run(schema_editor, sql: str) -> None:
    """Run raw SQL as written: params=None keeps PostgreSQL's own % placeholders (RAISE EXCEPTION '... %')."""
    schema_editor.execute(sql, params=None)

# (index name, app label, model name, column)
INDEXES = [
    ("catalog_listing_title_trgm", "catalog", "Listing", "title"),
    ("geo_commune_name_fr_trgm", "geo", "Commune", "name_fr"),
    ("geo_commune_name_ar_trgm", "geo", "Commune", "name_ar"),
    ("geo_commune_name_en_trgm", "geo", "Commune", "name_en"),
]


def create_search_support(apps, schema_editor):
    """Create the extensions, ``f_unaccent`` and the trigram indexes (PostgreSQL only)."""
    if schema_editor.connection.vendor != "postgresql":
        return
    _run(schema_editor, "CREATE EXTENSION IF NOT EXISTS pg_trgm;")
    _run(schema_editor, "CREATE EXTENSION IF NOT EXISTS unaccent;")
    _run(schema_editor, 
        """
        CREATE OR REPLACE FUNCTION f_unaccent(text) RETURNS text
        LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT
        AS $$ SELECT public.unaccent('public.unaccent'::regdictionary, $1) $$;
        """
    )
    for index_name, app_label, model_name, column in INDEXES:
        table = apps.get_model(app_label, model_name)._meta.db_table
        _run(schema_editor, 
            f"CREATE INDEX IF NOT EXISTS {schema_editor.quote_name(index_name)} "
            f"ON {schema_editor.quote_name(table)} USING gin (f_unaccent({schema_editor.quote_name(column)}) gin_trgm_ops);"
        )


def drop_search_support(apps, schema_editor):
    """Drop the indexes and ``f_unaccent``; the extensions stay (other code may use them)."""
    if schema_editor.connection.vendor != "postgresql":
        return
    for index_name, *_ in INDEXES:
        _run(schema_editor, f"DROP INDEX IF EXISTS {schema_editor.quote_name(index_name)};")
    _run(schema_editor, "DROP FUNCTION IF EXISTS f_unaccent(text);")


class Migration(migrations.Migration):
    """PostgreSQL-only search indexes, no model change."""

    dependencies = [
        ("catalog", "0001_initial"),
        ("geo", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(create_search_support, drop_search_support),
    ]
