"""
Admin analytics: KPIs with the previous period and chart series (RPT-01, RPT-02, BR-RPT-01, BR-SRC-04).

Rules (BR-RPT-01):
- windows are real calendar days in Africa/Algiers, ending today;
- gross booking value = sum of ``total_minor`` of confirmed and completed
  bookings, by check-in date; revenue = net commission (``commission_minor``
  of the same bookings: cancelled bookings, whose commission was reversed,
  are not counted);
- money is integer centimes, never a float (BR-PAY-01).

Every figure is one aggregate query (or one bounded list), so the cost does
not grow with the number of pages viewed. Bookings are read through
``bookings.selectors.admin_bookings``, listings through
``catalog.selectors.admin_listings``.
"""

from dataclasses import dataclass
from datetime import date, datetime, time, timedelta

from django.contrib.auth import get_user_model
from django.db.models import Case, CharField, Count, F, Q, QuerySet, Sum, Value, When
from django.db.models.functions import Coalesce, TruncMonth

from apps.bookings import selectors as booking_selectors
from apps.bookings.models import ApprovalModeApplied, BookingStatus, InventoryKind
from apps.catalog import selectors as catalog_selectors
from apps.catalog.states import ListingStatus
from apps.core.errors import DomainError
from apps.core.timeutils import business_datetime, business_today
from apps.geo.models import Wilaya
from apps.hosts.models import HOST_ALLOWED_OFFERS

PERIOD_DAYS = {"7d": 7, "30d": 30, "90d": 90, "1y": 365}
# Longest custom window, to keep the queries bounded.
MAX_CUSTOM_DAYS = 731
# Bookings that count as sold (BR-RPT-01).
SOLD = (BookingStatus.CONFIRMED, BookingStatus.COMPLETED)
STAY_VERTICALS = {"home", "hotel", "hostel"}
HOST_TYPES = ("individual", "agency", "hotel", "hostel")
# Columns of the host type by vertical cross tab; trips are not a vertical but are sold too (DEC-006).
OFFER_COLUMNS = ("home", "hotel", "hostel", "experience", "vehicle", "trip")
# Most request bookings read to average the host response time.
RESPONSE_SAMPLE = 5000


@dataclass
class Window:
    """A reporting window and the one just before it, same length (BR-RPT-01)."""

    start: date
    end: date
    previous_start: date
    previous_end: date


@dataclass
class Filters:
    """Optional filters of the analytics endpoints."""

    host_types: list[str]
    verticals: list[str]
    wilayas: list[int]
    group_stays: bool = False


def window(period: str | None, start: date | None, end: date | None) -> Window:
    """
    Turn ``period`` (7d, 30d, 90d, 1y, custom; default 30d) into dates ending today in Algeria.

    ``custom`` needs ``from`` and ``to`` (``to`` not before ``from``, at most
    731 days). Raises 400 ``invalid`` otherwise.
    """
    period = period or "30d"
    if period == "custom":
        if not start or not end:
            raise DomainError("Send from and to for a custom period.", code="invalid",
                              errors={"from": ["Required for a custom period."]})
        if end < start or (end - start).days >= MAX_CUSTOM_DAYS:
            raise DomainError("Invalid custom period.", code="invalid",
                              errors={"to": [f"Must be after from, at most {MAX_CUSTOM_DAYS} days."]})
    elif period in PERIOD_DAYS:
        end = business_today()
        start = end - timedelta(days=PERIOD_DAYS[period] - 1)
    else:
        raise DomainError("Unknown period.", code="invalid", errors={"period": ["7d, 30d, 90d, 1y or custom."]})
    length = (end - start).days + 1
    previous_end = start - timedelta(days=1)
    return Window(start, end, previous_end - timedelta(days=length - 1), previous_end)


def _instants(start: date, end: date) -> tuple[datetime, datetime]:
    """Half-open ``[start 00:00, end+1 00:00)`` in Algiers time, for timestamp columns."""
    return business_datetime(start, time.min), business_datetime(end + timedelta(days=1), time.min)


def _host_type_expr():
    """SQL: host type of the booking's host account (individual, agency, hotel, hostel)."""
    return Case(
        When(host_account__organization__isnull=True, then=Value("individual")),
        default=F("host_account__organization__business_category"), output_field=CharField(),
    )


