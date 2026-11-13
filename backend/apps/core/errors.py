"""
One error shape for the whole API.

Every error response looks like this (06-api-design.md, BR-SYS-04)::

    {
      "code": "dates_unavailable",          # stable, the apps switch on it
      "message": "These dates are no longer available.",
      "status": 409,
      "errors": {"check_in": ["..."]}       # only for field validation
    }

Services raise :class:`DomainError` (or a subclass) with a stable ``code``;
:func:`api_exception_handler` turns it, and DRF's own exceptions, into that
shape. Messages are translatable with Django's i18n.
"""

from django.core.exceptions import PermissionDenied as DjangoPermissionDenied
from django.core.exceptions import ValidationError as DjangoValidationError
from django.http import Http404
from rest_framework import exceptions, status
from rest_framework.response import Response
from rest_framework.views import exception_handler as drf_exception_handler


class DomainError(Exception):
    """
    A business rule refused the action.

    ``code`` is a stable machine name, ``message`` is for people,
    ``status`` is the HTTP status, ``errors`` optional field errors.
    """

    status = status.HTTP_400_BAD_REQUEST
    code = "invalid"

    def __init__(self, message: str = "", code: str | None = None, status_code: int | None = None, errors: dict | None = None):
        """Store the message, optional stable code, HTTP status and field errors."""
        super().__init__(message or self.code)
        self.message = message or self.code
        if code:
            self.code = code
        if status_code:
            self.status = status_code
        self.errors = errors


class NotFoundError(DomainError):
    """The object does not exist, or the caller may not know it exists."""

    status = status.HTTP_404_NOT_FOUND
    code = "not_found"


class ForbiddenError(DomainError):
    """The caller is signed in but may not do this."""

    status = status.HTTP_403_FORBIDDEN
    code = "forbidden"


class ConflictError(DomainError):
    """The action clashes with the current state (for example dates already booked)."""

    status = status.HTTP_409_CONFLICT
    code = "conflict"


def _body(code: str, message: str, status_code: int, errors: dict | None = None) -> dict:
    """Build the JSON body of an error response."""
    body = {"code": code, "message": message, "status": status_code}
    if errors:
        body["errors"] = errors
    return body


def api_exception_handler(exc, context):
    """
    DRF exception handler (configured in settings.REST_FRAMEWORK).

    Converts domain errors, Django errors and DRF errors to the single error
    shape described at the top of this module. Unknown exceptions return
    ``None`` so Django produces a normal 500 (and logs the traceback).
    """
    if isinstance(exc, DomainError):
        return Response(_body(exc.code, exc.message, exc.status, exc.errors), status=exc.status)

    if isinstance(exc, DjangoValidationError):
        errors = exc.message_dict if hasattr(exc, "error_dict") else {"non_field_errors": exc.messages}
        return Response(_body("invalid", "Invalid data.", 400, errors), status=400)

    if isinstance(exc, Http404):
        return Response(_body("not_found", "Not found.", 404), status=404)

    if isinstance(exc, DjangoPermissionDenied):
        return Response(_body("forbidden", "You may not do this.", 403), status=403)

    response = drf_exception_handler(exc, context)
    if response is None:
        return None

    if isinstance(exc, exceptions.ValidationError):
        detail = response.data
        errors = detail if isinstance(detail, dict) else {"non_field_errors": detail}
        response.data = _body("invalid", "Invalid data.", response.status_code, errors)
    elif isinstance(exc, (exceptions.NotAuthenticated, exceptions.AuthenticationFailed)):
        response.data = _body("unauthenticated", "Sign in to continue.", response.status_code)
    elif isinstance(exc, exceptions.PermissionDenied):
        response.data = _body("forbidden", str(exc.detail), response.status_code)
    elif isinstance(exc, exceptions.NotFound):
        response.data = _body("not_found", "Not found.", response.status_code)
    elif isinstance(exc, exceptions.Throttled):
        response.data = _body("rate_limited", "Too many requests. Try again later.", response.status_code)
    else:
        code = getattr(exc, "default_code", "error")
        response.data = _body(str(code), str(getattr(exc, "detail", exc)), response.status_code)
    return response
