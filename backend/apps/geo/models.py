"""
Algerian geography reference tables (BR-SRC-02).

69 wilayas and 1,541 communes since the 2026 territorial law. Each row keeps
its ``source`` and ``valid_from`` so the next reform is a data update, not a
redesign. Coordinates are stored as plain latitude/longitude decimals in this
first version (PostGIS is planned once the project runs on PostgreSQL).
"""

from django.db import models


class Wilaya(models.Model):
    """An Algerian province. ``code`` is the official number (1 to 69)."""

    code = models.PositiveSmallIntegerField(primary_key=True)
    name_fr = models.CharField(max_length=80)
    name_ar = models.CharField(max_length=80)
    name_en = models.CharField(max_length=80)
    legacy_code_58 = models.PositiveSmallIntegerField(
        null=True, blank=True, help_text="Code of the parent wilaya in the old 58-wilaya system."
    )
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    source = models.CharField(max_length=64, default="manual", help_text="Dataset the row came from.")
    valid_from = models.DateField(null=True, blank=True)

    class Meta:
        """Database options: ordering, indexes and constraints of this model."""
        ordering = ["code"]

    def __str__(self) -> str:
        """Short readable label used in the Django admin and in logs."""
        return f"{self.code:02d} {self.name_fr}"

    def name_for(self, locale: str) -> str:
        """Name in the requested language (``en``, ``fr`` or ``ar``), French by default."""
        return {"en": self.name_en, "ar": self.name_ar}.get(locale, self.name_fr)


class Daira(models.Model):
    """A district, between wilaya and commune."""

    wilaya = models.ForeignKey(Wilaya, on_delete=models.PROTECT, related_name="dairas")
    name_fr = models.CharField(max_length=80)
    name_ar = models.CharField(max_length=80, blank=True)

    class Meta:
        """Database options: ordering, indexes and constraints of this model."""
        ordering = ["wilaya_id", "name_fr"]

    def __str__(self) -> str:
        """Short readable label used in the Django admin and in logs."""
        return self.name_fr


class Commune(models.Model):
    """A municipality. Every listing points to one commune; the wilaya is deduced from it."""

    wilaya = models.ForeignKey(Wilaya, on_delete=models.PROTECT, related_name="communes")
    daira = models.ForeignKey(Daira, on_delete=models.SET_NULL, null=True, blank=True, related_name="communes")
    name_fr = models.CharField(max_length=100)
    name_ar = models.CharField(max_length=100, blank=True)
    name_en = models.CharField(max_length=100, blank=True)
    postal_code = models.CharField(max_length=5, blank=True)
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    source = models.CharField(max_length=64, default="manual")
    valid_from = models.DateField(null=True, blank=True)

    class Meta:
        """Database options: ordering, indexes and constraints of this model."""
        ordering = ["wilaya_id", "name_fr"]
        indexes = [models.Index(fields=["wilaya", "name_fr"])]

    def __str__(self) -> str:
        """Short readable label used in the Django admin and in logs."""
        return f"{self.name_fr} ({self.wilaya_id:02d})"

    def name_for(self, locale: str) -> str:
        """Name in the requested language, falling back to French."""
        return {"en": self.name_en or self.name_fr, "ar": self.name_ar or self.name_fr}.get(locale, self.name_fr)
