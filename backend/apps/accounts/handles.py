"""
Public profile handles (ACC-06): the short name in a profile link.

Every user gets one, so a profile can be shared as ``/users/karim-m`` instead
of ``/users/<uuid>``. It is made from the public display name (first name and
last initial, never the family name), lower case, ASCII letters, digits and
hyphens, and made unique with a number (``karim-m-2``). People may change it;
the old link then stops working, the id link always keeps working.
"""

import re
import uuid

from django.utils.text import slugify

# 3 to 30 characters: letters, digits and single hyphens, no hyphen at either end.
HANDLE_RE = re.compile(r"^[a-z0-9](?:[a-z0-9]|-(?=[a-z0-9])){2,29}$")
MAX_LENGTH = 30

# Words that would look official or clash with site paths.
RESERVED = frozenset({
    "admin", "administrator", "bladus", "darna", "support", "help", "staff", "team", "moderator",
    "official", "security", "api", "me", "settings", "profile", "users", "user", "host", "hosts",
    "login", "logout", "signup", "register", "search", "listings", "trips", "messages", "null",
    "undefined", "root", "system", "notifications", "favorites", "reservations",
})


def is_valid(handle: str) -> bool:
    """True when ``handle`` has the allowed shape and is not reserved."""
    return bool(HANDLE_RE.match(handle or "")) and handle not in RESERVED


def base_for(display_name: str) -> str:
    """The handle a display name suggests (``"Karim M."`` -> ``"karim-m"``), or ``"user"``."""
    base = slugify(display_name or "")[:MAX_LENGTH].strip("-")
    base = re.sub(r"-{2,}", "-", base)
    if len(base) < 3 or base in RESERVED:
        base = f"{base}-user".strip("-") if len(base) >= 1 and base not in RESERVED else "user"
    return base


def unique_handle(display_name: str, *, taken) -> str:
    """
    A free handle for ``display_name``. ``taken(handle) -> bool`` says whether
    another user already has it; a number is added until it is free.
    """
    base = base_for(display_name)
    if is_valid(base) and not taken(base):
        return base
    for number in range(2, 1000):
        suffix = f"-{number}"
        candidate = f"{base[: MAX_LENGTH - len(suffix)]}{suffix}"
        if not taken(candidate):
            return candidate
    return f"user-{uuid.uuid4().hex[:8]}"
