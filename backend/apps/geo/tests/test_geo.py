"""Tests of the geography endpoints and of the ``seed_geo`` command (BR-SRC-02)."""

from io import StringIO

import pytest
from django.core.management import call_command

from apps.geo.models import Commune, Daira, Wilaya

pytestmark = pytest.mark.django_db


@pytest.fixture
def geo():
    """Two wilayas and three communes, enough for the endpoint tests."""
    oran = Wilaya.objects.create(code=31, name_fr="Oran", name_ar="وهران", name_en="Oran")
    alger = Wilaya.objects.create(code=16, name_fr="Alger", name_ar="الجزائر", name_en="Algiers")
    Commune.objects.create(wilaya=oran, name_fr="Oran", name_ar="وهران", name_en="Oran", postal_code="31000")
    Commune.objects.create(wilaya=oran, name_fr="Bir El Djir", name_ar="بئر الجير")
    Commune.objects.create(wilaya=alger, name_fr="Bordj El Kiffan", name_ar="برج الكيفان")
    return {"oran": oran, "alger": alger}


def test_br_src_02_seed_geo_loads_69_wilayas_and_1541_communes():
    """The bundled dataset has the 69 wilayas and 1,541 communes of the 2026 map."""
    out = StringIO()
    call_command("seed_geo", stdout=out)
    assert Wilaya.objects.count() == 69
    assert Commune.objects.count() == 1541
    assert Daira.objects.count() == 591
    assert "Wilayas: 69" in out.getvalue() and "Communes: 1541" in out.getvalue()
    assert not Commune.objects.filter(name_fr="").exists()
    assert Wilaya.objects.get(code=16).name_fr == "Alger"
    # Old wilayas keep their code as legacy code; the 11 new ones have none (not in the source).
    assert Wilaya.objects.get(code=58).legacy_code_58 == 58
    assert Wilaya.objects.get(code=69).legacy_code_58 is None


def test_seed_geo_is_idempotent():
    """Running the command twice changes no count and repairs an edited row."""
    call_command("seed_geo", stdout=StringIO())
    Wilaya.objects.filter(code=31).update(name_fr="Wrong")
    out = StringIO()
    call_command("seed_geo", stdout=out)
    assert (Wilaya.objects.count(), Daira.objects.count(), Commune.objects.count()) == (69, 591, 1541)
    assert Wilaya.objects.get(code=31).name_fr == "Oran"
    assert "(0 new)" in out.getvalue()


def test_wilayas_are_public_and_not_paginated(api, geo):
    """Anyone can read the list; it is a plain ``results`` array ordered by code."""
    res = api.get("/api/v1/geo/wilayas")
    assert res.status_code == 200
    assert [w["code"] for w in res.data["results"]] == [16, 31]
    assert "count" not in res.data
    assert res.data["results"][0]["name"] == "Alger"  # French by default


def test_wilaya_name_follows_accept_language(api, geo):
    """``name`` is in the language asked with Accept-Language."""
    arabic = api.get("/api/v1/geo/wilayas", HTTP_ACCEPT_LANGUAGE="ar").data["results"][0]
    english = api.get("/api/v1/geo/wilayas", HTTP_ACCEPT_LANGUAGE="en").data["results"][0]
    assert arabic["name"] == "الجزائر" and english["name"] == "Algiers"


def test_communes_of_a_wilaya(api, geo):
    """Only the communes of the asked wilaya, by French name; unknown code is 404."""
    res = api.get("/api/v1/geo/wilayas/31/communes")
    assert res.status_code == 200
    assert [c["name_fr"] for c in res.data["results"]] == ["Bir El Djir", "Oran"]
    assert res.data["results"][1]["wilaya_code"] == 31 and res.data["results"][1]["wilaya_name"] == "Oran"
    missing = api.get("/api/v1/geo/wilayas/99/communes")
    assert missing.status_code == 404 and missing.data["code"] == "wilaya_not_found"


def test_commune_autocomplete(api, geo):
    """Names starting with the text come first; Arabic works; short queries return nothing."""
    res = api.get("/api/v1/geo/communes", {"q": "or"})
    assert [c["name_fr"] for c in res.data["results"]] == ["Oran", "Bordj El Kiffan"]
    assert api.get("/api/v1/geo/communes", {"q": "وهر"}).data["results"][0]["name_fr"] == "Oran"
    assert api.get("/api/v1/geo/communes", {"q": "o"}).data["results"] == []
    only_alger = api.get("/api/v1/geo/communes", {"q": "or", "wilaya": 16}).data["results"]
    assert [c["name_fr"] for c in only_alger] == ["Bordj El Kiffan"]
    assert api.get("/api/v1/geo/communes", {"q": "or", "limit": "x"}).status_code == 400


def test_commune_autocomplete_never_returns_more_than_20(api, geo):
    """The cap of 20 holds even when the client asks for more."""
    for n in range(30):
        Commune.objects.create(wilaya=geo["oran"], name_fr=f"Test commune {n:02d}")
    res = api.get("/api/v1/geo/communes", {"q": "test", "limit": 500})
    assert len(res.data["results"]) == 20
