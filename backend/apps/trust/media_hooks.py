"""
Wiring of the ``media`` hooks (07-architecture: lower layers learn about higher ones through hooks).

``media`` (layer L1) cannot import ``hosts`` or ``audit``. At start-up this
module registers:

- the workspace resolver, so document uploads are tied to a host workspace
  the caller really belongs to (``hosts.context.get_host_context``, BR-ORG-01);
- the receiver of ``private_url_issued`` that writes one audit row each time
  a private file URL is handed out (BR-MED-02, BR-STF-02).

TODO(hosts): this wiring belongs in ``apps.hosts.apps.ready`` (resolver) and
``apps.audit`` (receiver); it lives here until those owners take it over.
"""

from apps.audit import services as audit
from apps.hosts.context import get_host_context
from apps.media import hooks


def resolve_workspace(request):
    """Checked host account id of the request's active workspace (403 when the caller is not a host)."""
    return get_host_context(request).host_account.id


def audit_private_url(sender, media, user, request=None, **kwargs) -> None:
    """Write the audit row of one private file view (BR-MED-02: each view audited)."""
    from apps.accounts.views import client_ip  # imported late: views are not loaded while apps start

    audit.record(
        actor=user, action="MEDIA_PRIVATE_URL", object_type="media_asset", object_id=str(media.id),
        after={"purpose": media.purpose, "bucket": media.bucket}, ip=client_ip(request) if request else None,
    )


def connect() -> None:
    """Register the resolver and the audit receiver (idempotent)."""
    hooks.set_workspace_resolver(resolve_workspace)
    hooks.private_url_issued.connect(audit_private_url, dispatch_uid="trust.audit_private_url")
