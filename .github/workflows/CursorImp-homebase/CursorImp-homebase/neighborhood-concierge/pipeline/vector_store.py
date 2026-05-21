"""ChromaDB vector store — chunked ingestion, metadata filters, event retrieval."""

from __future__ import annotations

import json
import logging
import os
from collections import defaultdict
from typing import Any

import chromadb

from pipeline.chunker import chunk_event_document
from pipeline.embedder import embed_texts

logger = logging.getLogger(__name__)

COLLECTION_NAME = "NEIGHBORHOOD_EVENTS"


def _metadata(event: dict, chunk_index: int = 0) -> dict[str, str | int | float | bool]:
    loc = event.get("location") or {}
    price = event.get("price")
    meta: dict[str, str | int | float | bool] = {
        "event_id": event.get("id", ""),
        "title": (event.get("title") or "")[:500],
        "source": event.get("source", ""),
        "date_start": event.get("date_start", ""),
        "category": event.get("category", "other"),
        "url": (event.get("url") or "")[:500],
        "location_address": (loc.get("address") or "")[:500],
        "location_lat": float(loc.get("lat") or 0),
        "location_lng": float(loc.get("lng") or 0),
        "dedup_id": event.get("dedup_id", ""),
        "chunk_index": chunk_index,
    }
    if price is not None:
        meta["price"] = float(price)
    if event.get("tags"):
        meta["tags"] = json.dumps(event["tags"][:20])
    return meta


class VectorStore:
    def __init__(
        self,
        host: str | None = None,
        port: int | None = None,
        persist_path: str | None = None,
    ):
        host = host or os.environ.get("CHROMA_HOST", "localhost")
        port = int(port or os.environ.get("CHROMA_PORT", "8330"))
        persist_path = persist_path or os.environ.get(
            "CHROMA_PERSIST_PATH",
            os.path.join(os.path.dirname(__file__), "..", "chroma_data"),
        )

        try:
            self._client = chromadb.HttpClient(host=host, port=port)
            logger.info("ChromaDB HTTP client %s:%s", host, port)
        except Exception:
            os.makedirs(persist_path, exist_ok=True)
            self._client = chromadb.PersistentClient(path=persist_path)
            logger.info("ChromaDB persistent client at %s", persist_path)

        self._collection = self._client.get_or_create_collection(
            name=COLLECTION_NAME,
            metadata={"hnsw:space": "cosine"},
        )

    @property
    def count(self) -> int:
        return self._collection.count()

    def upsert_events(self, events: list[dict]) -> dict[str, int]:
        stats = {"new": 0, "duplicate": 0, "failed": 0, "chunks": 0}
        rows: list[tuple[str, str, dict]] = []

        for event in events:
            dedup_id = event.get("dedup_id") or event.get("id", "")
            if not dedup_id:
                stats["failed"] += 1
                continue
            marker = self._collection.get(ids=[dedup_id, f"{dedup_id}__0"])
            if marker and marker.get("ids"):
                stats["duplicate"] += 1
                continue

            chunks = chunk_event_document(event)
            for i, chunk in enumerate(chunks):
                rows.append((f"{dedup_id}__{i}", chunk, _metadata(event, i)))

        if not rows:
            return stats

        ids = [r[0] for r in rows]
        docs = [r[1] for r in rows]
        metas = [r[2] for r in rows]
        embeddings = embed_texts(docs)

        try:
            self._collection.upsert(
                ids=ids,
                embeddings=embeddings,
                documents=docs,
                metadatas=metas,
            )
            stats["new"] = len({m["dedup_id"] for m in metas})
            stats["chunks"] = len(ids)
        except Exception as e:
            logger.error("Chroma upsert failed: %s", e)
            stats["failed"] += len(rows)

        return stats

    def query_events(
        self,
        query_text: str,
        filters: dict | None = None,
        top_k: int = 8,
    ) -> list[dict]:
        if not query_text.strip():
            query_text = "events in Seattle this week"

        embedding = embed_texts([query_text])[0]
        where = _build_where(filters or {})
        n = min(top_k * 4, max(20, self.count))

        kwargs: dict[str, Any] = {
            "query_embeddings": [embedding],
            "n_results": n,
            "include": ["documents", "metadatas", "distances"],
        }
        if where:
            kwargs["where"] = where

        result = self._collection.query(**kwargs)
        merged = _merge_chunks_by_event(result)
        return merged[:top_k]

    def list_recent(self, limit: int = 50) -> list[dict]:
        if self.count == 0:
            return []
        try:
            raw = self._collection.get(
                limit=min(limit * 3, self.count),
                include=["metadatas", "documents"],
            )
        except Exception as e:
            logger.error("list_recent failed: %s", e)
            return []

        by_dedup: dict[str, dict] = {}
        for i, meta in enumerate(raw.get("metadatas") or []):
            meta = meta or {}
            did = meta.get("dedup_id") or meta.get("event_id", "")
            if did and did not in by_dedup:
                docs = raw.get("documents") or []
                by_dedup[did] = _meta_to_event(meta, docs[i] if i < len(docs) else "")

        events = list(by_dedup.values())
        events.sort(key=lambda e: e.get("date_start", ""), reverse=True)
        return events[:limit]

    def stats_by_source(self) -> dict[str, int]:
        if self.count == 0:
            return {}
        try:
            raw = self._collection.get(include=["metadatas"])
        except Exception:
            return {}
        counts: dict[str, set[str]] = defaultdict(set)
        for meta in raw.get("metadatas") or []:
            if not meta:
                continue
            src = meta.get("source", "unknown")
            counts[src].add(meta.get("dedup_id") or meta.get("event_id", ""))
        return {k: len(v) for k, v in counts.items()}


def _build_where(filters: dict) -> dict | None:
    clauses: list[dict] = []
    if cat := filters.get("category"):
        clauses.append({"category": {"$eq": cat}})
    if filters.get("max_price") is not None:
        clauses.append({"price": {"$lte": float(filters["max_price"])}})
    if not clauses:
        return None
    if len(clauses) == 1:
        return clauses[0]
    return {"$and": clauses}


def _meta_to_event(meta: dict, doc: str) -> dict:
    return {
        "id": meta.get("event_id", ""),
        "title": meta.get("title", ""),
        "source": meta.get("source", ""),
        "date_start": meta.get("date_start", ""),
        "location": {
            "address": meta.get("location_address", ""),
            "lat": float(meta.get("location_lat", 0)),
            "lng": float(meta.get("location_lng", 0)),
        },
        "category": meta.get("category", "other"),
        "price": meta.get("price"),
        "url": meta.get("url", ""),
        "description": doc,
        "tags": json.loads(meta["tags"]) if meta.get("tags") else [],
        "dedup_id": meta.get("dedup_id", ""),
    }


def _merge_chunks_by_event(result: dict) -> list[dict]:
    ids = (result.get("ids") or [[]])[0]
    metas = (result.get("metadatas") or [[]])[0]
    docs = (result.get("documents") or [[]])[0]
    dists = (result.get("distances") or [[]])[0]

    best: dict[str, dict] = {}
    for i, meta in enumerate(metas):
        meta = meta or {}
        eid = meta.get("dedup_id") or meta.get("event_id", ids[i] if i < len(ids) else "")
        score = 1.0 - (dists[i] if i < len(dists) else 0)
        if eid not in best or score > best[eid]["score"]:
            best[eid] = {**_meta_to_event(meta, docs[i] if i < len(docs) else ""), "score": round(score, 4)}

    return sorted(best.values(), key=lambda x: x["score"], reverse=True)
