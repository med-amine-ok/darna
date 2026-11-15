"""
Outbound URL guard against server-side request forgery (R9, DEC-017, BR-HST-06).

Hosts give the platform URLs (hotel system ``base_url``, iCal links) that the
servers later fetch. Without a guard, a host could point them at the cloud
metadata service, the database or any machine of the private network. Rules:

- ``https`` only, no user name or password inside the URL;
- the host name must resolve, and EVERY address it resolves to must be public:
  no loopback, private, link-local, CGNAT (100.64.0.0/10), multicast,
  reserved, unspecified or metadata (169.254.169.254) address, IPv4 or IPv6
  (IPv4-mapped, 6to4, Teredo and NAT64 IPv6 forms are unwrapped first);
- checked when the URL is saved (:func:`validate_public_url`) and again when it
  is fetched (:func:`fetch_public_url`), because DNS answers can change;
- the fetch connects to the address that was checked (no second DNS lookup),
  follows no redirect to another host, stops after 10 seconds and 5 MB.

Every refusal raises ``DomainError(code="unsafe_url")``.
"""

import http.client
import ipaddress
import socket
import ssl
from dataclasses import dataclass, field
from urllib.parse import urljoin, urlsplit

from apps.core.errors import DomainError

# R9: limits of one outbound fetch.
FETCH_TIMEOUT_SECONDS = 10
FETCH_MAX_BYTES = 5 * 1024 * 1024
# Redirects are followed only on the same host and port, at most this many times.
FETCH_MAX_REDIRECTS = 3

# Ranges refused on top of what ``ipaddress`` already flags as not global.
_EXTRA_BLOCKED = [
    ipaddress.ip_network("100.64.0.0/10"),       # carrier-grade NAT (CGNAT)
    ipaddress.ip_network("169.254.169.254/32"),  # cloud metadata service
    ipaddress.ip_network("0.0.0.0/8"),           # "this network"
    ipaddress.ip_network("192.0.0.0/24"),        # IETF protocol assignments
    ipaddress.ip_network("198.18.0.0/15"),       # benchmarking
    ipaddress.ip_network("fd00:ec2::254/128"),   # AWS metadata over IPv6
    ipaddress.ip_network("64:ff9b::/96"),        # NAT64, may reach internal IPv4
    ipaddress.ip_network("64:ff9b:1::/48"),      # local-use NAT64
]


@dataclass
class FetchResult:
    """Answer of :func:`fetch_public_url`: final URL, HTTP status, headers (lower-case names) and body."""

    url: str
    status: int
    headers: dict[str, str] = field(default_factory=dict)
    body: bytes = b""


def _unsafe(message: str) -> DomainError:
    """Build the single refusal error of this module (R9, code ``unsafe_url``)."""
    return DomainError(message, code="unsafe_url", errors={"url": [message]})


def _unwrap(ip: ipaddress.IPv4Address | ipaddress.IPv6Address) -> ipaddress.IPv4Address | ipaddress.IPv6Address:
    """Return the IPv4 address hidden inside an IPv4-mapped, 6to4 or Teredo IPv6 address (R9)."""
    if isinstance(ip, ipaddress.IPv6Address):
        if ip.ipv4_mapped is not None:
            return ip.ipv4_mapped
        if ip.sixtofour is not None:
            return ip.sixtofour
        if ip.teredo is not None:
            return ip.teredo[1]
    return ip


def is_public_ip(value: str | ipaddress.IPv4Address | ipaddress.IPv6Address) -> bool:
    """
    True when ``value`` is a public unicast address that the servers may contact (R9).

    Refuses loopback, private, link-local, CGNAT, multicast, reserved,
    unspecified, metadata and every other non-global range, for IPv4 and IPv6.
    """
    try:
        ip = ipaddress.ip_address(str(value).split("%", 1)[0])  # drop an IPv6 zone id
    except ValueError:
        return False
    for candidate in {ip, _unwrap(ip)}:
        if (
            candidate.is_loopback or candidate.is_private or candidate.is_link_local
            or candidate.is_multicast or candidate.is_reserved or candidate.is_unspecified
            or not candidate.is_global
        ):
            return False
        if any(candidate in network for network in _EXTRA_BLOCKED if network.version == candidate.version):
            return False
    return True


def _resolve(host: str, port: int) -> list[str]:
    """Every address ``host`` resolves to (IPv4 and IPv6). Raises ``unsafe_url`` when it does not resolve."""
    try:
        infos = socket.getaddrinfo(host, port, type=socket.SOCK_STREAM)
    except (socket.gaierror, UnicodeError, OSError) as exc:
        raise _unsafe("The address of this URL cannot be found.") from exc
    addresses = []
    for info in infos:
        address = info[4][0]
        if address not in addresses:
            addresses.append(address)
    if not addresses:
        raise _unsafe("The address of this URL cannot be found.")
    return addresses


