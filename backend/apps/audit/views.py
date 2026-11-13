"""
Audit log endpoint for admins (``GET /admin/audit-events``, BR-STF-02).

Read only: the API offers no way to change or delete an audit row.
"""

from rest_framework.generics import ListAPIView

from apps.accounts.permissions import IsAdmin

from . import selectors
from .serializers import AuditEventSerializer


class AuditEventListView(ListAPIView):
    """
    ``GET /admin/audit-events``: paginated, newest first.

    Filters (query string): ``action``, ``object_type``, ``object_id``,
    ``actor`` (user id).
    """

    permission_classes = [IsAdmin]
    serializer_class = AuditEventSerializer
    # Filtering is done by the selector; the global django-filter backend is not needed.
    filter_backends: list = []

    def get_queryset(self):
        """Events matching the query-string filters."""
        params = self.request.query_params
        return selectors.list_events(
            action=params.get("action", ""),
            object_type=params.get("object_type", ""),
            object_id=params.get("object_id", ""),
            actor=params.get("actor", ""),
        )
