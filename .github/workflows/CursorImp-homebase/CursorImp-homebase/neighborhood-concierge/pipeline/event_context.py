"""Vector-store context retrieval — chat reads Chroma only, never live source APIs."""

from __future__ import annotations

import json
import logging
from typing import Any

from pipeline.rank_filter import rank_events
from pipeline.vector_store import VectorStore

logger = logging.getLogger(__name__)

NO_CONTEXT_REPLY = (
    "I don't have any matching events stored yet for that question. "
    "Events refresh every 6 hours — try asking about music, food, or tech in Seattle this week."
)


def retrieve_ranked_events(
    store: VectorStore,
    query: str,
    profile: dict,
    *,
    top_k: int = 8,
    top_n: int = 5,
) -> list[dict]:
    """Similarity search in ChromaDB, then profile-based ranking."""
    filters: dict[str, Any] = {}
    if profile.get("max_price") is not None:
        filters["max_price"] = profile["max_price"]
    if profile.get("category"):
        filters["category"] = profile["category"]

    retrieved = store.query_events(query, filters=filters, top_k=top_k)
    return rank_events(retrieved, profile, top_n=top_n)


def format_events_for_llm(events: list[dict]) -> str:
    """Compact, cite-friendly context block for the LLM."""
    if not events:
        return "STORED_EVENTS: []"

    slim = []
    for i, ev in enumerate(events, 1):
        loc = ev.get("location") or {}
        slim.append(
            {
                "ref": i,
                "id": ev.get("id"),
                "title": ev.get("title"),
                "source": ev.get("source"),
                "date_start": ev.get("date_start"),
                "category": ev.get("category"),
                "price": ev.get("price"),
                "url": ev.get("url"),
                "address": loc.get("address"),
                "description": (ev.get("description") or "")[:400],
            }
        )
    return "STORED_EVENTS (use ONLY these; do not add or invent any event):\n" + json.dumps(
        slim, indent=2, default=str
    )


def digest_query_for_profile(profile: dict) -> str:
    interests = ", ".join(profile.get("interests") or [])
    hood = profile.get("neighborhood") or profile.get("city", "Seattle")
    return f"upcoming events in {hood} Seattle {interests}".strip()
