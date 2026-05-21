# Neighborhood Concierge — Product Requirements

## Overview

AI-powered local event discovery for **Seattle**. Ingests events every 6 hours, stores in **ChromaDB**, delivers personalized digests and follow-up Q&A via **Photon iMessage** (RCS/SMS fallback).

## Pipeline (RocketRide `.pipe`)

1. **Sources:** Eventbrite (discover), Meetup (public find), Luma (Playwright), Reddit (RSS)
2. **Normalize & dedup:** SHA-256(title + date + address), Nominatim geocode
3. **LangChain chunk:** RecursiveCharacterTextSplitter 512 / 64 overlap
4. **Embed:** all-MiniLM-L6-v2 (384-dim)
5. **Store:** Chroma `NEIGHBORHOOD_EVENTS`
6. **Retrieve:** top-k=8, metadata filters
7. **Rank:** recency 35%, distance 30%, category 25%, price 10% → top 5
8. **LLM:** claude-sonnet-4-6 (context-only, no hallucination)
9. **Delivery:** Photon Spectrum iMessage

## Anti-hallucination

- Ingest writes to vector DB **once per fetch** (per source, immediate upsert)
- Chat/digest **only queries Chroma** — never calls Eventbrite/Meetup/etc. during Q&A
- Empty context → fixed message, no Claude call
- Replies validated against allowed event URLs

## Dashboard (`/`)

- Event search & browse (vector DB)
- Chat simulator (RAG)
- User profile editor
- Digest preview / send
- Manual ingestion trigger

## Success metrics (from PRD)

- Events ingested per source every 6h
- Dedup rate tracked on upsert
- Digest at user `digest_time` in `timezone`
- Follow-ups grounded in retrieved events only
