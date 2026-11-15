"""Tests of the free-text listing search (R15, BR-SRC-01): icontains on SQLite, pg_trgm on PostgreSQL."""

import importlib

import pytest
from django.db import connections

from apps.catalog import selectors

from . import factories as f

pytestmark = pytest.mark.django_db


def ids(results) -> set:
    """Ids of a search result (queryset or list)."""
    return {listing.id for listing in results}


def test_br_src_01_text_query_matches_title_and_commune_names():
    """``q`` matches the listing title or the commune name (French or Arabic), case-insensitively; public listings only."""
    oran = f.commune(31, "Oran", "35.6971", "-0.6308")
    oran.name_ar = "وهران"
    oran.save(update_fields=["name_ar"])
    villa = f.published_home(title="Villa avec piscine")
    flat = f.published_home(title="Appartement centre", commune=oran)
    f.listing(f.approved_individual_host()[0], "home", title="Villa brouillon")  # draft, never public

    assert ids(selectors.search_listings(q="villa")) == {villa.id}
    assert ids(selectors.search_listings(q="ORAN")) == {flat.id}
    assert ids(selectors.search_listings(q="وهران")) == {flat.id}
    assert ids(selectors.search_listings(q="nothing-like-this")) == set()


def test_br_src_01_text_query_too_short_is_ignored_and_long_is_cut():
    """Fewer than two characters means no text filter; very long text is cut, not refused."""
    villa = f.published_home(title="Villa avec piscine")
    other = f.published_home(title="Studio")
    assert ids(selectors.search_listings(q=" v ")) == {villa.id, other.id}
    assert ids(selectors.search_listings(q="Villa" + "x" * 500)) == set()


def test_br_src_01_text_query_combines_with_filters():
    """The text filter is ANDed with the other filters (here the price)."""
    cheap = f.published_home(title="Villa simple", base_price_minor=500_000)
    f.published_home(title="Villa luxe", base_price_minor=5_000_000)
    assert ids(selectors.search_listings(q="villa", max_price=1_000_000)) == {cheap.id}


def test_br_src_01_postgres_uses_trigram_on_unaccented_columns(monkeypatch):
    """On PostgreSQL the query uses ``f_unaccent(column) %> f_unaccent(text)`` (GIN trigram index) and ranks by WORD_SIMILARITY."""
    pytest.importorskip("psycopg2")
    from django.db.backends.postgresql.base import DatabaseWrapper

    settings_dict = {**connections["default"].settings_dict, "ENGINE": "django.db.backends.postgresql", "NAME": "unused"}
    postgres = DatabaseWrapper(settings_dict, alias="pg_compile_only")  # never connects: SQL is only compiled
    monkeypatch.setattr(selectors, "connection", postgres)

    qs = selectors.search_listings(q="tlemcen")
    sql, params = qs.query.get_compiler(connection=postgres).as_sql()
    assert 'f_unaccent("catalog_listing"."title") %%> (f_unaccent(%s))' in sql
    assert 'f_unaccent("geo_commune"."name_ar") %%> (f_unaccent(%s))' in sql
    assert "GREATEST(WORD_SIMILARITY(" in sql and '"search_rank"' in sql
    assert "UPPER(" not in sql  # no icontains on PostgreSQL
    assert params.count("tlemcen") == 8

    sorted_by_price = selectors.search_listings(q="tlemcen", sort="price")
    order = sorted_by_price.query.get_compiler(connection=postgres).as_sql()[0].split("ORDER BY")[1]
    assert order.strip().startswith('"catalog_listing"."base_price_minor" ASC')


def test_br_src_01_search_migration_postgres_only():
    """Migration catalog.0002 creates pg_trgm, unaccent, f_unaccent and GIN trigram indexes on PostgreSQL, nothing on SQLite."""
    from django.apps import apps as registry

    migration = importlib.import_module("apps.catalog.migrations.0002_search_trigram_indexes")

    class Editor:
        """Collects SQL instead of running it."""

        def __init__(self, vendor):
            """Pretend to be connected to ``vendor``."""
            self.connection = type("Conn", (), {"vendor": vendor})()
            self.sql = []

        def quote_name(self, name):
            """Quote like PostgreSQL."""
            return f'"{name}"'

        def execute(self, sql, params=None):
            """Keep the statement."""
            self.sql.append(sql)

    sqlite = Editor("sqlite")
    migration.create_search_support(registry, sqlite)
    assert sqlite.sql == []

    postgres = Editor("postgresql")
    migration.create_search_support(registry, postgres)
    sql = "\n".join(postgres.sql)
    assert "CREATE EXTENSION IF NOT EXISTS pg_trgm" in sql and "CREATE EXTENSION IF NOT EXISTS unaccent" in sql
    assert "IMMUTABLE" in sql
    assert 'ON "catalog_listing" USING gin (f_unaccent("title") gin_trgm_ops)' in sql
    assert 'ON "geo_commune" USING gin (f_unaccent("name_fr") gin_trgm_ops)' in sql


def test_br_src_06_search_text_through_the_api(api):
    """``GET /listings?q=`` reaches the free-text filter (review R15)."""
    from apps.catalog.tests import factories as f

    f.published_home(title="Villa Tipaza bord de mer")
    f.published_home(title="Studio Oran centre")
    titles = [row["title"] for row in api.get("/api/v1/listings?q=tipaza").json()["results"]]
    assert titles == ["Villa Tipaza bord de mer"]
