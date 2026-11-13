"""Pagination used by list endpoints."""

from rest_framework.pagination import PageNumberPagination as DRFPageNumberPagination
from rest_framework.response import Response


class PageNumberPagination(DRFPageNumberPagination):
    """
    ``?page=2&page_size=24`` pagination, capped at 50 rows per page
    (protects the API from very large requests, OWASP API4).

    Response shape: ``{"count": 132, "page": 2, "page_size": 24, "results": [...]}``.
    """

    page_size = 24
    page_size_query_param = "page_size"
    max_page_size = 50

    def get_paginated_response(self, data):
        """Wrap a page of results with its counters."""
        return Response(
            {
                "count": self.page.paginator.count,
                "page": self.page.number,
                "page_size": self.get_page_size(self.request),
                "results": data,
            }
        )

    def get_paginated_response_schema(self, schema):
        """OpenAPI description of the paginated shape (for drf-spectacular)."""
        return {
            "type": "object",
            "required": ["count", "results"],
            "properties": {
                "count": {"type": "integer"},
                "page": {"type": "integer"},
                "page_size": {"type": "integer"},
                "results": schema,
            },
        }
