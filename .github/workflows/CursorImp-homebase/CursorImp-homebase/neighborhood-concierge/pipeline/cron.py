"""Scheduled ingestion: fetch sources, upsert to Chroma immediately per source."""

from __future__ import annotations

import logging

from ingest import fetch_eventbrite, fetch_luma, fetch_meetup, fetch_reddit
from pipeline.vector_store import VectorStore

logger = logging.getLogger(__name__)


def run_ingestion(store: VectorStore | None = None) -> dict:
    store = store or VectorStore()

    sources = {
        "eventbrite": fetch_eventbrite,
        "meetup": fetch_meetup,
        "luma": fetch_luma,
        "reddit": fetch_reddit,
    }

    report: dict = {
        "fetched": {},
        "upsert": {"new": 0, "duplicate": 0, "failed": 0},
        "collection_count": store.count,
    }

    for name, fetcher in sources.items():
        try:
            batch = fetcher()
            report["fetched"][name] = len(batch)
            stats = store.upsert_events(batch)
            for key in ("new", "duplicate", "failed"):
                report["upsert"][key] += stats.get(key, 0)
            logger.info(
                "%s: fetched=%d stored new=%d dup=%d chunks=%d",
                name,
                len(batch),
                stats.get("new", 0),
                stats.get("duplicate", 0),
                stats.get("chunks", 0),
            )
        except Exception as e:
            logger.error("%s ingest failed: %s", name, e)
            report["fetched"][name] = 0

    report["collection_count"] = store.count
    logger.info(
        "Ingestion complete: fetched=%s upsert=%s total=%s",
        report["fetched"],
        report["upsert"],
        report["collection_count"],
    )
    return report
