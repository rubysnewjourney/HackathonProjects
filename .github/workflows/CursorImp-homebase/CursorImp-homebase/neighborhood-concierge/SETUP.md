# Setup — Neighborhood Concierge

## Prerequisites

- Python 3.10+
- Node.js 18+
- Playwright Chromium (for Luma)

## Install

```bash
cd neighborhood-concierge
python -m venv .venv
.venv\Scripts\activate          # Windows
pip install -r requirements.txt
playwright install chromium
npm install
cp .env.example .env            # fill credentials
python main.py
```

## View the app

Open **http://localhost:8080/** — dashboard for events, chat (RAG), profile, digest, and ingestion.

API docs: **http://localhost:8080/docs**

## Services

| Port | Service |
|------|---------|
| 8080 | FastAPI + dashboard |
| 8090 | Photon Spectrum (iMessage) |
| 5565 | RocketRide server (optional) |
| 8330 | ChromaDB HTTP (optional; falls back to `./chroma_data`) |

## Environment

See `.env.example`. Required for production messaging:

- `PHOTON_PROJECT_ID` / `PHOTON_PROJECT_SECRET`
- `ANTHROPIC_API_KEY` (or Vibetoken proxy)

Optional:

- `ROCKETRIDE_URI` / `ROCKETRIDE_APIKEY`
- `PHOTON_IMESSAGE_LINE_PHONE` (dedicated Business line)