def _offer_expr():
    """SQL: what was sold, the listing vertical or ``trip`` for a trip departure."""
    return Case(
        When(inventory_kind=InventoryKind.DEPARTURE, then=Value("trip")),
        default=F("listing__vertical"), output_field=CharField(),
    )


def bookings(filters: Filters) -> QuerySet:
    """Admin bookings annotated with host type, offer and wilaya, with the filters applied."""
    qs = booking_selectors.admin_bookings().order_by().annotate(
        host_type=_host_type_expr(), offer=_offer_expr(),
        wilaya=Coalesce("listing__commune__wilaya_id", "trip_departure__trip__start_commune__wilaya_id"),
    )
    if filters.host_types:
        qs = qs.filter(host_type__in=filters.host_types)
    if filters.verticals:
        qs = qs.filter(offer__in=filters.verticals)
    if filters.wilayas:
        qs = qs.filter(wilaya__in=filters.wilayas)
    return qs


def _sold(filters: Filters, start: date, end: date) -> QuerySet:
    """Confirmed and completed bookings by check-in date in ``[start, end]``."""
    return bookings(filters).filter(status__in=SOLD, check_in__gte=start, check_in__lte=end)


def _period_figures(filters: Filters, start: date, end: date) -> dict:
    """Every period KPI of one window, in four queries."""
    sold = _sold(filters, start, end).aggregate(
        gbv=Sum("total_minor"), commission=Sum("commission_minor"), hosts=Count("host_account", distinct=True)
    )
    t0, t1 = _instants(start, end)
    created = bookings(filters).filter(created_at__gte=t0, created_at__lt=t1).aggregate(
        n=Count("id"), cancelled=Count("id", filter=Q(status=BookingStatus.CANCELLED))
    )
    new_users = get_user_model().objects.filter(date_joined__gte=t0, date_joined__lt=t1, deleted_at__isnull=True).count()
    answered = list(
        bookings(filters).filter(
            approval_mode_applied=ApprovalModeApplied.REQUEST, created_at__gte=t0, created_at__lt=t1,
            confirmed_at__isnull=False,
        ).values_list("created_at", "confirmed_at")[:RESPONSE_SAMPLE]
    )
    response = (
        round(sum((c - s).total_seconds() for s, c in answered) / len(answered) / 60) if answered else None
    )
    return {
        "bookings": created["n"],
        "gross_booking_value": sold["gbv"] or 0,
        "commission_net": sold["commission"] or 0,
        "active_hosts": sold["hosts"],
        "new_users": new_users,
        "cancellation_rate_bp": (created["cancelled"] * 10_000 // created["n"]) if created["n"] else 0,
        "response_time_minutes": response,
    }


def _active_listings(filters: Filters) -> int:
    """Published listings now (a snapshot, so it has no previous value)."""
    qs = catalog_selectors.admin_listings(status=ListingStatus.PUBLISHED).order_by()
    if filters.host_types:
        individual = "individual" in filters.host_types
        orgs = [t for t in filters.host_types if t != "individual"]
        qs = qs.filter(
            Q(host_account__organization__business_category__in=orgs)
            | (Q(host_account__organization__isnull=True) if individual else Q(pk__in=[]))
        )
    if filters.verticals:
        qs = qs.filter(vertical__in=filters.verticals)
    if filters.wilayas:
        qs = qs.filter(commune__wilaya_id__in=filters.wilayas)
    return qs.count()


def _change_bp(value, previous) -> int | None:
    """Change from ``previous`` to ``value`` in basis points; ``None`` when there is nothing to compare."""
    if value is None or not previous:
        return None
    return round((value - previous) * 10_000 / previous)


MONEY_KEYS = {"gross_booking_value", "commission_net"}
KPI_ORDER = ("bookings", "gross_booking_value", "commission_net", "active_listings", "active_hosts",
             "new_users", "cancellation_rate_bp", "response_time_minutes")


def kpi_report(win: Window, filters: Filters) -> dict:
    """``KpiReport``: each KPI with its previous-period value and the change in basis points."""
    now = _period_figures(filters, win.start, win.end)
    before = _period_figures(filters, win.previous_start, win.previous_end)
    now["active_listings"], before["active_listings"] = _active_listings(filters), None
    metrics = []
    for key in KPI_ORDER:
        value, previous = now[key], before[key]
        metrics.append({
            "key": key,
            "value": value if value is not None else 0,
            "previous": previous,
            "change_bp": _change_bp(value, previous),
            "money": {"amount_minor": value, "currency": "DZD"} if key in MONEY_KEYS else None,
        })
    return {"from": win.start, "to": win.end, "previous_from": win.previous_start, "previous_to": win.previous_end,
            "metrics": metrics}


def _months(start: date, end: date) -> list[str]:
    """``YYYY-MM`` labels of every month touched by ``[start, end]``."""
    labels, year, month = [], start.year, start.month
    while (year, month) <= (end.year, end.month):
        labels.append(f"{year:04d}-{month:02d}")
        year, month = (year + 1, 1) if month == 12 else (year, month + 1)
    return labels


def charts(win: Window, filters: Filters, locale: str = "fr") -> dict:
    """
    ``KpiCharts`` (RPT-02). Amounts are centimes.

    - ``revenue_by_month``: series ``revenue`` (net commission) and
      ``gross_booking_value`` per month of check-in, every month present;
    - ``revenue_by_host_type`` / ``revenue_by_vertical``: net commission per
      group (``count`` holds the centimes); with ``group_stays`` home, hotel
      and hostel roll up into ``stays`` (BR-SRC-04);
    - ``bookings_by_wilaya``: sold bookings per wilaya code, named in ``locale``;
    - ``host_type_by_vertical``: sold bookings per host type and offer;
      impossible cells (a hotel selling a trip) are ``null``, not 0.
    """
    sold = _sold(filters, win.start, win.end)
    labels = _months(win.start, win.end)
    monthly = {
        row["month"].strftime("%Y-%m"): row
        for row in sold.annotate(month=TruncMonth("check_in")).values("month").annotate(
            revenue=Sum("commission_minor"), gbv=Sum("total_minor")
        )
    }
    revenue_by_month = [
        {"key": "revenue", "points": [{"x": m, "y": (monthly.get(m) or {}).get("revenue") or 0} for m in labels]},
        {"key": "gross_booking_value", "points": [{"x": m, "y": (monthly.get(m) or {}).get("gbv") or 0} for m in labels]},
    ]

    by_type = dict(sold.values_list("host_type").annotate(v=Sum("commission_minor")))
    revenue_by_host_type = [{"value": t, "label": t, "count": by_type.get(t) or 0} for t in HOST_TYPES]

    by_offer: dict[str, int] = {}
    for offer, amount in sold.values_list("offer").annotate(v=Sum("commission_minor")):
        key = "stays" if filters.group_stays and offer in STAY_VERTICALS else offer
        by_offer[key] = by_offer.get(key, 0) + (amount or 0)
    offers = [o for o in OFFER_COLUMNS if not (filters.group_stays and o in STAY_VERTICALS)]
    if filters.group_stays:
        offers.insert(0, "stays")
    revenue_by_vertical = [{"value": o, "label": o, "count": by_offer.get(o, 0)} for o in offers]

    by_wilaya = list(sold.exclude(wilaya__isnull=True).values_list("wilaya").annotate(n=Count("id")).order_by("-n"))
    names = {w.code: w.name_for(locale) for w in Wilaya.objects.filter(code__in=[code for code, _ in by_wilaya])}
    bookings_by_wilaya = [
        {"value": str(code), "label": names.get(code, str(code)), "count": n} for code, n in by_wilaya
    ]

    cells = {(t, o): n for t, o, n in sold.values_list("host_type", "offer").annotate(n=Count("id"))}
    cross = {
        t: {o: (cells.get((t, o), 0) if o in HOST_ALLOWED_OFFERS.get(t, set()) else None) for o in OFFER_COLUMNS}
        for t in HOST_TYPES
    }
    return {
        "revenue_by_month": revenue_by_month,
        "revenue_by_host_type": revenue_by_host_type,
        "revenue_by_vertical": revenue_by_vertical,
        "bookings_by_wilaya": bookings_by_wilaya,
        "host_type_by_vertical": cross,
    }
