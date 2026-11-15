"""
Datasets of the admin CSV exports and the formula-safe CSV writer (BR-STF-04).

``audit`` sits low in the app layers (07-architecture section 2) and may not
import the apps whose tables it exports. Each dataset therefore names its
model by label (``"bookings.Booking"``) and is resolved at run time with
``django.apps.apps.get_model``; a dataset whose app or model is not built yet
answers 422 ``dataset_not_available``. Columns that do not exist on the model
(yet) are skipped, so an export never fails because another app renamed a
column; the header row always says which columns were written.
"""

import csv
import io
import json
from dataclasses import dataclass, field
from datetime import date, datetime
from decimal import Decimal
from pathlib import Path
from uuid import UUID

from django.apps import apps
from django.conf import settings
from django.core.exceptions import FieldDoesNotExist
from django.db import models

# BR-STF-04: a cell starting with one of these is prefixed with a quote, so a
# spreadsheet never runs it as a formula.
FORMULA_PREFIXES = ("=", "+", "-", "@", "\t", "\r")


@dataclass(frozen=True)
class Dataset:
    """
    One exportable table.

    ``columns`` are ORM lookups (``"organization__display_name"``);
    ``filters`` map the filter names a client may send to ORM lookups (exact
    match); ``date_field`` is used by the ``created_from`` / ``created_to``
    filters (ISO dates, inclusive).
    """

    model: str
    columns: tuple[str, ...]
    filters: dict[str, str] = field(default_factory=dict)
    date_field: str = "created_at"
    order_by: str = "-pk"


DATASETS: dict[str, Dataset | None] = {
    "hosts": Dataset(
        "hosts.HostAccount",
        ("id", "kind", "organization__business_category", "organization__display_name", "verification_status",
         "default_approval_mode", "commission_rate_override_bp", "credit_limit_override_minor", "rating_avg",
         "review_count", "submitted_at", "approved_at", "created_at", "deleted_at"),
        {"verification_status": "verification_status", "kind": "kind",
         "business_category": "organization__business_category"},
    ),
    "listings": Dataset(
        "catalog.Listing",
        ("id", "reference", "host_account_id", "vertical", "status", "title", "commune_id", "currency",
         "base_price_minor", "approval_mode", "rating_avg", "review_count", "submitted_at", "published_at",
         "created_at", "deleted_at"),
        {"status": "status", "vertical": "vertical", "host_account_id": "host_account_id"},
    ),
    "trips": Dataset(
        "trips.Trip",
        ("id", "reference", "host_account_id", "status", "title", "duration_days", "currency",
         "price_per_person_minor", "rating_avg", "review_count", "submitted_at", "published_at", "created_at",
         "deleted_at"),
        {"status": "status", "host_account_id": "host_account_id"},
    ),
    "bookings": Dataset(
        "bookings.Booking",
        ("id", "reference", "host_account_id", "guest_id", "inventory_kind", "listing_id", "check_in", "check_out",
         "guests", "units", "status", "payment_status", "currency", "total_minor", "commission_rate_bp",
         "commission_minor", "confirmed_at", "cancelled_at", "completed_at", "created_at"),
        {"status": "status", "host_account_id": "host_account_id", "inventory_kind": "inventory_kind",
         "payment_status": "payment_status"},
    ),
    "users": Dataset(
        "accounts.User",
        ("id", "email", "phone_e164", "status", "is_staff", "preferred_locale", "email_verified_at",
         "phone_verified_at", "date_joined"),
        {"status": "status", "is_staff": "is_staff"},
        date_field="date_joined",
    ),
    "reviews": Dataset(
        "reviews.Review",
        ("id", "booking_id", "listing_id", "trip_id", "author_id", "host_account_id", "rating", "status",
         "published_at", "created_at"),
        {"status": "status", "host_account_id": "host_account_id"},
    ),
    "wallets": Dataset(
        "ledger.AccountBalance",
        ("account__host_account_id", "account__code", "account__kind", "account__currency", "balance_minor",
         "updated_at"),
        {"kind": "account__kind", "host_account_id": "account__host_account_id"},
        date_field="updated_at",
    ),
    "ledger": Dataset(
        "ledger.LedgerEntry",
        ("id", "transaction_id", "transaction__kind", "transaction__occurred_at", "account__code",
         "account__host_account_id", "amount_minor", "currency"),
        {"kind": "transaction__kind", "host_account_id": "account__host_account_id"},
        date_field="transaction__occurred_at",
    ),
    "topups": Dataset(
        "ledger.WalletTopup",
        ("id", "host_account_id", "method", "amount_minor", "currency", "receipt_reference", "status",
         "requested_by_id", "approved_by_id", "approved_at", "created_at"),
        {"status": "status", "host_account_id": "host_account_id"},
    ),
    "refunds": Dataset(
        "bookings.RefundObligation",
        ("id", "booking_id", "host_account_id", "guest_id", "amount_minor", "currency", "status", "due_at",
         "declared_at", "settled_at", "created_at"),
        {"status": "status", "host_account_id": "host_account_id"},
    ),
    "audit": Dataset(
        "audit.AuditEvent",
        ("id", "occurred_at", "actor_id", "actor_kind", "action", "object_type", "object_id", "before", "after",
         "note", "ip"),
        {"action": "action", "object_type": "object_type", "object_id": "object_id", "actor_kind": "actor_kind"},
        date_field="occurred_at",
    ),
    # KPI report: computed by the analytics app, not a table; not exportable here yet.
    "kpi": None,
}
DATE_FILTERS = ("created_from", "created_to")


