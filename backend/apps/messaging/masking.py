"""
Contact masking (BR-MSG-01).

Before a booking is confirmed, phone numbers, email addresses, CCP or RIP
account numbers and messaging-app links are hidden from the other side, so
guest and host do not move off the platform (and outside its protections).

``mask("Call me on 0555 12 34 56")`` gives ``"Call me on 0555 ** ** **"``:
the first 4 digits stay (enough to recognise "a mobile number"), the other
digits become ``*`` and the separators stay.
"""

import re

# Messaging apps and social profiles people use to leave the platform.
_LINK_RE = re.compile(
    r"(?:https?://)?(?:www\.)?"
    r"(?:wa\.me|(?:api|chat|web)\.whatsapp\.com|whatsapp\.com|t\.me|telegram\.(?:me|org)|viber\.(?:com|me)|"
    r"invite\.viber\.com|m\.me|messenger\.com|signal\.me|instagram\.com|facebook\.com|fb\.com|fb\.me|snapchat\.com|"
    r"tiktok\.com)"
    r"(?:/\S*)?",
    re.IGNORECASE,
)
_EMAIL_RE = re.compile(r"[A-Za-z0-9._%+-]+\s*(?:@|\(at\)|\[at\])\s*[A-Za-z0-9-]+(?:\s*\.\s*[A-Za-z0-9-]+)+")
# A run of at least 8 digits, possibly split by spaces, dots, dashes or slashes:
# Algerian phones (0555 12 34 56, +213 555 12 34 56), CCP (0012345678 cle 12), RIP (20 digits).
_DIGITS_RE = re.compile(r"\+?\d(?:[\s.\-/]*\d){7,}")

KEEP_DIGITS = 4
LINK_PLACEHOLDER = "[link hidden]"
EMAIL_PLACEHOLDER = "[email hidden]"


def _mask_digits(match: re.Match) -> str:
    """
    Keep the first digits and the separators, replace the other digits with ``*``.

    Runs that start with 1 to 9 and have fewer than 10 digits are left alone:
    they are dates (2026-11-15) or amounts, not phone or account numbers.
    """
    raw = match.group(0)
    if raw[0] not in "+0" and sum(c.isdigit() for c in raw) < 10:
        return raw
    kept, out = 0, []
    for char in raw:
        if char.isdigit():
            out.append(char if kept < KEEP_DIGITS else "*")
            kept += 1
        else:
            out.append(char)
    return "".join(out)


def mask(text: str) -> str:
    """Return ``text`` with contact details hidden (BR-MSG-01). Text without contact details comes back unchanged."""
    text = _LINK_RE.sub(LINK_PLACEHOLDER, text)
    text = _EMAIL_RE.sub(EMAIL_PLACEHOLDER, text)
    return _DIGITS_RE.sub(_mask_digits, text)


def contains_contact_info(text: str) -> bool:
    """True when :func:`mask` would change the text."""
    return mask(text) != text
