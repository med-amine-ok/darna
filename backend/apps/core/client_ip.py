"""
The visitor's real IP address when the request comes through the website or admin server (BR-SYS-07).

Browsers never call Django directly: the Next.js servers (website and admin,
on Vercel) call it for them. Without help, every visitor would look like the
Vercel server, so the per IP limits (one-time codes, sign-in lockouts, request
rates) would be shared by the whole site.

The Next.js servers therefore send two headers: ``X-Bladus-Client-IP`` (the
visitor's address, as Vercel saw it) and ``X-Bladus-Proxy-Secret`` (the shared
secret ``BFF_PROXY_SECRET``). The address is believed only when the secret
matches, so nobody can fake an address to dodge the limits. Both headers are
removed before any view runs.
"""

import hmac
import ipaddress

from django.conf import settings

IP_HEADER = "HTTP_X_BLADUS_CLIENT_IP"
SECRET_HEADER = "HTTP_X_BLADUS_PROXY_SECRET"


def trusted_client_ip(meta: dict) -> str | None:
    """The forwarded visitor address when the secret matches and the address is valid, else ``None``."""
    secret = getattr(settings, "BFF_PROXY_SECRET", "")
    given = meta.get(SECRET_HEADER, "")
    if not secret or not given or not hmac.compare_digest(given.encode(), secret.encode()):
        return None
    candidate = meta.get(IP_HEADER, "").strip()
    try:
        return str(ipaddress.ip_address(candidate))
    except ValueError:
        return None


class TrustedClientIpMiddleware:
    """
    Put the visitor's address where every limit reads it (``REMOTE_ADDR`` and
    ``X-Forwarded-For``) when a trusted Next.js server vouches for it.

    ``apps.accounts.views.client_ip`` and Django REST framework's throttles
    then see the visitor, not Vercel. Must run first (top of MIDDLEWARE).
    """

    def __init__(self, get_response):
        """Standard Django middleware constructor."""
        self.get_response = get_response

    def __call__(self, request):
        """Rewrite the address for vouched requests; always drop the two private headers."""
        ip = trusted_client_ip(request.META)
        request.META.pop(IP_HEADER, None)
        request.META.pop(SECRET_HEADER, None)
        if ip:
            request.META["REMOTE_ADDR"] = ip
            request.META["HTTP_X_FORWARDED_FOR"] = ip
        return self.get_response(request)
