"""Rank and filter retrieved events against user profile."""

from __future__ import annotations

import math
from datetime import datetime, timezone
from typing import Any

WEIGHTS = {
    "recency": 0.35,
    "distance_km": 0.30,
    "category_match": 0.25,
    "price_fit": 0.10,
}

MAX_RADIUS_KM = 25.0
SEATTLE_LAT = 47.6062
SEATTLE_LON = -122.3321


def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    r = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dlon / 2) ** 2
    return r * 2 * math.asin(math.sqrt(min(1.0, a)))


def _recency_score(date_start: str) -> float:
    try:
        dt = datetime.fromisoformat(date_start.replace("Z", "+00:00"))
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        days = (dt - datetime.now(timezone.utc)).total_seconds() / 86400
        if days < 0:
            return 0.2
        if days <= 1:
            return 1.0
        if days <= 7:
            return max(0.3, 1.0 - days / 7)
        return 0.2
    except (ValueError, TypeError):
        return 0.5


def _score_event(event: dict, profile: dict) -> float:
    loc = event.get("location") or {}
    elat = float(loc.get("lat") or SEATTLE_LAT)
    elng = float(loc.get("lng") or SEATTLE_LON)
    user_lat = float(profile.get("lat", SEATTLE_LAT))
    user_lon = float(profile.get("lon", SEATTLE_LON))

    distance = _haversine_km(user_lat, user_lon, elat, elng)
    distance_score = max(0.0, 1.0 - distance / MAX_RADIUS_KM)

    interests = [i.lower() for i in (profile.get("interests") or [])]
    cat = (event.get("category") or "other").lower()
    category_score = 1.0 if cat in interests or not interests else 0.0

    max_price = profile.get("max_price")
    price = event.get("price")
    if max_price is None:
        price_score = 1.0
    elif price is None:
        price_score = 1.0
    else:
        price_score = 1.0 if float(price) <= float(max_price) else 0.0

    recency = _recency_score(event.get("date_start", ""))

    return (
        WEIGHTS["recency"] * recency
        + WEIGHTS["distance_km"] * distance_score
        + WEIGHTS["category_match"] * category_score
        + WEIGHTS["price_fit"] * price_score
    )


def rank_events(
    events: list[dict],
    profile: dict,
    top_n: int = 5,
) -> list[dict]:
    if not profile.get("lat"):
        profile = {**profile, "lat": SEATTLE_LAT, "lon": SEATTLE_LON}

    scored = []
    for ev in events:
        s = _score_event(ev, profile)
        scored.append({**ev, "rank_score": round(s, 4)})

    scored.sort(key=lambda x: x["rank_score"], reverse=True)
    return scored[:top_n]
