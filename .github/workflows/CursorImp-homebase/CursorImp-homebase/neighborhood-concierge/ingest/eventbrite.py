"""Eventbrite ingestion via public discover page (search API deprecated).

Uses schema.org ItemList JSON-LD from:
https://www.eventbrite.com/d/wa--seattle/events/
"""

from __future__ import annotations

import json
import logging
import os
import re

import requests

from ingest.normalize import build_event, finalize_event

logger = logging.getLogger(__name__)

DISCOVER_URL = os.environ.get(
    "EVENTBRITE_DISCOVER_URL",
    "https://www.eventbrite.com/d/wa--seattle/events/",
)
LD_JSON_RE = re.compile(
    r'<script type="application/ld\+json">(.*?)</script>',
    re.DOTALL,
)


def fetch_events(discover_url: str | None = None) -> list[dict]:
    url = discover_url or DISCOVER_URL
    try:
        resp = requests.get(
            url,
            headers={"User-Agent": "neighborhood-concierge/1.0"},
            timeout=30,
        )
        resp.raise_for_status()
    except requests.RequestException as e:
        logger.error("Eventbrite discover request failed: %s", e)
        return []

    events: list[dict] = []
    seen_urls: set[str] = set()

    for block in LD_JSON_RE.findall(resp.text):
        try:
            data = json.loads(block)
        except json.JSONDecodeError:
            continue
        for raw in _extract_list_events(data):
            ev = _normalize_eventbrite_ld(raw)
            if ev and ev["url"] not in seen_urls:
                seen_urls.add(ev["url"])
                events.append(ev)

    logger.info("Eventbrite (discover): fetched %d events", len(events))
    return events


def _extract_list_events(data) -> list[dict]:
    if isinstance(data, dict) and data.get("@type") == "ItemList":
        out = []
        for el in data.get("itemListElement", []):
            item = el.get("item") if isinstance(el, dict) else None
            if item and item.get("@type") == "Event":
                out.append(item)
        return out
    if isinstance(data, dict) and data.get("@type") == "Event":
        return [data]
    return []


def _normalize_eventbrite_ld(raw: dict) -> dict | None:
    title = (raw.get("name") or "").strip()
    if not title:
        return None

    loc = raw.get("location") or {}
    address_obj = loc.get("address") or {}
    if isinstance(address_obj, dict):
        parts = [
            address_obj.get("streetAddress"),
            address_obj.get("addressLocality"),
            address_obj.get("addressRegion"),
        ]
        address = ", ".join(p for p in parts if p)
    else:
        address = str(address_obj)

    geo = loc.get("geo") or {}
    lat = geo.get("latitude")
    lng = geo.get("longitude")
    if lat is not None:
        lat, lng = float(lat), float(lng or 0)
    else:
        lat, lng = None, None

    event = build_event(
        title=title,
        source="eventbrite",
        date_start=raw.get("startDate"),
        address=address or (loc.get("name") or ""),
        lat=lat,
        lng=lng,
        url=raw.get("url", ""),
        description=(raw.get("description") or "")[:2000],
        tags=["eventbrite"],
    )
    return finalize_event(event)
