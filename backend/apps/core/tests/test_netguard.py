"""Tests of the outbound URL guard (R9 SSRF rule). DNS is mocked: no test touches the network."""

import socket

import pytest

from apps.core import netguard
from apps.core.errors import DomainError


def fake_dns(monkeypatch, table: dict[str, list[str]]):
    """Replace ``socket.getaddrinfo`` so ``host`` resolves to the addresses in ``table`` (else NXDOMAIN)."""

    def getaddrinfo(host, port, *args, **kwargs):
        """Answer like the real resolver, from ``table``."""
        if host not in table:
            raise socket.gaierror(socket.EAI_NONAME, "Name or service not known")
        return [
            (socket.AF_INET6 if ":" in ip else socket.AF_INET, socket.SOCK_STREAM, 6, "", (ip, port))
            for ip in table[host]
        ]

    monkeypatch.setattr(netguard.socket, "getaddrinfo", getaddrinfo)


def assert_unsafe(url: str):
    """``validate_public_url(url)`` must refuse with code ``unsafe_url``."""
    with pytest.raises(DomainError) as exc:
        netguard.validate_public_url(url)
    assert exc.value.code == "unsafe_url"


def test_br_sec_ssrf_01_public_https_url_is_accepted(monkeypatch):
    """A https URL resolving only to public addresses passes and returns them."""
    fake_dns(monkeypatch, {"pms.example.com": ["93.184.216.34", "2606:2800:220:1:248:1893:25c8:1946"]})
    assert netguard.validate_public_url("https://pms.example.com/api/v2?x=1") == [
        "93.184.216.34", "2606:2800:220:1:248:1893:25c8:1946",
    ]


@pytest.mark.parametrize("url", [
    "http://pms.example.com/",            # not https
    "ftp://pms.example.com/",
    "https://user:pass@pms.example.com/",  # credentials in the URL
    "https:///nohost",
    "",
    "https://pms.example.com/a b",
    "https://pms.example.com:99999/",      # invalid port
])
def test_br_sec_ssrf_02_bad_shape_is_refused(monkeypatch, url):
    """Only well-formed https URLs without credentials are accepted."""
    fake_dns(monkeypatch, {"pms.example.com": ["93.184.216.34"]})
    assert_unsafe(url)


@pytest.mark.parametrize("address", [
    "127.0.0.1", "10.1.2.3", "172.16.0.5", "192.168.1.1",   # loopback, private
    "169.254.169.254", "169.254.10.10",                       # metadata, link-local
    "100.64.0.1", "100.127.255.254",                          # CGNAT
    "224.0.0.1", "239.255.255.250",                           # multicast
    "240.0.0.1", "255.255.255.255", "0.0.0.0", "0.1.2.3",     # reserved, broadcast, unspecified
    "198.18.0.1", "192.0.0.8",                                # benchmarking, IETF
    "::1", "::", "fe80::1", "fc00::1", "fd12:3456::1",        # IPv6 loopback, unspecified, link-local, ULA
    "ff02::1",                                                # IPv6 multicast
    "::ffff:127.0.0.1", "::ffff:169.254.169.254",             # IPv4-mapped
    "2002:a9fe:a9fe::1",                                      # 6to4 wrapping 169.254.169.254
    "64:ff9b::a9fe:a9fe",                                     # NAT64 to metadata
    "fd00:ec2::254",                                          # AWS metadata IPv6
    "2001:db8::1",                                            # documentation
])
def test_br_sec_ssrf_03_non_public_addresses_are_refused(monkeypatch, address):
    """Every non-public IPv4 and IPv6 range is refused, as a DNS answer and as a literal."""
    fake_dns(monkeypatch, {"evil.example.com": [address], address: [address]})
    assert_unsafe("https://evil.example.com/calendar.ics")
    literal = f"[{address}]" if ":" in address else address
    assert_unsafe(f"https://{literal}/calendar.ics")


def test_br_sec_ssrf_04_one_private_answer_among_public_ones_is_refused(monkeypatch):
    """A name resolving to a public AND a private address is refused (DNS round-robin trick)."""
    fake_dns(monkeypatch, {"mixed.example.com": ["93.184.216.34", "10.0.0.7"]})
    assert_unsafe("https://mixed.example.com/")


def test_br_sec_ssrf_05_unresolvable_host_is_refused(monkeypatch):
    """A name that does not resolve is refused with the same code."""
    fake_dns(monkeypatch, {})
    assert_unsafe("https://nowhere.example.com/")


