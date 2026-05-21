"""Twilio WhatsApp + SMS delivery with automatic fallback."""

from __future__ import annotations

import logging
import os

from twilio.base.exceptions import TwilioRestException
from twilio.rest import Client

logger = logging.getLogger(__name__)

WHATSAPP_NOT_ENABLED = 63038


def _client() -> Client | None:
    sid = os.environ.get("TWILIO_ACCOUNT_SID", "")
    token = os.environ.get("TWILIO_AUTH_TOKEN", "")
    if not sid or not token:
        logger.warning("Twilio credentials not configured")
        return None
    return Client(sid, token)


def send_whatsapp(to: str, body: str) -> str | None:
    client = _client()
    if not client:
        return None
    from_num = os.environ.get("TWILIO_WHATSAPP_FROM", "whatsapp:+14155238886")
    to_addr = to if to.startswith("whatsapp:") else f"whatsapp:{to}"
    try:
        msg = client.messages.create(body=body, from_=from_num, to=to_addr)
        return msg.sid
    except TwilioRestException as e:
        if e.code == WHATSAPP_NOT_ENABLED:
            logger.info("WhatsApp not enabled for %s; falling back to SMS", to)
            return send_sms(to.replace("whatsapp:", ""), body)
        logger.error("Twilio WhatsApp error %s: %s", e.code, e.msg)
        raise


def send_sms(to: str, body: str) -> str | None:
    client = _client()
    if not client:
        return None
    from_num = os.environ.get("TWILIO_SMS_FROM", "")
    if not from_num:
        logger.warning("TWILIO_SMS_FROM not set; cannot send SMS")
        return None
    to_clean = to.replace("whatsapp:", "")
    try:
        msg = client.messages.create(body=body, from_=from_num, to=to_clean)
        return msg.sid
    except TwilioRestException as e:
        logger.error("Twilio SMS error %s: %s", e.code, e.msg)
        raise


def send_message(to: str, body: str, prefer_whatsapp: bool = True) -> str | None:
    if prefer_whatsapp:
        try:
            return send_whatsapp(to, body)
        except TwilioRestException:
            return send_sms(to.replace("whatsapp:", ""), body)
    return send_sms(to, body)
