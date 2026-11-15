"""
Read and change platform settings (BR-CFG-01) and the versioned onboarding
flows of each host type (BR-CFG-02, BR-CFG-03, BR-HST-01).
"""

from django.db import transaction
from django.db.models import Max
from django.utils import timezone

from apps.core.errors import ConflictError, DomainError, NotFoundError

from .models import (
    DEFAULTS,
    ONBOARDING_FIELD_TYPES,
    FlowStatus,
    OnboardingFlowVersion,
    OnboardingHostType,
    PlatformSettings,
)


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


def settings_etag(row: PlatformSettings | None = None) -> str:
    """
    ETag of the settings in force (optimistic locking, 06-api-design).

    ``"settings-v0"`` while only the defaults exist.
    """
    if row is None:
        row = PlatformSettings.objects.filter(is_current=True).only("version").first()
    return f'"settings-v{row.version if row else 0}"'


def check_if_match(if_match: str | None, current_etag: str) -> None:
    """
    Refuse a write made from a stale read: 412 ``stale_version`` (06-api-design, optimistic locking).

    No header means the client did not ask for the check, so the write goes on.
    """
    if if_match and if_match.strip() not in (current_etag, "*"):
        raise DomainError("Someone saved in between. Reload and try again.", code="stale_version", status_code=412)


def commission_rates() -> dict:
    """Default commission rate of each host type in basis points (BR-PAY-06), as ``{host_type: bp}``."""
    return dict(get_settings()["commission_bp"])


@transaction.atomic
def set_commission_rates(rates: dict, *, actor, if_match: str | None = None, ip: str | None = None) -> dict:
    """
    Replace the default commission rates of the host types (BR-PAY-06, BR-CFG-01).

    Writes a new settings version and one audit row (BR-STF-02) through
    :func:`change_settings_as_admin`. New bookings only: a booking keeps the
    rate copied on it when it was created. ``if_match`` is checked against
    :func:`settings_etag` (412 ``stale_version``).
    """
    PlatformSettings.objects.select_for_update().filter(is_current=True).first()
    check_if_match(if_match, settings_etag())
    change_settings_as_admin({"commission_bp": dict(rates)}, actor=actor, ip=ip)
    return commission_rates()


# ---------------------------------------------------------------------------
# Onboarding flows (BR-CFG-02, BR-CFG-03, BR-HST-01)
# ---------------------------------------------------------------------------
def require_host_type(host_type: str) -> str:
    """Return ``host_type`` or raise 404 ``unknown_host_type`` (individual, agency, hotel, hostel only)."""
    if host_type not in OnboardingHostType.values:
        raise NotFoundError("Unknown host type.", code="unknown_host_type")
    return host_type


def flow_fields(steps: list[dict]) -> dict[str, dict]:
    """Every field of a flow by its id, whatever the step (answers are keyed by field id, BR-HST-02)."""
    return {field["id"]: field for step in steps for field in step.get("fields") or []}


def approval_field(steps: list[dict]) -> dict | None:
    """
    The booking approval-mode field of a flow, or ``None`` (BR-HST-01).

    It is the ``select`` field whose options include ``instant`` and
    ``request``, whatever its id (``instantBook``, ``agencyBookingMode``...).
    """
    for field in flow_fields(steps).values():
        values = {str(option.get("value")) for option in field.get("options") or []}
        if field.get("type") == "select" and {"instant", "request"} <= values:
            return field
    return None


def flow_etag(row: OnboardingFlowVersion) -> str:
    """ETag of one flow version: host type, version number and time of its last save."""
    return f'"{row.host_type}-v{row.version}-{int(row.updated_at.timestamp() * 1000)}"'


def _invalid(code: str, message: str, errors: dict | None = None) -> DomainError:
    """A 422 refusal of a flow draft with a stable code (BR-CFG-03, BR-HST-01)."""
    return DomainError(message, code=code, status_code=422, errors=errors)


def validate_flow_steps(steps: list[dict], baseline: list[dict]) -> None:
    """
    Check a flow draft before it is saved or published (BR-CFG-03, BR-HST-01).

    - ids of steps and of fields are unique (422 ``validation_failed``);
    - every field type is canonical (422 ``unknown_field_type``);
    - every core step of ``baseline`` (the published version) is still there
      and still core (422 ``core_step_removed``);
    - every core field keeps its id, its type and its core flag
      (422 ``core_field_changed``);
    - the booking approval-mode question is present (422 ``approval_step_missing``).
    """
    step_ids = [step["id"] for step in steps]
    field_ids = [field["id"] for step in steps for field in step.get("fields") or []]
    duplicates = sorted(
        {x for x in step_ids if step_ids.count(x) > 1} | {x for x in field_ids if field_ids.count(x) > 1}
    )
    if duplicates:
        raise _invalid("validation_failed", "Step and field ids must be unique.", {"ids": duplicates})
    for step in steps:
        for field in step.get("fields") or []:
            if field.get("type") not in ONBOARDING_FIELD_TYPES:
                raise _invalid(
                    "unknown_field_type", f"Unknown field type {field.get('type')!r}.",
                    {field["id"]: [f"Use one of: {', '.join(ONBOARDING_FIELD_TYPES)}."]},
                )
    new_steps = {step["id"]: step for step in steps}
    for old in baseline:
        if old.get("core") and not (old["id"] in new_steps and new_steps[old["id"]].get("core")):
            raise _invalid("core_step_removed", f"The core step {old['id']!r} cannot be removed.",
                           {old["id"]: ["Core step."]})
    new_fields = flow_fields(steps)
    for field_id, old in flow_fields(baseline).items():
        if not old.get("core"):
            continue
        new = new_fields.get(field_id)
        if new is None or new.get("type") != old.get("type") or not new.get("core"):
            raise _invalid("core_field_changed", f"The core field {field_id!r} cannot be removed or change type.",
                           {field_id: ["Core field."]})
    if approval_field(steps) is None:
        raise _invalid("approval_step_missing", "Every flow must ask the booking approval mode (instant or request).")


