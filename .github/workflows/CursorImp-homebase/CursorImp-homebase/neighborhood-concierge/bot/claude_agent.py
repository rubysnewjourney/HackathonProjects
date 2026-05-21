"""Anthropic Claude — answers only from vector-retrieved event context."""

from __future__ import annotations

import json
import logging
import os
import re
from typing import Any

import anthropic

from pipeline.event_context import NO_CONTEXT_REPLY, format_events_for_llm

logger = logging.getLogger(__name__)

MODEL = "claude-sonnet-4-6"
CHAT_TEMPERATURE = 0.2
DIGEST_TEMPERATURE = 0.4

SYSTEM_PROMPT = """You are a Seattle neighborhood event concierge.

STRICT RULES:
1. Use ONLY events listed under STORED_EVENTS in the user message.
2. Never invent, guess, or supplement events from general knowledge.
3. Every event you mention must include its exact title and url from STORED_EVENTS.
4. If STORED_EVENTS is empty, say you have no matching stored events and stop.
5. Group results by the user's interest categories when possible (music, food, tech, etc.).
6. Respect their neighborhood from the user profile — only recommend nearby events.
7. Tone: warm, brief, 1-2 emojis max."""


def _client() -> anthropic.Anthropic:
    api_key = os.environ.get("ANTHROPIC_API_KEY", "")
    base_url = os.environ.get("ANTHROPIC_BASE_URL")
    kwargs: dict[str, Any] = {"api_key": api_key}
    if base_url:
        kwargs["base_url"] = base_url
    return anthropic.Anthropic(**kwargs)


def _validate_reply_against_events(reply: str, events: list[dict]) -> str:
    """Strip lines that cite URLs not present in stored context."""
    if not events:
        return reply
    allowed_urls = {e.get("url", "") for e in events if e.get("url")}
    lines = reply.splitlines()
    kept = []
    for line in lines:
        urls = re.findall(r"https?://\S+", line)
        if urls and not any(u.rstrip(").,]") in allowed_urls for u in urls):
            continue
        kept.append(line)
    return "\n".join(kept) if kept else _fallback_digest(events)


def generate_digest(events: list[dict], user_profile: dict) -> str:
    if not events:
        return NO_CONTEXT_REPLY

    client = _client()
    context = format_events_for_llm(events)
    user_msg = (
        f"User profile:\n{json.dumps(user_profile, indent=2)}\n\n"
        f"{context}\n\n"
        "Write a morning digest grouped by day. Only include events from STORED_EVENTS."
    )
    try:
        msg = client.messages.create(
            model=MODEL,
            max_tokens=1024,
            temperature=DIGEST_TEMPERATURE,
            system=SYSTEM_PROMPT,
            messages=[{"role": "user", "content": user_msg}],
        )
        return _validate_reply_against_events(_text_from_message(msg), events)
    except Exception as e:
        logger.error("Claude digest failed: %s", e)
        return _fallback_digest(events)


def answer_followup(
    question: str,
    events: list[dict],
    user_profile: dict,
    history: list[dict] | None = None,
) -> str:
    if not events:
        return NO_CONTEXT_REPLY

    client = _client()
    context = format_events_for_llm(events)
    messages: list[dict] = []
    for h in history or []:
        if h.get("role") in ("user", "assistant") and h.get("content"):
            messages.append({"role": h["role"], "content": h["content"]})
    messages.append(
        {
            "role": "user",
            "content": (
                f"User profile:\n{json.dumps(user_profile, indent=2)}\n\n"
                f"{context}\n\n"
                f"User question: {question}"
            ),
        }
    )
    try:
        msg = client.messages.create(
            model=MODEL,
            max_tokens=1024,
            temperature=CHAT_TEMPERATURE,
            system=SYSTEM_PROMPT,
            messages=messages,
        )
        return _validate_reply_against_events(_text_from_message(msg), events)
    except Exception as e:
        logger.error("Claude follow-up failed: %s", e)
        return "Sorry, I couldn't process that right now. Try again in a moment."


def _text_from_message(msg) -> str:
    parts = []
    for block in msg.content:
        if hasattr(block, "text"):
            parts.append(block.text)
    return "\n".join(parts).strip()


def _fallback_digest(events: list[dict]) -> str:
    lines = ["Your Seattle event picks (from our database):"]
    for e in events[:5]:
        lines.append(f"• {e.get('title')} — {e.get('url', '')}")
    return "\n".join(lines)