class FakeResponse:
    """Minimal ``http.client.HTTPResponse`` stand-in for :func:`netguard.fetch_public_url`."""

    def __init__(self, status=200, body=b"", headers=None):
        """Keep the status, the body to stream and the headers."""
        self.status = status
        self._body = body
        self._headers = headers or {}

    def getheader(self, name, default=None):
        """Header value by name."""
        return self._headers.get(name, default)

    def getheaders(self):
        """Every header as ``(name, value)`` pairs."""
        return list(self._headers.items())

    def read(self, size=-1):
        """Return the next ``size`` bytes of the body."""
        chunk, self._body = (self._body, b"") if size < 0 else (self._body[:size], self._body[size:])
        return chunk

    def close(self):
        """Nothing to release."""


def test_br_sec_ssrf_06_fetch_connects_to_the_checked_address(monkeypatch):
    """The fetch validates again and connects to the resolved public address, with the real host name."""
    fake_dns(monkeypatch, {"ical.example.com": ["93.184.216.34"]})
    calls = []

    def request(host, address, port, path, timeout, headers):
        """Record the connection parameters and answer 200."""
        calls.append((host, address, port, path, timeout))
        return FakeResponse(body=b"BEGIN:VCALENDAR", headers={"Content-Type": "text/calendar"})

    monkeypatch.setattr(netguard, "_request", request)
    result = netguard.fetch_public_url("https://ical.example.com/feed.ics?k=1")
    assert result.status == 200 and result.body == b"BEGIN:VCALENDAR" and result.headers["content-type"] == "text/calendar"
    assert calls == [("ical.example.com", "93.184.216.34", 443, "/feed.ics?k=1", netguard.FETCH_TIMEOUT_SECONDS)]


def test_br_sec_ssrf_07_fetch_rechecks_dns_and_refuses_rebinding(monkeypatch):
    """A URL valid when saved but resolving to a private address at fetch time is refused before connecting."""
    fake_dns(monkeypatch, {"ical.example.com": ["93.184.216.34"]})
    netguard.validate_public_url("https://ical.example.com/feed.ics")
    fake_dns(monkeypatch, {"ical.example.com": ["127.0.0.1"]})
    monkeypatch.setattr(netguard, "_request", lambda *a, **k: pytest.fail("must not connect"))
    with pytest.raises(DomainError) as exc:
        netguard.fetch_public_url("https://ical.example.com/feed.ics")
    assert exc.value.code == "unsafe_url"


def test_br_sec_ssrf_08_fetch_refuses_redirect_to_other_host_and_big_body(monkeypatch):
    """Redirects to another host are not followed; same-host ones are; bodies over the cap are refused."""
    fake_dns(monkeypatch, {"a.example.com": ["93.184.216.34"], "b.example.com": ["93.184.216.35"]})
    answers = {
        "/away": FakeResponse(302, headers={"Location": "https://b.example.com/x"}),
        "/move": FakeResponse(301, headers={"Location": "/final"}),
        "/final": FakeResponse(200, body=b"ok"),
        "/big": FakeResponse(200, body=b"x" * 2048),
        "/declared": FakeResponse(200, body=b"", headers={"Content-Length": str(10**9)}),
    }
    monkeypatch.setattr(netguard, "_request", lambda host, address, port, path, timeout, headers: answers[path])

    with pytest.raises(DomainError) as exc:
        netguard.fetch_public_url("https://a.example.com/away")
    assert exc.value.code == "unsafe_url"
    assert netguard.fetch_public_url("https://a.example.com/move").body == b"ok"
    for path in ("/big", "/declared"):
        with pytest.raises(DomainError) as exc:
            netguard.fetch_public_url(f"https://a.example.com{path}", max_bytes=1024)
        assert exc.value.code == "unsafe_url"


def test_br_sec_ssrf_09_network_failure_is_fetch_failed(monkeypatch):
    """A timeout or refused connection becomes ``fetch_failed`` (502), never a raw exception."""
    fake_dns(monkeypatch, {"a.example.com": ["93.184.216.34"]})

    def request(*args, **kwargs):
        """Simulate a timeout."""
        raise TimeoutError("timed out")

    monkeypatch.setattr(netguard, "_request", request)
    with pytest.raises(DomainError) as exc:
        netguard.fetch_public_url("https://a.example.com/")
    assert exc.value.code == "fetch_failed" and exc.value.status == 502
