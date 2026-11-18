"""
Host facts for the admin users list (``GET /admin/users``, ACC-08).

``accounts`` (layer L2, before ``hosts``) cannot query host accounts, so
hosts registers the ``is_host`` filter and the per-user host facts through
``apps.accounts.extensions`` from ``HostsConfig.ready``. Without it the
admin's guests and hosts tabs answered 400 ``filter_unavailable``.
"""

from django.db.models import Exists, OuterRef, Q

from .models import HostAccount, Membership


def _is_host_condition() -> Q:
    """Users with a live solo host account or an active team membership."""
    solo = HostAccount.objects.alive().filter(user=OuterRef("pk"))
    member = Membership.objects.filter(user=OuterRef("pk"), is_active=True)
    return Q(Exists(solo)) | Q(Exists(member))


def filter_is_host(queryset, value):
    """``?is_host=true`` keeps hosts, ``false`` keeps guests only."""
    wanted = value if isinstance(value, bool) else str(value).lower() in ("1", "true", "yes")
    condition = _is_host_condition()
    return queryset.filter(condition) if wanted else queryset.exclude(condition)


def host_facts(user_ids) -> dict:
    """``{user_id: {"is_host", "host_account_ids"}}`` for one page of users."""
    ids = list(user_ids)
    accounts: dict = {uid: set() for uid in ids}
    for row in HostAccount.objects.alive().filter(user_id__in=ids).values("user_id", "id"):
        accounts[row["user_id"]].add(str(row["id"]))
    for row in Membership.objects.filter(user_id__in=ids, is_active=True).values("user_id", "organization__host_account__id"):
        if row["organization__host_account__id"]:
            accounts[row["user_id"]].add(str(row["organization__host_account__id"]))
    return {uid: {"is_host": bool(found), "host_account_ids": sorted(found)} for uid, found in accounts.items()}


def connect() -> None:
    """Register the hooks with accounts."""
    from apps.accounts.extensions import register_admin_user_facts, register_admin_user_filter

    register_admin_user_filter("is_host", filter_is_host)
    register_admin_user_facts(host_facts)
