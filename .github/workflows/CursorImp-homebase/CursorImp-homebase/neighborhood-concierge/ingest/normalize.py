"""Shared normalization utilities for all event sources."""

from __future__ import annotations

import hashlib
import re
import uuid
from datetime import datetime, timezone
from functools import lru_cache
from typing import Any

from geopy.geocoders import Nominatim

CATEGORIES = ("music", "food", "tech", "sports", "arts", "community", "other")

CATEGORY_KEYWORDS: dict[str, list[str]] = {
    "music": ["concert", "dj", "band", "jazz", "live music", "festival", "gig"],
    "food": ["food", "dinner", "brunch", "tasting", "brewery", "wine", "restaurant", "market"],
    "tech": ["tech", "startup", "hackathon", "coding", "ai", "developer", "meetup tech"],
    "sports": ["run", "marathon", "yoga", "fitness", "soccer", "basketball", "hike", "cycling"],
    "arts": ["art", "gallery", "theater", "theatre", "museum", "film", "exhibit", "poetry"],
    "community": ["community", "volunteer", "neighborhood", "block party", "fundraiser"],
}

_geocoder = Nominatim(user_agent="neighborhood-concierge/1.0")


def new_event_id() -> str:
    return str(uuid.uuid4())


def dedup_key(event: dict[str, Any]) -> str:
    loc = event.get("location") or {}
    address = loc.get("address") or ""
    raw = f"{event.get('title', '')}{event.get('date_start', '')}{address}"
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


@lru_cache(maxsize=512)
def geocode(address: str) -> tuple[float, float]:
    if not address or not address.strip():
        return (0.0, 0.0)
    try:
        loc = _geocoder.geocode(address, timeout=10)
        if loc:
            return (float(loc.latitude), float(loc.longitude))
    except Exception:
        pass
    return (0.0, 0.0)


def infer_category(title: str, description: str = "") -> str:
    text = f"{title} {description}".lower()
    for category, keywords in CATEGORY_KEYWORDS.items():
        for kw in keywords:
            if kw in text:
                return category
    return "other"


def to_iso8601(value: Any) -> str:
    if not value:
        return datetime.now(timezone.utc).isoformat()
    if isinstance(value, datetime):
        if value.tzinfo is None:
            value = value.replace(tzinfo=timezone.utc)
        return value.isoformat()
    s = str(value).strip()
    if s.endswith("Z"):
        s = s[:-1] + "+00:00"
    try:
        dt = datetime.fromisoformat(s)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.isoformat()
    except ValueError:
        return datetime.now(timezone.utc).isoformat()


def build_event(
    *,
    title: str,
    source: str,
    date_start: Any,
    address: str = "",
    lat: float | None = None,
    lng: float | None = None,
    category: str | None = None,
    price: float | None = None,
    url: str = "",
    description: str = "",
    tags: list[str] | None = None,
) -> dict[str, Any]:
    if lat is None or lng is None:
        lat, lng = geocode(address) if address else (0.0, 0.0)
    cat = category or infer_category(title, description)
    if cat not in CATEGORIES:
        cat = "other"
    return {
        "id": new_event_id(),
        "title": title.strip(),
        "source": source,
        "date_start": to_iso8601(date_start),
        "location": {
            "address": address.strip(),
            "lat": float(lat),
            "lng": float(lng),
        },
        "category": cat,
        "price": price,
        "url": url.strip(),
        "description": (description or "").strip(),
        "tags": tags or [],
        "dedup_id": "",
    }


def finalize_event(event: dict[str, Any]) -> dict[str, Any]:
    event = dict(event)
    event["dedup_id"] = dedup_key(event)
    return event


def parse_price(value: Any) -> float | None:
    if value is None:
        return None
    if isinstance(value, (int, float)):
        return float(value) if value > 0 else None
    s = str(value).lower()
    if "free" in s or s == "0":
        return None
    m = re.search(r"[\d.]+", s)
    return float(m.group()) if m else None
