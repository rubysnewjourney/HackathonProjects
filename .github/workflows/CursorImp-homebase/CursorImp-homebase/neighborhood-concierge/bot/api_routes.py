"""Dashboard and JSON API routes (PRD feature surface)."""

from __future__ import annotations

import os
from pathlib import Path
from typing import Any

from fastapi import APIRouter
from pydantic import BaseModel, Field

from bot.concierge import get_store, handle_message, send_digest_for_phone
from bot.user_profile import get_profile, list_profiles, save_profile
from delivery.photon_client import bridge_healthy
from pipeline.event_context import digest_query_for_profile, retrieve_ranked_events
from pipeline.rocketride_runner import get_runner

router = APIRouter()


class ProfileBody(BaseModel):
    phone: str
    neighborhood: str = ""
    city: str = "Seattle"
    interests: list[str] = Field(default_factory=lambda: ["music", "food", "tech"])
    max_price: float | None = None
    digest_time: str = "08:00"
    timezone: str = "America/Los_Angeles"


class ChatBody(BaseModel):
    phone: str
    message: str


@router.get("/api/status")
def api_status():
    store = get_store()
    runner = get_runner()
    rr = "disabled"
    if runner.enabled:
        rr = "connected" if runner._token else "configured (start main.py)"
    return {
        "city": os.environ.get("USER_CITY", "Seattle"),
        "collection_count": store.count,
        "chunks_in_db": store.count,
        "events_by_source": {
            k: v
            for k, v in store.stats_by_source().items()
            if k not in DEFAULT_EXCLUDE
        },
        "photon_line": os.environ.get("PHOTON_IMESSAGE_LINE_PHONE", ""),
        "photon_bridge": bridge_healthy(),
        "photon_imessage": True,
        "rocketride_configured": runner.enabled,
        "rocketride_status": rr,
        "rocketride_uri": os.environ.get("ROCKETRIDE_URI", ""),
        "embedding_model": "all-MiniLM-L6-v2",
        "llm": "claude-sonnet-4-6",
        "delivery": "Photon iMessage (RCS/SMS fallback)",
        "ingest_schedule": "every 6 hours",
        "digest_schedule": "user digest_time (timezone-aware)",
        "dashboard": "/",
    }


SOURCE_LABELS = {
    "eventbrite": "Eventbrite",
    "meetup": "Meetup",
    "luma": "Luma",
    "reddit": "Reddit",
}

DEFAULT_EXCLUDE = {"reddit"}


@router.get("/api/events")
def api_events(
    q: str = "",
    limit: int = 60,
    category: str = "",
    exclude: str = "reddit",
):
    store = get_store()
    excluded = {s.strip().lower() for s in exclude.split(",") if s.strip()}

    if q.strip():
        filters: dict[str, Any] = {}
        if category:
            filters["category"] = category
        events = store.query_events(q, filters=filters, top_k=limit)
    else:
        events = store.list_recent(limit=limit * 2)

    if category:
        events = [e for e in events if e.get("category") == category]
    if excluded:
        events = [e for e in events if e.get("source", "").lower() not in excluded]

    for e in events:
        src = e.get("source", "")
        e["source_label"] = SOURCE_LABELS.get(src, src.title())

    return {"events": events[:limit], "count": len(events[:limit])}


@router.get("/api/categories")
def api_categories():
    store = get_store()
    events = store.list_recent(limit=500)
    counts: dict[str, int] = {}
    for e in events:
        if e.get("source", "").lower() in DEFAULT_EXCLUDE:
            continue
        cat = e.get("category") or "other"
        counts[cat] = counts.get(cat, 0) + 1
    order = ["music", "food", "tech", "sports", "arts", "community", "other"]
    return {
        "categories": [
            {"id": c, "count": counts.get(c, 0)}
            for c in order
            if counts.get(c, 0) > 0
        ]
    }


@router.post("/api/chat")
def api_chat(body: ChatBody):
    reply = handle_message(body.phone, body.message.strip())
    store = get_store()
    profile = get_profile(body.phone)
    ranked = retrieve_ranked_events(store, body.message, profile, top_n=5)
    return {
        "reply": reply,
        "context_events": len(ranked),
        "events": ranked,
        "from_vector_db": True,
    }


@router.get("/api/profile/{phone}")
def api_get_profile(phone: str):
    return get_profile(phone)


@router.put("/api/profile")
def api_put_profile(body: ProfileBody):
    profile = get_profile(body.phone)
    profile.update(
        {
            "phone": body.phone,
            "neighborhood": body.neighborhood or profile.get("neighborhood", ""),
            "city": body.city,
            "interests": body.interests,
            "max_price": body.max_price,
            "digest_time": body.digest_time,
            "timezone": body.timezone,
        }
    )
    save_profile(body.phone, profile)
    return profile


@router.get("/api/profiles")
def api_profiles():
    return {"phones": list_profiles()}


@router.post("/api/ingest")
def api_ingest():
    from pipeline.cron import run_ingestion

    return run_ingestion(get_store())


@router.post("/api/digest/preview")
def api_digest_preview(phone: str):
    profile = get_profile(phone)
    store = get_store()
    ranked = retrieve_ranked_events(
        store, digest_query_for_profile(profile), profile, top_n=5
    )
    from bot.claude_agent import generate_digest
    from pipeline.event_context import NO_CONTEXT_REPLY

    if not ranked:
        return {"preview": NO_CONTEXT_REPLY, "events": []}
    preview = generate_digest(ranked, profile)
    return {"preview": preview, "events": ranked}


@router.post("/api/digest/send")
def api_digest_send(phone: str):
    return send_digest_for_phone(phone)
