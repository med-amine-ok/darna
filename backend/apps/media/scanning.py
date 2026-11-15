"""
Virus scanning and file type sniffing (BR-MED-02, BR-MED-01).

The scanner is pluggable with ``MEDIA_SCANNER`` (dotted path of a class with
a ``scan(data: bytes) -> str`` method returning ``clean``, ``infected`` or
``error``). The default :class:`StubScanner` is for development and tests
only: it reports every file clean except one that contains the standard
EICAR test string, so the rejection path can be tested without ClamAV.
Production must plug a ClamAV scanner (07-architecture, ``media.scan_document``).
# TODO(config): move MEDIA_SCANNER to backend/settings.py.
"""

from django.utils.module_loading import import_string

from .storage import setting

# The industry standard harmless test "virus" (EICAR); every real scanner flags it.
EICAR = b"X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*"

CLEAN = "clean"
INFECTED = "infected"
ERROR = "error"


class StubScanner:
    """Development scanner: clean unless the EICAR test string is present. Not a real antivirus."""

    def scan(self, data: bytes) -> str:
        """``infected`` for the EICAR test file, ``clean`` otherwise."""
        return INFECTED if EICAR in data else CLEAN


def get_scanner():
    """Instance of the configured scanner class (default :class:`StubScanner`)."""
    path = setting("MEDIA_SCANNER", "apps.media.scanning.StubScanner")
    return import_string(path)()


def sniff_mime(head: bytes) -> str | None:
    """
    Real type of a file from its first bytes, so a renamed file cannot pass (BR-MED-01, BR-MED-02).

    Returns one of the MIME types we accept, or ``None`` when unknown.
    """
    if head.startswith(b"\xff\xd8\xff"):
        return "image/jpeg"
    if head.startswith(b"\x89PNG\r\n\x1a\n"):
        return "image/png"
    if head[:4] == b"RIFF" and head[8:12] == b"WEBP":
        return "image/webp"
    if head[4:8] == b"ftyp" and head[8:12] in (b"heic", b"heix", b"hevc", b"heim", b"heis", b"mif1", b"msf1"):
        return "image/heic"
    if head.startswith(b"%PDF-"):
        return "application/pdf"
    return None
