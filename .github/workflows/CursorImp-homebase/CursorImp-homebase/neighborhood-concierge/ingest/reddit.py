"""Reddit RSS feed ingestion."""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime

import feedparser

from ingest.normalize import build_event, finalize_event

logger = logging.getLogger(__name__)

FEEDS = [
    "https://www.reddit.com/r/Seattle/search.rss?q=event&sort=new&t=week",
    "https://www.reddit.com/r/SeattleEvents/.rss",
]


def fetch_events(feeds: list[str] | None = None) -> list[dict]:
    feeds = feeds or FEEDS
    events: list[dict] = []
    seen_urls: set[str] = set()

    for feed_url in feeds:
        try:
            parsed = feedparser.parse(
                feed_url,
                request_headers={"User-Agent": "neighborhood-concierge/1.0"},
            )
        except Exception as e:
            logger.error("Reddit feed %s failed: %s", feed_url, e)
            continue

        for entry in parsed.entries:
            ev = _normalize_reddit(entry)
            if ev and ev["url"] not in seen_urls:
                seen_urls.add(ev["url"])
                events.append(ev)

    logger.info("Reddit: fetched %d events", len(events))
    return events


def _normalize_reddit(entry: dict) -> dict | None:
    title = entry.get("title", "").strip()
    if not title:
        return None

    url = entry.get("link", "") or entry.get("id", "")
    pub = entry.get("published") or entry.get("updated")
    date_start = datetime.now(timezone.utc)
    if pub:
        try:
            date_start = parsedate_to_datetime(pub)
            if date_start.tzinfo is None:
                date_start = date_start.replace(tzinfo=timezone.utc)
        except (TypeError, ValueError):
            pass

    summary = entry.get("summary", "") or entry.get("description", "")
    if isinstance(summary, dict):
        summary = summary.get("value", "")

    event = build_event(
        title=title,
        source="reddit",
        date_start=date_start,
        address="Seattle, WA",
        url=url,
        description=str(summary)[:2000],
        tags=["reddit", "social"],
        category="community",
    )
    return finalize_event(event)
