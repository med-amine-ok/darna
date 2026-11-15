"""
Extension points that higher apps plug into (07-architecture section 2: lower layers never import higher ones).

``media`` is a layer L1 app: it may import only ``core``. Two things it
needs come from higher layers, so they are registered at start-up by a
higher app's ``AppConfig.ready`` (today ``apps.trust``):

- :data:`workspace_resolver`: ``fn(request) -> host_account_id`` that checks
  the caller's active host workspace (``hosts.context.get_host_context``).
  Documents can only be uploaded for a workspace the caller belongs to.
- :data:`private_url_issued`: a signal sent inside the transaction each time
  a signed URL of a private file is handed out, so the receiver writes the
  audit row BR-MED-02 asks for ("each view audited").
"""

from collections.abc import Callable

from django.dispatch import Signal

# Sent with ``media`` (the MediaAsset), ``user`` and ``request`` (may be None) each time a private URL is issued (BR-MED-02).
private_url_issued = Signal()

# fn(request) -> host account id (UUID) of the checked active workspace; raises a 403 DomainError otherwise.
workspace_resolver: Callable | None = None


def set_workspace_resolver(fn: Callable) -> None:
    """Register the function that resolves and checks the active host workspace of a request."""
    global workspace_resolver
    workspace_resolver = fn
