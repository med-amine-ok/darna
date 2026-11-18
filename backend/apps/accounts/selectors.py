"""
Read-only queries of the accounts app (no writes here).

Every list an endpoint shows comes from a function in this file, so the
filters that protect data (own rows only, staff-only rows) live in one place.
"""

import base64
import binascii
from datetime import datetime

from django.db.models import Q, QuerySet

from apps.core.errors import DomainError

from . import extensions
from .models import (
    AuthenticatorType,
    ConsentDocument,
    ConsentRecord,
    DataSubjectRequest,
    Favorite,
    MfaAuthenticator,
    StaffProfile,
    StaffRole,
    StaffRolePermission,
    User,
    UserStatus,
)


# ---------------------------------------------------------------------------
# Second factor (BR-ACC-04)
# ---------------------------------------------------------------------------
def user_has_mfa(user) -> bool:
    """
    True when the user has a confirmed authenticator app (BR-ACC-04).

    Public: ``hosts`` may call it before payout detail changes (hosts must
    have a second factor, BR-ACC-04).
    """
    if user is None or not getattr(user, "pk", None):
        return False
    return MfaAuthenticator.objects.filter(user=user, type=AuthenticatorType.TOTP, confirmed_at__isnull=False).exists()


def authenticators_of(user) -> QuerySet[MfaAuthenticator]:
    """The user's confirmed second factors (authListAuthenticators)."""
    return MfaAuthenticator.objects.filter(user=user, confirmed_at__isnull=False).order_by("created_at")


def users_with_mfa(user_ids) -> set:
    """Ids among ``user_ids`` that have a confirmed authenticator app (one query for a staff list)."""
    return set(
        MfaAuthenticator.objects.filter(
            user_id__in=list(user_ids), type=AuthenticatorType.TOTP, confirmed_at__isnull=False
        ).values_list("user_id", flat=True)
    )


# ---------------------------------------------------------------------------
# Staff (BR-STF-01)
# ---------------------------------------------------------------------------
def role_permissions() -> dict[str, list[str]]:
    """Permission codes of every role, read from the database (adminListStaffRoles)."""
    result: dict[str, list[str]] = {role: [] for role in StaffRole.values}
    for role, code in StaffRolePermission.objects.order_by("permission_id").values_list("role", "permission_id"):
        result.setdefault(role, []).append(code)
    return result


def staff_permission_codes(user) -> set[str]:
    """
    Permissions of a staff user, read from the database on every request (BR-STF-01).

    Empty for non-staff users and for staff that are not active (deny by default).
    """
    if user is None or not getattr(user, "is_admin", False):
        return set()
    role = user.staff_profile.role
    return set(StaffRolePermission.objects.filter(role=role).values_list("permission_id", flat=True))


def staff_members() -> QuerySet[StaffProfile]:
    """Every staff member, active first, then by invitation date (adminListStaff)."""
    return StaffProfile.objects.select_related("user").order_by("status", "-invited_at", "user__email")


def staff_member(staff_id) -> StaffProfile | None:
    """One staff profile by user id, or ``None``."""
    return StaffProfile.objects.select_related("user").filter(user_id=staff_id).first()


# ---------------------------------------------------------------------------
# Consents and data subject requests (BR-PRV-01, BR-PRV-02)
# ---------------------------------------------------------------------------
def current_consents(user) -> list[ConsentRecord]:
    """The latest row per document: the person's current consent (BR-PRV-01, the table is append-only)."""
    latest: dict[str, ConsentRecord] = {}
    for row in ConsentRecord.objects.filter(user=user).order_by("-created_at", "-id"):
        latest.setdefault(row.document, row)
    order = list(ConsentDocument.values)
    return sorted(latest.values(), key=lambda row: order.index(row.document) if row.document in order else len(order))


def data_requests_of(user) -> QuerySet[DataSubjectRequest]:
    """The person's own data protection requests, newest first (listMyDataRequests)."""
    return DataSubjectRequest.objects.filter(user=user).order_by("-created_at")


def admin_data_requests(*, status: str = "", kind: str = "") -> QuerySet[DataSubjectRequest]:
    """Every data protection request, the nearest deadline first (adminListDataRequests, BR-PRV-02)."""
    rows = DataSubjectRequest.objects.select_related("user", "handled_by").order_by("due_at", "id")
    if status:
        rows = rows.filter(status=status)
    if kind:
        rows = rows.filter(kind=kind)
    return rows


# ---------------------------------------------------------------------------
# Favourites (ACC-09)
# ---------------------------------------------------------------------------
def _encode_cursor(row: Favorite) -> str:
    """Opaque cursor pointing after ``row`` (newest first order)."""
    raw = f"{row.created_at.isoformat()}|{row.id}"
    return base64.urlsafe_b64encode(raw.encode()).decode().rstrip("=")


