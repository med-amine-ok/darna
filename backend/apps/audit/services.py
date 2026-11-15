"""Write to the audit log, and build the audited CSV exports (BR-STF-02, BR-STF-04)."""

from datetime import date, timedelta

from django.core import signing
from django.db import transaction
from django.utils import timezone

from apps.core.errors import DomainError, NotFoundError

from .exports import DATASETS, DATE_FILTERS, export_dir, lookup_exists, resolve_model, write_csv
from .models import AuditEvent, ExportJob, ExportStatus

# BR-STF-04 and 06-api-design rate limits: 10 exports per hour per admin.
EXPORTS_PER_HOUR = 10
# Largest export built in one go; narrow the filters for more.
MAX_EXPORT_ROWS = 200_000
# The download link of an export works 5 minutes (signed URL, like private documents).
DOWNLOAD_TTL = timedelta(minutes=5)
DOWNLOAD_SALT = "audit.export-download"


def record(*, actor, action: str, obj=None, object_type: str = "", object_id: str = "",
           before: dict | None = None, after: dict | None = None, note: str = "", ip: str | None = None) -> AuditEvent:
    """
    Add one line to the audit log.

    Call it inside the same database transaction as the change it describes,
    so the log and the data can never disagree. Pass either ``obj`` (a model
    instance) or ``object_type`` + ``object_id``. Keep ``before``/``after``
    small and free of personal data (statuses, amounts, ids).

    Example::

        audit.record(actor=request.user, action="LISTING_APPROVE", obj=listing,
                     before={"status": "pending_review"}, after={"status": "published"})
    """
    if obj is not None:
        object_type = object_type or obj._meta.model_name
        object_id = object_id or str(obj.pk)
    if actor is None:
        actor_kind = "system"
    elif getattr(actor, "is_admin", False):
        actor_kind = "admin"
    else:
        actor_kind = "user"
    return AuditEvent.objects.create(
        actor=actor, actor_kind=actor_kind, action=action, object_type=object_type, object_id=str(object_id),
        before=before, after=after, note=note, ip=ip,
    )


# ---------------------------------------------------------------------------
# CSV exports (BR-STF-04)
# ---------------------------------------------------------------------------
def _unprocessable(code: str, message: str, errors: dict | None = None) -> DomainError:
    """A 422 refusal of an export request."""
    return DomainError(message, code=code, status_code=422, errors=errors)


def _filtered_queryset(dataset_name: str, filters: dict):
    """
    The rows of a dataset narrowed by the client's filters, and the columns that exist.

    Unknown filter names: 422 ``unknown_filter``. ``created_from`` and
    ``created_to`` are ISO dates, inclusive. A dataset whose model is not
    built yet: 422 ``dataset_not_available``.
    """
    dataset = DATASETS.get(dataset_name)
    model = resolve_model(dataset) if dataset else None
    if model is None:
        raise _unprocessable("dataset_not_available", f"The {dataset_name} export is not available yet.")
    unknown = sorted(set(filters) - set(dataset.filters) - set(DATE_FILTERS))
    if unknown:
        raise _unprocessable("unknown_filter", "Some filters do not exist for this dataset.",
                             {name: [f"Use: {', '.join(sorted([*dataset.filters, *DATE_FILTERS]))}."] for name in unknown})
    lookups: dict = {}
    for name, value in filters.items():
        if isinstance(value, (dict, list)):
            raise _unprocessable("validation_failed", "Filters are single values.", {name: ["A single value."]})
        if name in DATE_FILTERS:
            try:
                day = date.fromisoformat(str(value))
            except ValueError as exc:
                raise _unprocessable("validation_failed", "Use the format YYYY-MM-DD.", {name: ["YYYY-MM-DD."]}) from exc
            suffix = "gte" if name == "created_from" else "lte"
            lookups[f"{dataset.date_field}__date__{suffix}"] = day
        elif lookup_exists(model, dataset.filters[name]):
            if isinstance(value, str) and value.lower() in ("true", "false"):
                value = value.lower() == "true"
            lookups[dataset.filters[name]] = value
        else:  # the column behind this filter does not exist (yet): refuse rather than export everything
            raise _unprocessable("unknown_filter", "This filter is not available yet.", {name: ["Not available."]})
    columns = [column for column in dataset.columns if lookup_exists(model, column)]
    return model._default_manager.filter(**lookups).order_by(dataset.order_by), columns


