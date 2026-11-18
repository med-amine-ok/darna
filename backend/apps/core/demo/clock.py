"""
A small "time machine" for the demo seed.

Business rules refuse to book a date in the past, and a stay only completes
after its check-out. To build past stays with the real services (booking,
acceptance, stay confirmation, completion, review) the seed runs each step
"as if" it happened at that moment: :func:`travel_to` replaces
``django.utils.timezone.now`` for the duration of the block.

Every service of this project reads the clock through ``timezone.now()`` (or
``apps.core.timeutils``, which calls it), and model fields use
``default=timezone.now``; both are redirected, so timestamps written during
the block carry the simulated time. The simulated clock keeps ticking with
the real one, so two rows written one after the other stay in order.

Only for the seed command and its test: never use this in request code.
"""

from contextlib import contextmanager
from datetime import datetime

from django.apps import apps
from django.utils import timezone

# The real clock, captured once at import (the patched one is a closure over it).
_REAL_NOW = timezone.now
# Fields found by the first call of :func:`travel_to` (the model registry is ready by then).
_FIELDS: list | None = None


def _fields_with_now_default() -> list:
    """Model fields whose default is the real ``timezone.now`` (``created_at`` and friends)."""
    fields = []
    for model in apps.get_models():
        for field in model._meta.concrete_fields:
            if getattr(field, "default", None) is _REAL_NOW:
                fields.append(field)
    return fields


def _set_default(field, default) -> None:
    """Change a field default; Django caches the default getter, so the cache is dropped too."""
    field.default = default
    field.__dict__.pop("_get_default", None)


@contextmanager
def travel_to(moment: datetime | None):
    """
    Run the block as if the current time were ``moment`` (aware datetime).

    ``None`` runs the block at the real time. Blocks may nest; each one
    restores what it replaced.
    """
    if moment is None:
        yield
        return
    if timezone.is_naive(moment):
        raise ValueError("travel_to needs an aware datetime.")
    started = _REAL_NOW()

    def simulated_now() -> datetime:
        """The simulated instant: ``moment`` plus the real time spent since the block started."""
        return moment + (_REAL_NOW() - started)

    global _FIELDS
    if _FIELDS is None:
        _FIELDS = _fields_with_now_default()
    previous_now = timezone.now
    previous_defaults = [field.default for field in _FIELDS]
    timezone.now = simulated_now
    for field in _FIELDS:
        _set_default(field, simulated_now)
    try:
        yield
    finally:
        timezone.now = previous_now
        for field, default in zip(_FIELDS, previous_defaults):
            _set_default(field, default)
