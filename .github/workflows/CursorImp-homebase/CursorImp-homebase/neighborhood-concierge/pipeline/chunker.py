"""LangChain RecursiveCharacterTextSplitter — PRD: 512 chars, 64 overlap."""

from __future__ import annotations

from functools import lru_cache

CHUNK_SIZE = 512
CHUNK_OVERLAP = 64


@lru_cache(maxsize=1)
def _splitter():
    from langchain_text_splitters import RecursiveCharacterTextSplitter

    return RecursiveCharacterTextSplitter(
        chunk_size=CHUNK_SIZE,
        chunk_overlap=CHUNK_OVERLAP,
        length_function=len,
    )


def chunk_text(text: str) -> list[str]:
    if not text or not text.strip():
        return []
    return _splitter().split_text(text.strip())


def chunk_event_document(event: dict) -> list[str]:
    parts = [
        event.get("title", ""),
        event.get("description", ""),
        event.get("category", ""),
        " ".join(event.get("tags") or []),
    ]
    loc = event.get("location") or {}
    if loc.get("address"):
        parts.append(loc["address"])
    full = "\n".join(p for p in parts if p)
    chunks = chunk_text(full)
    return chunks if chunks else [full[:CHUNK_SIZE] or event.get("title", "event")]
