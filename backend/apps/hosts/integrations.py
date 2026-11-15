"""
Sync adapters of hotel system connections (DEC-017, BR-HST-06).

One small adapter per connection kind (channel manager, PMS, iCal feed, CSV
file) imports room types, availability per night, prices and services. No
adapter is built yet: a sync of a kind without adapter ends ``failed`` with a
clear message, and the connection keeps its last good data (BR-HST-06).

An adapter is a function ``adapter(integration) -> dict`` returning
``{"status": "ok" | "partial", "rooms_changed": int, "nights_changed": int,
"services_changed": int, "error": str}``; it raises on failure. It must call
:func:`apps.core.netguard.validate_public_url` before each fetch (BR-SYS-06)
and decrypt credentials only through :func:`apps.hosts.crypto.decrypt_secret`.
"""

from collections.abc import Callable

# Connection kind -> adapter. Filled by :func:`register_adapter` (tests register fakes).
SYNC_ADAPTERS: dict[str, Callable] = {}


def register_adapter(kind: str, adapter: Callable) -> None:
    """Make ``adapter`` the importer of connections of ``kind`` (``channel_manager``, ``pms``, ``ical``, ``csv_import``)."""
    SYNC_ADAPTERS[kind] = adapter


def run_adapter(integration) -> dict:
    """
    Run the adapter of the connection's kind and return its counters (BR-HST-06).

    Raises ``RuntimeError`` when no adapter exists for that kind yet; the
    caller logs the run as failed.
    """
    adapter = SYNC_ADAPTERS.get(integration.kind)
    if adapter is None:
        raise RuntimeError(f"Automatic import from {integration.get_kind_display()} is not available yet.")
    return adapter(integration) or {}
