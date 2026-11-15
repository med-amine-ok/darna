"""
Pluggable payment gateway backends and the switches of the dormant money models.

DEC-019: there is no online payment in the first release. The guest payment
endpoint, the gateway webhook and payouts exist in the code so the contract
is complete, but they answer 404 while their switch is off (BR-PAY-11).

- :data:`GUEST_PAYMENTS_ENABLED` and :data:`PAYOUTS_ENABLED` are the
  switches (models M2 to M4). Both are off.
- :data:`GATEWAY_BACKEND` is the dotted path of the backend class. The
  default :class:`DisabledGateway` refuses everything; :class:`LocalGateway`
  makes fake checkouts without any network call (local runs and tests).
- Webhook secrets come from ``settings.GATEWAY_WEBHOOK_SECRETS``
  (``{"chargily": "..."}``); with no secret, no signature is ever valid.
"""

import hashlib
import hmac
import uuid
from dataclasses import dataclass

from django.conf import settings
from django.utils.module_loading import import_string

# TODO(config): move to platform settings (flags ``guest_payments`` and ``payouts``, BR-PAY-11).
GUEST_PAYMENTS_ENABLED = False
PAYOUTS_ENABLED = False
# TODO(config): move to platform settings. Dotted path of the gateway backend class.
GATEWAY_BACKEND = "apps.ledger.gateways.DisabledGateway"
# TODO(config): move to platform settings. Gateway used for new guest payments.
DEFAULT_PROVIDER = "chargily"


@dataclass
class Checkout:
    """What a gateway answers when a checkout is opened: its id and the page the guest is sent to."""

    checkout_id: str
    url: str


class DisabledGateway:
    """Default backend: online payment is off (DEC-019). Every call is refused."""

    enabled = False

    def create_checkout(self, *, provider: str, amount_minor: int, currency: str, reference: str) -> Checkout:
        """Never called while disabled; raises to make a wiring mistake loud."""
        raise RuntimeError("Online payment is disabled (DEC-019).")


class LocalGateway:
    """Backend for local runs and tests: a fake checkout, no network call."""

    enabled = True

    def create_checkout(self, *, provider: str, amount_minor: int, currency: str, reference: str) -> Checkout:
        """Return a made-up checkout id and a URL on a reserved domain."""
        checkout_id = f"local_{uuid.uuid4().hex[:20]}"
        return Checkout(checkout_id=checkout_id, url=f"https://checkout.example.invalid/{provider}/{checkout_id}")


def get_backend():
    """An instance of the configured gateway backend."""
    return import_string(GATEWAY_BACKEND)()


def guest_payments_enabled() -> bool:
    """True when guest payments are switched on and a working backend is configured (BR-PAY-11)."""
    return bool(GUEST_PAYMENTS_ENABLED) and bool(getattr(get_backend(), "enabled", False))


def payouts_enabled() -> bool:
    """True when payouts (model M4) are switched on (BR-PAY-11)."""
    return bool(PAYOUTS_ENABLED)


def webhook_secret(provider: str) -> str:
    """Shared secret of a provider, from ``settings.GATEWAY_WEBHOOK_SECRETS``; empty when not configured."""
    return (getattr(settings, "GATEWAY_WEBHOOK_SECRETS", {}) or {}).get(provider, "")


def signature_valid(provider: str, raw_body: bytes, signature: str) -> bool:
    """
    Check the HMAC-SHA256 of the raw body with the provider secret (BR-SYS-02).

    Constant-time comparison; always ``False`` without a secret or a signature.
    """
    secret = webhook_secret(provider)
    if not secret or not signature:
        return False
    expected = hmac.new(secret.encode(), raw_body, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, signature.strip().lower())