def _published(host_type: str) -> OnboardingFlowVersion | None:
    """The published version of a host type, or ``None``."""
    return OnboardingFlowVersion.objects.filter(host_type=host_type, status=FlowStatus.PUBLISHED).first()


def _next_version(host_type: str) -> int:
    """Next free version number of a host type (1 for the first)."""
    top = OnboardingFlowVersion.objects.filter(host_type=host_type).aggregate(top=Max("version"))["top"]
    return (top or 0) + 1


def _draft_for_update(host_type: str) -> OnboardingFlowVersion | None:
    """The draft flow of a host type, locked for this transaction, or ``None``."""
    return OnboardingFlowVersion.objects.select_for_update().filter(host_type=host_type, status=FlowStatus.DRAFT).first()


@transaction.atomic
def save_flow_draft(host_type: str, steps: list[dict], *, actor, if_match: str | None = None,
                    ip: str | None = None) -> OnboardingFlowVersion:
    """
    Create or replace the draft flow of a host type (BR-CFG-02, BR-CFG-03).

    The draft is checked against the published version with
    :func:`validate_flow_steps`. ``if_match`` must be the ETag of the draft
    (or of the published version while there is no draft), otherwise 412
    ``stale_version``. A new draft takes the next version number. Audited
    (BR-STF-02).
    """
    require_host_type(host_type)
    draft = _draft_for_update(host_type)
    published = _published(host_type)
    reference = draft or published
    if reference is not None:
        check_if_match(if_match, flow_etag(reference))
    validate_flow_steps(steps, published.steps if published else [])
    now = timezone.now()
    if draft is None:
        draft = OnboardingFlowVersion.objects.create(
            host_type=host_type, version=_next_version(host_type), status=FlowStatus.DRAFT,
            schema={"steps": steps}, created_at=now, updated_at=now,
        )
    else:
        draft.schema = {"steps": steps}
        draft.updated_at = now
        draft.save(update_fields=["schema", "updated_at"])
    _audit(actor, "ONBOARDING_FLOW_DRAFT_SAVE", draft, ip=ip, after={"version": draft.version, "steps": len(steps)})
    return draft


@transaction.atomic
def publish_flow(host_type: str, *, actor, ip: str | None = None) -> OnboardingFlowVersion:
    """
    Publish the draft of a host type as its next immutable version (BR-CFG-02).

    The previous published version becomes ``archived``; host drafts keep
    the version they started from (BR-HST-02). 404 ``flow_draft_not_found``
    when there is no draft. Audited (BR-STF-02).
    """
    require_host_type(host_type)
    draft = _draft_for_update(host_type)
    if draft is None:
        raise NotFoundError("There is no draft to publish.", code="flow_draft_not_found")
    published = _published(host_type)
    validate_flow_steps(draft.steps, published.steps if published else [])
    previous = _archive_published(host_type)
    draft.status = FlowStatus.PUBLISHED
    draft.published_by = actor
    draft.published_at = timezone.now()
    draft.save(update_fields=["status", "published_by", "published_at"])
    _audit(actor, "ONBOARDING_FLOW_PUBLISH", draft, ip=ip,
           before={"published_version": previous}, after={"published_version": draft.version})
    return draft


@transaction.atomic
def republish_flow_version(host_type: str, version: int, *, actor, ip: str | None = None) -> OnboardingFlowVersion:
    """
    Roll back: publish the content of an older version under a new number (BR-CFG-02).

    The old row is never changed. 404 ``flow_version_not_found`` for an
    unknown version or a draft; 409 ``already_published`` when it is the
    version in force. When the draft holds the highest number, it moves one
    number up and keeps its content.
    """
    require_host_type(host_type)
    source = OnboardingFlowVersion.objects.filter(
        host_type=host_type, version=version, status__in=[FlowStatus.PUBLISHED, FlowStatus.ARCHIVED]
    ).first()
    if source is None:
        raise NotFoundError("Unknown flow version.", code="flow_version_not_found")
    if source.status == FlowStatus.PUBLISHED:
        raise ConflictError("This version is already the published one.", code="already_published")
    new_number = _next_version(host_type)
    draft = _draft_for_update(host_type)
    if draft is not None and draft.version == new_number - 1:
        draft.version = new_number
        draft.save(update_fields=["version"])
        new_number -= 1
    previous = _archive_published(host_type)
    now = timezone.now()
    row = OnboardingFlowVersion.objects.create(
        host_type=host_type, version=new_number, status=FlowStatus.PUBLISHED, schema=source.schema,
        published_by=actor, published_at=now, created_at=now, updated_at=now,
    )
    _audit(actor, "ONBOARDING_FLOW_REPUBLISH", row, ip=ip,
           before={"published_version": previous}, after={"published_version": row.version, "copied_from": version})
    return row


def _archive_published(host_type: str) -> int | None:
    """Move the published version of ``host_type`` to ``archived``; returns its number (or ``None``)."""
    current = OnboardingFlowVersion.objects.select_for_update().filter(
        host_type=host_type, status=FlowStatus.PUBLISHED
    ).first()
    if current is None:
        return None
    current.status = FlowStatus.ARCHIVED
    current.save(update_fields=["status"])
    return current.version


def _audit(actor, action: str, obj, **kwargs) -> None:
    """Write the audit row of an onboarding flow change (BR-STF-02); local import as in :func:`change_settings_as_admin`."""
    from apps.audit.services import record

    record(actor=actor, action=action, obj=obj, **kwargs)