@transaction.atomic
def create_export(admin, *, dataset: str, filters: dict, ip: str | None = None) -> ExportJob:
    """
    Build a CSV export now and audit it (BR-STF-04, BR-STF-02).

    At most 10 exports per admin per hour (429 ``rate_limited``) and
    200,000 rows (422 ``export_too_large``). Cells are formula-safe. The
    file goes to the private export folder; the job is ``done`` when this
    returns (``failed`` with the reason if writing the file broke). One
    ``EXPORT_CREATE`` audit row holds the dataset, the filters and the row count.
    """
    since = timezone.now() - timedelta(hours=1)
    if ExportJob.objects.filter(requested_by=admin, created_at__gte=since).count() >= EXPORTS_PER_HOUR:
        raise DomainError("Too many exports this hour. Try again later.", code="rate_limited", status_code=429)
    rows, columns = _filtered_queryset(dataset, filters)
    count = rows.count()
    if count > MAX_EXPORT_ROWS:
        raise _unprocessable("export_too_large", f"More than {MAX_EXPORT_ROWS} rows: narrow the filters.")
    job = ExportJob.objects.create(requested_by=admin, dataset=dataset, filters=filters, status=ExportStatus.RUNNING)
    try:
        content = write_csv(rows.values_list(*columns).iterator(), columns)
        job.file_name = f"{job.pk}.csv"
        (export_dir() / job.file_name).write_bytes(content)
        job.status, job.row_count = ExportStatus.DONE, count
    except OSError as exc:
        job.status, job.error = ExportStatus.FAILED, str(exc)[:2000]
    job.completed_at = timezone.now()
    job.save(update_fields=["file_name", "status", "row_count", "error", "completed_at"])
    record(actor=admin, action="EXPORT_CREATE", obj=job, ip=ip,
           after={"dataset": dataset, "filters": filters, "row_count": job.row_count, "status": job.status})
    return job


def export_of(admin, export_id) -> ExportJob:
    """One of the admin's own exports, or 404 ``export_not_found``."""
    job = ExportJob.objects.filter(pk=export_id, requested_by=admin).first()
    if job is None:
        raise NotFoundError("Unknown export.", code="export_not_found")
    return job


def download_token(job: ExportJob) -> str | None:
    """A token that opens the file of a finished export for 5 minutes, or ``None`` when there is no file."""
    if job.status != ExportStatus.DONE or not job.file_name:
        return None
    return signing.dumps({"e": str(job.pk)}, salt=DOWNLOAD_SALT)


def export_for_download(export_id, token: str, *, ip: str | None = None) -> tuple[ExportJob, bytes]:
    """
    The export and its file for a signed download link; 404 ``link_expired`` when the link is wrong or old.

    Every download writes ``EXPORT_DOWNLOAD`` to the audit log (BR-STF-02),
    in the name of the admin who asked for the export.
    """
    try:
        payload = signing.loads(token or "", salt=DOWNLOAD_SALT, max_age=DOWNLOAD_TTL.total_seconds())
    except signing.BadSignature as exc:
        raise NotFoundError("This link is invalid or has expired.", code="link_expired") from exc
    job = ExportJob.objects.select_related("requested_by").filter(pk=export_id).first()
    if job is None or payload.get("e") != str(job.pk) or not job.file_name:
        raise NotFoundError("This link is invalid or has expired.", code="link_expired")
    path = export_dir() / job.file_name
    if not path.is_file():
        raise NotFoundError("The export file is gone.", code="export_file_missing")
    record(actor=job.requested_by, action="EXPORT_DOWNLOAD", obj=job, ip=ip, after={"dataset": job.dataset})
    return job, path.read_bytes()
