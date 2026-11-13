"""Read and change platform settings."""

from django.db import transaction

from apps.core.errors import DomainError

from .models import DEFAULTS, PlatformSettings


def get_settings() -> dict:
    """
    Current settings as a dictionary: stored values on top of the defaults.

    Always returns every key of ``DEFAULTS``, even on an empty database.
    """
    current = PlatformSettings.objects.filter(is_current=True).first()
    values = {**DEFAULTS, **(current.data if current else {})}
    values["commission_bp"] = {**DEFAULTS["commission_bp"], **values.get("commission_bp", {})}
    return values


def get_value(key: str):
    """One setting value, for example ``get_value("request_ttl_hours")``."""
    return get_settings()[key]


def commission_rate_bp(host_account) -> int:
    """
    Commission rate of a host in basis points (BR-PAY-06).

    The host's own override wins; otherwise the default of its host type.
    """
    if host_account.commission_rate_override_bp is not None:
        return host_account.commission_rate_override_bp
    return int(get_settings()["commission_bp"][host_account.host_type])


def credit_limit_minor(host_account) -> int:
    """How far below zero this host's deposit may go, in centimes (BR-PAY-10)."""
    if host_account.credit_limit_override_minor is not None:
        return host_account.credit_limit_override_minor
    return int(get_value("credit_limit_minor"))


@transaction.atomic
def update_settings(changes: dict, *, actor) -> PlatformSettings:
    """
    Save a new settings version with ``changes`` applied (admin only).

    Unknown keys are refused; commission rates must be between 0 and 10,000 bp.
    """
    unknown = set(changes) - set(DEFAULTS)
    if unknown:
        raise DomainError(f"Unknown settings: {', '.join(sorted(unknown))}.", code="unknown_setting")
    for host_type, rate in (changes.get("commission_bp") or {}).items():
        if host_type not in DEFAULTS["commission_bp"] or not isinstance(rate, int) or not 0 <= rate <= 10_000:
            raise DomainError("Commission rates must be whole numbers between 0 and 10000 basis points.", code="invalid_rate")

    current = PlatformSettings.objects.select_for_update().filter(is_current=True).first()
    data = {**(current.data if current else {}), **changes}
    if "commission_bp" in changes:
        data["commission_bp"] = {**(current.data.get("commission_bp", {}) if current else {}), **changes["commission_bp"]}
    next_version = (current.version + 1) if current else 1
    if current:
        current.is_current = False
        current.save(update_fields=["is_current"])
    return PlatformSettings.objects.create(version=next_version, data=data, is_current=True, created_by=actor)


@transaction.atomic
def change_settings_as_admin(changes: dict, *, actor, ip: str | None = None) -> PlatformSettings:
    """
    Apply an admin's settings change and write it to the audit log (BR-CFG-01, BR-STF-02).

    Same as :func:`update_settings`, plus one ``SETTINGS_UPDATE`` audit row in
    the same transaction, holding only the changed keys before and after.
    """
    # Local import: audit sits in the same layer (L1) as config; importing it
    # only here keeps module loading simple and creates no import cycle
    # (audit never imports config).
    from apps.audit.services import record

    before_all = get_settings()
    row = update_settings(changes, actor=actor)
    after_all = get_settings()
    record(
        actor=actor, action="SETTINGS_UPDATE", obj=row,
        before={key: before_all[key] for key in changes},
        after={key: after_all[key] for key in changes},
        note=f"version {row.version}", ip=ip,
    )
    return row