def export_dir() -> Path:
    """
    Private folder of the export files (never served by the web server).

    ``settings.EXPORTS_ROOT`` when set, else ``<BASE_DIR>/var/exports`` for
    development; created on first use.
    """
    root = Path(getattr(settings, "EXPORTS_ROOT", "") or Path(settings.BASE_DIR) / "var" / "exports")
    root.mkdir(parents=True, exist_ok=True)
    return root


def resolve_model(dataset: Dataset) -> type[models.Model] | None:
    """The model of a dataset, or ``None`` when its app or model does not exist (yet)."""
    try:
        return apps.get_model(dataset.model)
    except (LookupError, ValueError):
        return None


def lookup_exists(model: type[models.Model], lookup: str) -> bool:
    """True when ``lookup`` (``a__b__c``) follows existing fields of ``model``."""
    current = model
    parts = lookup.split("__")
    for index, part in enumerate(parts):
        try:
            model_field = current._meta.get_field(part)
        except FieldDoesNotExist:
            return False
        if index < len(parts) - 1:
            current = getattr(model_field, "related_model", None)
            if current is None:
                return False
    return True


def safe_cell(value) -> str:
    """
    One CSV cell as text, formula-safe (BR-STF-04).

    ``None`` is empty, dates are ISO 8601, JSON values are compact JSON.
    Text starting with ``= + - @ TAB CR`` gets a leading ``'``. Numbers stay
    numbers (a negative amount is data, not a formula).
    """
    if value is None:
        return ""
    if isinstance(value, bool):
        return "true" if value else "false"
    if isinstance(value, (int, float, Decimal)):
        return str(value)
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    if isinstance(value, UUID):
        return str(value)
    if isinstance(value, (dict, list)):
        value = json.dumps(value, ensure_ascii=False, sort_keys=True, default=str)
    text = str(value)
    return "'" + text if text.startswith(FORMULA_PREFIXES) else text


def write_csv(rows, columns: list[str]) -> bytes:
    """Build the CSV file (UTF-8 with BOM so spreadsheets read Arabic and French letters)."""
    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(columns)
    for row in rows:
        writer.writerow([safe_cell(cell) for cell in row])
    return ("\ufeff" + buffer.getvalue()).encode("utf-8")
