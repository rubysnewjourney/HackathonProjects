"""Photon Spectrum bridge — outbound messages via spectrum-ts server."""

from __future__ import annotations

import logging
import os

import requests

logger = logging.getLogger(__name__)

BRIDGE_URL = os.environ.get("PHOTON_BRIDGE_URL", "http://127.0.0.1:8090")


def send_message(to: str, body: str) -> str | None:
    """Send via Photon Spectrum bridge (WhatsApp / terminal / configured providers)."""
    try:
        resp = requests.post(
            f"{BRIDGE_URL.rstrip('/')}/send",
            json={"to": to, "body": body},
            timeout=30,
        )
        resp.raise_for_status()
        data = resp.json()
        return data.get("messageId") or data.get("ok") and "photon"
    except requests.RequestException as e:
        logger.error("Photon bridge send failed: %s", e)
        return None


def bridge_healthy() -> bool:
    try:
        resp = requests.get(f"{BRIDGE_URL.rstrip('/')}/health", timeout=5)
        return resp.status_code == 200
    except requests.RequestException:
        return False
