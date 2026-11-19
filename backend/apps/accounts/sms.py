"""
SMS sending behind a small interface.

``settings.SMS_BACKEND`` holds the dotted path of the class to use:

- ``apps.accounts.sms.TwilioSmsBackend``: Twilio (TWILIO_ACCOUNT_SID,
  TWILIO_AUTH_TOKEN, and TWILIO_FROM or TWILIO_MESSAGING_SERVICE_SID);
- ``apps.accounts.sms.InfobipSmsBackend``: Infobip (INFOBIP_BASE_URL,
  INFOBIP_API_KEY, INFOBIP_SENDER);
- ``apps.accounts.sms.ConsoleSmsBackend``: development, writes the message
  (and its code) to the log instead of sending it. Never in production.

Every provider error raises ``SmsSendError``; the caller answers 503
``otp_send_failed`` and the person can ask for a new code. The real
providers never log the message text (a code is a secret) and mask numbers.
"""

import logging

import requests
from django.conf import settings
from django.utils.module_loading import import_string

logger = logging.getLogger("bladus.sms")


TIMEOUT_SECONDS = 10


class SmsSendError(Exception):
    """The provider did not accept the message (bad settings, no credit, refused number, network)."""


class SmsBackend:
    """Interface every SMS provider adapter must implement."""

    def send(self, phone_e164: str, text: str) -> None:
        """Send ``text`` to ``phone_e164``. Raise an exception if it fails."""
        raise NotImplementedError


class ConsoleSmsBackend(SmsBackend):
    """Development backend: writes the message to the log instead of sending it."""

    def send(self, phone_e164: str, text: str) -> None:
        """Log the SMS (visible in the runserver console)."""
        logger.warning("SMS to %s: %s", phone_e164, text)


class MemorySmsBackend(SmsBackend):
    """Test backend: keeps messages in ``MemorySmsBackend.outbox`` so tests can read the code."""

    outbox: list[tuple[str, str]] = []

    def send(self, phone_e164: str, text: str) -> None:
        """Store the message in memory."""
        self.outbox.append((phone_e164, text))


def _masked(phone_e164: str) -> str:
    """+213555123456 -> +213*****3456: enough to follow a problem in the logs, not to read the number."""
    return f"{phone_e164[:4]}*****{phone_e164[-4:]}" if len(phone_e164) > 8 else "***"


def _require(*names: str) -> list[str]:
    """The settings ``names``, or SmsSendError naming the missing ones (a setup problem)."""
    values = [getattr(settings, name, "") or "" for name in names]
    missing = [name for name, value in zip(names, values) if not value]
    if missing:
        raise SmsSendError(f"SMS provider not configured: missing {', '.join(missing)}")
    return values


def _json(response) -> dict:
    """The provider's JSON answer, or an empty dict when it is not JSON."""
    try:
        value = response.json()
    except ValueError:
        return {}
    return value if isinstance(value, dict) else {}


class TwilioSmsBackend(SmsBackend):
    """
    Twilio Programmable Messaging (https://www.twilio.com/docs/messaging/api/message-resource).

    Sends through TWILIO_MESSAGING_SERVICE_SID when set (Twilio picks the
    sender and applies each country's rules), else from TWILIO_FROM (a Twilio
    number or an approved sender name). For Algeria, check Twilio's sender
    rules (alphanumeric sender registration) before launch.
    """

    def send(self, phone_e164: str, text: str) -> None:
        """POST the message to Twilio; raise SmsSendError unless Twilio queued it."""
        sid, token = _require("TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN")
        data = {"To": phone_e164, "Body": text}
        service = getattr(settings, "TWILIO_MESSAGING_SERVICE_SID", "")
        if service:
            data["MessagingServiceSid"] = service
        else:
            data["From"] = _require("TWILIO_FROM")[0]
        try:
            response = requests.post(
                f"https://api.twilio.com/2010-04-01/Accounts/{sid}/Messages.json",
                data=data,
                auth=(sid, token),
                timeout=TIMEOUT_SECONDS,
            )
        except requests.RequestException as exc:
            raise SmsSendError("Twilio cannot be reached") from exc
        if response.status_code not in (200, 201):
            detail = _json(response)
            raise SmsSendError(
                f"Twilio refused the message: status={response.status_code} "
                f"code={detail.get('code')} to={_masked(phone_e164)}"
            )


class InfobipSmsBackend(SmsBackend):
    """
    Infobip SMS (https://www.infobip.com/docs/api/channels/sms/sms-messaging/outbound-sms/send-sms-message).

    INFOBIP_BASE_URL is the personal API address shown in the Infobip portal
    (for example https://xxxxx.api.infobip.com); INFOBIP_SENDER the approved
    sender name or number.
    """

    def send(self, phone_e164: str, text: str) -> None:
        """POST the message to Infobip; raise SmsSendError unless it was accepted."""
        base_url, api_key, sender = _require("INFOBIP_BASE_URL", "INFOBIP_API_KEY", "INFOBIP_SENDER")
        payload = {"messages": [{"from": sender, "destinations": [{"to": phone_e164.lstrip("+")}], "text": text}]}
        try:
            response = requests.post(
                f"{base_url.rstrip('/')}/sms/2/text/advanced",
                json=payload,
                headers={"Authorization": f"App {api_key}", "Accept": "application/json"},
                timeout=TIMEOUT_SECONDS,
            )
        except requests.RequestException as exc:
            raise SmsSendError("Infobip cannot be reached") from exc
        if response.status_code != 200:
            raise SmsSendError(f"Infobip refused the message: status={response.status_code} to={_masked(phone_e164)}")
        status = ((_json(response).get("messages") or [{}])[0].get("status") or {}).get("groupName", "")
        if status in ("REJECTED", "UNDELIVERABLE"):
            raise SmsSendError(f"Infobip rejected the message: {status} to={_masked(phone_e164)}")


def get_sms_backend() -> SmsBackend:
    """Instantiate the backend named in settings."""
    return import_string(settings.SMS_BACKEND)()
