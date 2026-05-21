"""Meetup ingestion via public find-events page (no API key).

Meetup retired public RSS for /find/events; we parse embedded __NEXT_DATA__ from:
https://www.meetup.com/find/events/?allMeetups=true&zip=98101
"""

from __future__ import annotations

import json
import logging
import os
import re

import requests

from ingest.normalize import build_event, finalize_event

logger = logging.getLogger(__name__)

FIND_URL = os.environ.get(
    "MEETUP_FIND_URL",
    "https://www.meetup.com/find/events/?allMeetups=true&zip=98101",
)
NEXT_DATA_RE = re.compile(
    r'<script id="__NEXT_DATA__" type="application/json">(.*?)</script>',
    re.DOTALL,
)


def fetch_events(find_url: str | None = None) -> list[dict]:
    url = find_url or FIND_URL
    try:
        resp = requests.get(
            url,
            headers={"User-Agent": "neighborhood-concierge/1.0"},
            timeout=30,
        )
        resp.raise_for_status()
    except requests.RequestException as e:
        logger.error("Meetup find page request failed: %s", e)
        return []

    match = NEXT_DATA_RE.search(resp.text)
    if not match:
        logger.warning("Meetup: __NEXT_DATA__ not found on find page")
        return []

    try:
        payload = json.loads(match.group(1))
    except json.JSONDecodeError as e:
        logger.error("Meetup: invalid __NEXT_DATA__ JSON: %s", e)
        return []

    raw_events = _extract_event_nodes(payload)
    events: list[dict] = []
    seen_urls: set[str] = set()

    for node in raw_events:
        ev = _normalize_meetup(node)
        if ev and ev["url"] not in seen_urls:
            seen_urls.add(ev["url"])
            events.append(ev)

    logger.info("Meetup (public find): fetched %d events", len(events))
    return events


def _extract_event_nodes(obj) -> list[dict]:
    found: list[dict] = []

    def walk(node, depth: int = 0) -> None:
        if depth > 18:
            return
        if isinstance(node, dict):
            if "title" in node and ("dateTime" in node or "eventUrl" in node):
                found.append(node)
            for value in node.values():
                walk(value, depth + 1)
        elif isinstance(node, list):
            for item in node:
                walk(item, depth + 1)

    walk(obj)
    return found


def _normalize_meetup(node: dict) -> dict | None:
    title = (node.get("title") or "").strip()
    if not title:
        return None

    venue = node.get("venue") or {}
    address = venue.get("address") or venue.get("name") or ""
    lat = venue.get("lat")
    lng = venue.get("lng")
    if lat is not None:
        lat, lng = float(lat), float(lng or 0)
    else:
        lat, lng = None, None

    description = node.get("description") or node.get("shortDescription") or ""
    event = build_event(
        title=title,
        source="meetup",
        date_start=node.get("dateTime"),
        address=str(address),
        lat=lat,
        lng=lng,
        category="community",
        price=None,
        url=node.get("eventUrl", ""),
        description=str(description)[:2000],
        tags=["meetup"],
    )
    return finalize_event(event)