def _decode_cursor(cursor: str) -> tuple[datetime, str]:
    """Read a cursor back; a bad one gives 400 ``invalid_cursor``."""
    try:
        padded = cursor + "=" * (-len(cursor) % 4)
        created, _, row_id = base64.urlsafe_b64decode(padded.encode()).decode().partition("|")
        return datetime.fromisoformat(created), row_id
    except (ValueError, binascii.Error, UnicodeDecodeError) as exc:
        raise DomainError("Invalid cursor.", code="invalid_cursor", errors={"cursor": ["Invalid cursor."]}) from exc


def favorites_page(user, *, target_type: str = "", cursor: str = "", limit: int = 20) -> tuple[list[Favorite], str | None]:
    """
    One cursor page of the user's favourites, newest first (listMyFavorites, ACC-09).

    Returns ``(rows, next_cursor)``; ``next_cursor`` is ``None`` on the last page.
    """
    rows = Favorite.objects.filter(user=user).order_by("-created_at", "-id")
    if target_type:
        rows = rows.filter(target_type=target_type)
    if cursor:
        created, row_id = _decode_cursor(cursor)
        rows = rows.filter(Q(created_at__lt=created) | Q(created_at=created, id__lt=row_id))
    page = list(rows[: limit + 1])
    next_cursor = _encode_cursor(page[limit - 1]) if len(page) > limit else None
    return page[:limit], next_cursor


def favorite_cards(rows: list[Favorite], request) -> dict:
    """
    ``{(target_type, target_id): (card, is_available)}`` for a page of favourites.

    Cards come from the app that owns the target (:mod:`apps.accounts.extensions`).
    Without a registered hook the card is ``None`` and the item counts as available.
    """
    result: dict = {}
    for target_type in {row.target_type for row in rows}:
        ids = [row.target_id for row in rows if row.target_type == target_type]
        hooks = extensions.favorite_target(target_type)
        found = hooks.cards(ids, request) if hooks and hooks.cards else {}
        for target_id in ids:
            result[(target_type, target_id)] = found.get(target_id, (None, True) if not hooks else (None, False))
    return result


# ---------------------------------------------------------------------------
# Users (admin list, public profile)
# ---------------------------------------------------------------------------
ADMIN_USER_ORDERINGS = {
    "joined": ("date_joined", "id"),
    "-joined": ("-date_joined", "-id"),
    "activity": ("last_login", "id"),
    "-activity": ("-last_login", "-id"),
}


def admin_users(
    *,
    statuses: list[str] | None = None,
    q: str = "",
    email_verified: bool | None = None,
    phone_verified: bool | None = None,
    wilayas: list[int] | None = None,
    extra_filters: dict | None = None,
    ordering: str = "-joined",
) -> QuerySet[User]:
    """
    Users seen by admins: guests and hosts as people, staff excluded (adminListUsers, ACC-08).

    ``q`` searches names, email and phone. ``extra_filters`` (``is_host``,
    ``min_bookings``, ``min_spend_minor``, ``flagged``) and the orderings
    ``bookings``/``spend`` need another app's data: they run through the
    hooks of :mod:`apps.accounts.extensions` and give 400
    ``filter_unavailable`` until that app registers them.
    """
    rows = User.objects.filter(is_staff=False).select_related("home_commune")
    if statuses:
        rows = rows.filter(status__in=statuses)
    if q:
        rows = rows.filter(
            Q(email__icontains=q) | Q(phone_e164__icontains=q) | Q(first_name_latin__icontains=q)
            | Q(last_name_latin__icontains=q) | Q(full_name_ar__icontains=q)
        )
    if email_verified is not None:
        rows = rows.filter(email_verified_at__isnull=not email_verified)
    if phone_verified is not None:
        rows = rows.filter(phone_verified_at__isnull=not phone_verified)
    if wilayas:
        rows = rows.filter(home_commune__wilaya_id__in=wilayas)
    for name, value in (extra_filters or {}).items():
        if value is None:
            continue
        rows = _hooked(name)(rows, value)
    if ordering in ADMIN_USER_ORDERINGS:
        return rows.order_by(*ADMIN_USER_ORDERINGS[ordering])
    descending = ordering.startswith("-")
    return _hooked(f"ordering:{ordering.lstrip('-')}")(rows, descending)


def _hooked(name: str):
    """The registered filter ``name``, or a 400 ``filter_unavailable`` error."""
    fn = extensions.admin_user_filter(name)
    if fn is None:
        label = name.removeprefix("ordering:")
        raise DomainError(
            "This filter is not available yet.", code="filter_unavailable", errors={label: ["Not available yet."]}
        )
    return fn


def admin_user(user_id) -> User | None:
    """One user for admins, deleted ones included; staff are managed under /admin/staff."""
    return User.objects.filter(pk=user_id, is_staff=False).first()


def public_user(key) -> User | None:
    """
    A user whose public profile may be shown (getPublicUser), by id or by handle (ACC-06).

    Suspended, banned, deleted and staff accounts are hidden (404), so ids
    and handles cannot be probed for their state.
    """
    import uuid

    visible = User.objects.filter(status=UserStatus.ACTIVE, deleted_at__isnull=True, is_staff=False)
    try:
        return visible.filter(pk=uuid.UUID(str(key))).first()
    except ValueError:
        return visible.filter(handle=str(key).lower()).first()

