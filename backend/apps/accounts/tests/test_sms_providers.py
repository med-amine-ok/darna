"""Real SMS senders (Twilio, Infobip): what they send, how they fail, and that codes never reach the logs."""

import logging
import re

import pytest
import requests

from apps.accounts import sms
from apps.accounts.services import code_message

pytestmark = pytest.mark.django_db


class Answer:
    """A fake HTTP answer from a provider."""

    def __init__(self, status: int, body: dict):
        self.status_code = status
        self._body = body

    def json(self):
        return self._body


@pytest.fixture
def twilio(settings):
    """Twilio configured with test values."""
    settings.TWILIO_ACCOUNT_SID = "ACtest"
    settings.TWILIO_AUTH_TOKEN = "token"
    settings.TWILIO_FROM = "+15005550006"
    settings.TWILIO_MESSAGING_SERVICE_SID = ""


@pytest.fixture
def infobip(settings):
    """Infobip configured with test values."""
    settings.INFOBIP_BASE_URL = "https://abc.api.infobip.com/"
    settings.INFOBIP_API_KEY = "key"
    settings.INFOBIP_SENDER = "BLADUS"


def test_twilio_sends_to_the_right_account_and_number(twilio, monkeypatch):
    """The message goes to Twilio's Messages API with the account's credentials."""
    seen = {}

    def fake_post(url, data=None, auth=None, timeout=None, **kwargs):
        seen.update(url=url, data=data, auth=auth)
        return Answer(201, {"sid": "SM1"})

    monkeypatch.setattr(requests, "post", fake_post)
    sms.TwilioSmsBackend().send("+213555123456", "hello")
    assert seen["url"] == "https://api.twilio.com/2010-04-01/Accounts/ACtest/Messages.json"
    assert seen["data"] == {"To": "+213555123456", "Body": "hello", "From": "+15005550006"}
    assert seen["auth"] == ("ACtest", "token")


def test_twilio_prefers_the_messaging_service(twilio, settings, monkeypatch):
    """With a messaging service, Twilio picks the sender (no From)."""
    settings.TWILIO_MESSAGING_SERVICE_SID = "MGservice"
    seen = {}
    monkeypatch.setattr(requests, "post", lambda url, data=None, **k: seen.update(data=data) or Answer(201, {}))
    sms.TwilioSmsBackend().send("+213555123456", "hello")
    assert seen["data"]["MessagingServiceSid"] == "MGservice" and "From" not in seen["data"]


def test_twilio_refusal_raises_without_the_full_number(twilio, monkeypatch):
    """A refused message raises SmsSendError naming Twilio's code, with the number masked."""
    monkeypatch.setattr(requests, "post", lambda *a, **k: Answer(400, {"code": 21211}))
    with pytest.raises(sms.SmsSendError) as caught:
        sms.TwilioSmsBackend().send("+213555123456", "hello")
    assert "21211" in str(caught.value) and "+213555123456" not in str(caught.value)


def test_missing_settings_are_named(settings):
    """An unconfigured provider says which setting is missing."""
    settings.TWILIO_ACCOUNT_SID = ""
    settings.TWILIO_AUTH_TOKEN = ""
    with pytest.raises(sms.SmsSendError, match="TWILIO_ACCOUNT_SID"):
        sms.TwilioSmsBackend().send("+213555123456", "hello")


def test_infobip_sends_and_detects_rejections(infobip, monkeypatch):
    """Infobip gets the number without '+'; a REJECTED status raises."""
    seen = {}

    def accepted(url, json=None, headers=None, timeout=None):
        seen.update(url=url, json=json, headers=headers)
        return Answer(200, {"messages": [{"status": {"groupName": "PENDING"}}]})

    monkeypatch.setattr(requests, "post", accepted)
    sms.InfobipSmsBackend().send("+213555123456", "hello")
    assert seen["url"] == "https://abc.api.infobip.com/sms/2/text/advanced"
    assert seen["json"]["messages"][0]["destinations"] == [{"to": "213555123456"}]
    assert seen["headers"]["Authorization"] == "App key"
    monkeypatch.setattr(requests, "post", lambda *a, **k: Answer(200, {"messages": [{"status": {"groupName": "REJECTED"}}]}))
    with pytest.raises(sms.SmsSendError):
        sms.InfobipSmsBackend().send("+213555123456", "hello")


def test_failed_send_answers_503_and_never_logs_the_code(user_client, twilio, settings, monkeypatch, caplog):
    """PUT /me/phone with the provider down: 503 otp_send_failed, a log line, but no code in it."""
    settings.SMS_BACKEND = "apps.accounts.sms.TwilioSmsBackend"
    monkeypatch.setattr(requests, "post", lambda *a, **k: Answer(500, {"code": 20500}))
    with caplog.at_level(logging.ERROR):
        res = user_client.put("/api/v1/me/phone", {"phone": "+213555777666"}, format="json")
    assert res.status_code == 503 and res.data["code"] == "otp_send_failed"
    logged = " ".join(record.getMessage() for record in caplog.records)
    assert "Sending the sms code failed" in logged
    assert re.search(r"(?<!\d)\d{6}(?!\d)", logged) is None  # no 6-digit code anywhere in the logs


def test_code_message_follows_the_language():
    """The SMS is written in the person's language (French when unknown)."""
    assert code_message("123456", "ar").startswith("BLADUS: رمزك هو 123456")
    assert "is your code" in code_message("123456", "en")
    assert "est votre code" in code_message("123456", "xx")