def _split(url: str) -> tuple[str, int, str]:
    """Check the shape of ``url`` (https, host, no credentials) and return ``(host, port, path_and_query)``."""
    if not isinstance(url, str) or not url.strip() or any(ch in url for ch in "\r\n\t "):
        raise _unsafe("Give a valid https URL.")
    try:
        parts = urlsplit(url.strip())
        port = parts.port or 443
    except ValueError as exc:
        raise _unsafe("Give a valid https URL.") from exc
    if parts.scheme.lower() != "https":
        raise _unsafe("Only https URLs are accepted.")
    if parts.username is not None or parts.password is not None:
        raise _unsafe("A URL may not contain a user name or password.")
    host = (parts.hostname or "").rstrip(".")
    if not host:
        raise _unsafe("Give a valid https URL.")
    path = parts.path or "/"
    if parts.query:
        path = f"{path}?{parts.query}"
    return host, port, path


def validate_public_url(url: str) -> list[str]:
    """
    Refuse a URL the servers must not contact (R9); return the checked addresses.

    Called when a host saves a URL and again before every fetch. Raises
    ``DomainError(code="unsafe_url")`` when the URL is not https, carries
    credentials, does not resolve, or resolves to ANY non-public address.
    """
    host, port, _ = _split(url)
    addresses = _resolve(host, port)
    for address in addresses:
        if not is_public_ip(address):
            raise _unsafe("This URL points to a private or reserved network address.")
    return addresses


class _PinnedHTTPSConnection(http.client.HTTPSConnection):
    """HTTPS connection to an address that was already checked, with SNI and certificate check on the real host name."""

    def __init__(self, host: str, address: str, port: int, timeout: float):
        """Remember the checked ``address``; ``host`` is still used for TLS and the Host header."""
        super().__init__(host, port, timeout=timeout, context=ssl.create_default_context())
        self._pinned_address = address

    def connect(self) -> None:
        """Open the TCP socket to the pinned address (no new DNS lookup), then start TLS for ``self.host``."""
        sock = socket.create_connection((self._pinned_address, self.port), self.timeout)
        self.sock = self._context.wrap_socket(sock, server_hostname=self.host)


def _request(host: str, address: str, port: int, path: str, timeout: float, headers: dict[str, str]):
    """Send one GET to the pinned address and return the ``http.client`` response (open, body not read)."""
    connection = _PinnedHTTPSConnection(host, address, port, timeout)
    connection.request("GET", path, headers={"User-Agent": "BLADUS-sync/1", **headers})
    return connection.getresponse()


def _read_capped(response, max_bytes: int) -> bytes:
    """Read the body, refusing more than ``max_bytes`` (R9: 5 MB cap)."""
    declared = response.getheader("Content-Length")
    if declared and declared.isdigit() and int(declared) > max_bytes:
        raise _unsafe("The answer of this URL is too large.")
    chunks, total = [], 0
    while True:
        chunk = response.read(64 * 1024)
        if not chunk:
            break
        total += len(chunk)
        if total > max_bytes:
            raise _unsafe("The answer of this URL is too large.")
        chunks.append(chunk)
    return b"".join(chunks)


def fetch_public_url(url: str, *, headers: dict[str, str] | None = None, timeout: float = FETCH_TIMEOUT_SECONDS,
                     max_bytes: int = FETCH_MAX_BYTES) -> FetchResult:
    """
    GET a host-given URL safely (R9). The only way the sync adapters may fetch such a URL.

    The URL is validated again now, the connection goes to the checked
    address, redirects are followed only on the same host and port (at most
    :data:`FETCH_MAX_REDIRECTS`), each request stops after ``timeout``
    seconds and the body may not exceed ``max_bytes``. Raises
    ``DomainError(code="unsafe_url")`` on any refusal; network failures raise
    ``DomainError(code="fetch_failed", status 502)``.
    """
    current = url
    first_host, first_port, _ = _split(url)
    for _ in range(FETCH_MAX_REDIRECTS + 1):
        host, port, path = _split(current)
        if (host.lower(), port) != (first_host.lower(), first_port):
            raise _unsafe("Redirects to another host are not followed.")
        address = validate_public_url(current)[0]
        try:
            response = _request(host, address, port, path, timeout, headers or {})
            if response.status in (301, 302, 303, 307, 308):
                location = response.getheader("Location")
                response.close()
                if not location:
                    raise DomainError("The URL answered a redirect without a target.", code="fetch_failed", status_code=502)
                current = urljoin(current, location)
                continue
            body = _read_capped(response, max_bytes)
            return FetchResult(
                url=current, status=response.status,
                headers={name.lower(): value for name, value in response.getheaders()}, body=body,
            )
        except (OSError, http.client.HTTPException) as exc:
            raise DomainError("The URL could not be reached.", code="fetch_failed", status_code=502) from exc
    raise _unsafe("Too many redirects.")
