"""Shared concierge logic (avoids circular imports between API and webhooks)."""

from __future__ import annotations

from bot.category_flow import (
    ask_location_message,
    format_events_by_category,
    onboarding_step,
    parse_categories,
    try_onboarding_reply,
)
from bot.claude_agent import answer_followup, generate_digest
from bot.user_profile import get_profile, save_profile
from delivery.photon_client import send_message
from pipeline.event_context import (
    NO_CONTEXT_REPLY,
    digest_query_for_profile,
    retrieve_ranked_events,
)
from pipeline.rocketride_runner import rocketride_chat
from pipeline.vector_store import VectorStore

_store: VectorStore | None = None
_history: dict[str, list[dict]] = {}


def get_store() -> VectorStore:
    global _store
    if _store is None:
        _store = VectorStore()
    return _store


def _fetch_for_profile(store: VectorStore, profile: dict, extra_query: str = "") -> list[dict]:
    hood = profile.get("neighborhood") or profile.get("city", "Seattle")
    interests = profile.get("interests") or []
    query = f"events in {hood} Seattle {' '.join(interests)} {extra_query}".strip()
    events = retrieve_ranked_events(store, query, profile, top_k=24, top_n=15)
    if interests:
        events = [e for e in events if (e.get("category") or "other").lower() in interests]
    return events[:12]


def _send_category_picks(phone: str, profile: dict, store: VectorStore) -> str:
    interests = profile.get("interests") or []
    hood = profile.get("neighborhood") or "Seattle"
    events = _fetch_for_profile(store, profile)
    if events:
        return format_events_by_category(events, interests, hood, per_category=3)

    return (
        f"No stored events near {hood} for {', '.join(interests)} yet. "
        "Events refresh every 6 hours — try another category or check back soon."
    )


def handle_message(phone: str, body: str) -> str:
    profile = get_profile(phone)
    store = get_store()
    text = body.strip().lower()

    if text in ("reset", "restart", "start over"):
        from bot.user_profile import DEFAULT_PROFILE

        fresh = {**DEFAULT_PROFILE, "phone": phone}
        save_profile(phone, fresh)
        return ask_location_message()

    onboarding_reply, send_picks = try_onboarding_reply(phone, body, profile)
    if send_picks:
        return _send_category_picks(phone, get_profile(phone), store)
    if onboarding_reply is not None:
        return onboarding_reply

    profile = get_profile(phone)
    step = onboarding_step(profile)

    if step == "location":
        return ask_location_message()

    if step == "categories":
        reply, send_picks = try_onboarding_reply(phone, body, profile)
        if send_picks:
            return _send_category_picks(phone, get_profile(phone), store)
        return reply or (
            "Which categories are you looking for? "
            "(music, food, tech, sports, arts, community)"
        )

    new_cats = parse_categories(body)
    if new_cats and any(
        w in text
        for w in (
            "category",
            "categories",
            "interested",
            "into",
            "show me",
            "send me",
            "what about",
            "only",
            "just",
        )
    ) or text in ("music", "food", "tech", "sports", "arts", "community"):
        profile["interests"] = new_cats
        save_profile(phone, profile)
        return _send_category_picks(phone, profile, store)

    if any(
        phrase in text
        for phrase in (
            "what's happening",
            "whats happening",
            "events",
            "this weekend",
            "today",
            "tonight",
            "recommend",
            "suggest",
            "picks",
            "what's on",
            "whats on",
        )
    ) and profile.get("interests"):
        return _send_category_picks(phone, profile, store)

    ranked = _fetch_for_profile(store, profile, extra_query=body)
    if not ranked:
        return NO_CONTEXT_REPLY

    hist = _history.setdefault(phone, [])
    reply = rocketride_chat(
        body,
        profile=profile,
        events=ranked,
        history=hist[-10:],
    )
    if not reply:
        reply = answer_followup(body, ranked, profile, hist[-10:])

    hist.append({"role": "user", "content": body})
    hist.append({"role": "assistant", "content": reply})
    _history[phone] = hist[-20:]
    return reply


def send_digest_for_phone(phone: str) -> dict:
    profile = get_profile(phone)
    store = get_store()

    if onboarding_step(profile) != "done":
        message = handle_message(phone, "hi")
    else:
        events = _fetch_for_profile(store, profile)
        interests = profile.get("interests") or []
        hood = profile.get("neighborhood") or "Seattle"
        if events and interests:
            message = format_events_by_category(events, interests, hood, per_category=2)
        elif events:
            message = rocketride_chat(
                "Generate a morning digest grouped by day. Use only STORED_EVENTS.",
                profile=profile,
                events=events[:5],
            ) or generate_digest(events[:5], profile)
        else:
            message = NO_CONTEXT_REPLY

    sid = send_message(phone, message)
    return {
        "phone": phone,
        "events": len(profile.get("interests") or []),
        "from_vector_db": True,
        "photon_message_id": sid,
    }
