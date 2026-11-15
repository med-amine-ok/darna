"""
Hooks that higher apps fill in so ``accounts`` can show their data without importing them.

``accounts`` is layer L2 (07-architecture.md section 3): it may not import
``catalog``, ``trips``, ``bookings`` or ``trust``. Some answers of this app
still need their data (a favourite's listing card, a user's booking count).
Like the outbox topics, the higher app registers a function here from its
``AppConfig.ready()``; ``accounts`` only knows the hook names.

Registered today: nothing outside this app. Until an app registers, the
answers use safe defaults (documented on each hook) and filters that need
the missing data answer 400 ``filter_unavailable``.

Example (in ``apps/catalog/apps.py``)::

    def ready(self):
        from apps.accounts import extensions
        from . import selectors
        extensions.register_favorite_target(
            "listing", exists=selectors.listing_exists, cards=selectors.favorite_listing_cards
        )
"""

from collections.abc import Callable, Iterable
from dataclasses import dataclass
from uuid import UUID


@dataclass(frozen=True)
class FavoriteTargetHooks:
    """
    How to check and show one kind of favourite target (ACC-09).

    ``exists(target_id) -> bool``: the target exists and may be favourited
    (404 otherwise). ``cards(target_ids, request) -> {target_id: (card dict,
    is_available)}``: the card shown in ``GET /me/favorites``.
    """

    exists: Callable[[UUID], bool]
    cards: Callable[[list[UUID], object], dict[UUID, tuple[dict | None, bool]]] | None = None


_favorite_targets: dict[str, FavoriteTargetHooks] = {}
# Each provider: ``fn(user_ids) -> {user_id: {field: value}}`` merged into AdminUser rows.
_admin_user_facts: list[Callable[[list[UUID]], dict[UUID, dict]]] = []
# Each provider: ``fn(user) -> {field: value}`` merged into the public profile (PublicUser).
_public_profile_facts: list[Callable[[object], dict]] = []
# Admin user list filters and orderings: ``fn(queryset, value) -> queryset``.
_admin_user_filters: dict[str, Callable] = {}


def register_favorite_target(target_type: str, *, exists: Callable, cards: Callable | None = None) -> None:
    """Called by ``catalog`` (``listing``) and ``trips`` (``trip``) from ``ready()``."""
    _favorite_targets[target_type] = FavoriteTargetHooks(exists=exists, cards=cards)


def favorite_target(target_type: str) -> FavoriteTargetHooks | None:
    """Hooks of a target type, or ``None`` when its app registered nothing yet (then any id is accepted)."""
    return _favorite_targets.get(target_type)


def register_admin_user_facts(provider: Callable[[Iterable[UUID]], dict[UUID, dict]]) -> None:
    """
    Add a provider of AdminUser fields (``is_host``, ``host_account_ids``,
    ``booking_count``, ``total_booked``, ``open_flags``) for a page of users.
    """
    _admin_user_facts.append(provider)


def admin_user_facts(user_ids: list[UUID]) -> dict[UUID, dict]:
    """Merge every provider's fields per user id (empty dicts when nothing is registered)."""
    merged: dict[UUID, dict] = {uid: {} for uid in user_ids}
    for provider in _admin_user_facts:
        for uid, fields in provider(user_ids).items():
            merged.setdefault(uid, {}).update(fields)
    return merged


def register_public_profile_facts(provider: Callable[[object], dict]) -> None:
    """Add a provider of PublicUser fields (``host_rating_avg``, ``organizations``, ``identity_verified``...)."""
    _public_profile_facts.append(provider)


def public_profile_facts(user) -> dict:
    """Merge every provider's public profile fields for one user."""
    merged: dict = {}
    for provider in _public_profile_facts:
        merged.update(provider(user))
    return merged


def register_admin_user_filter(name: str, fn: Callable) -> None:
    """
    Register a filter or ordering of ``GET /admin/users`` that needs another app's data.

    Names used: ``is_host``, ``min_bookings``, ``min_spend_minor``, ``flagged``
    (``fn(queryset, value)``) and ``ordering:bookings``, ``ordering:spend``
    (``fn(queryset, descending)``).
    """
    _admin_user_filters[name] = fn


def admin_user_filter(name: str) -> Callable | None:
    """The registered filter function, or ``None``."""
    return _admin_user_filters.get(name)
