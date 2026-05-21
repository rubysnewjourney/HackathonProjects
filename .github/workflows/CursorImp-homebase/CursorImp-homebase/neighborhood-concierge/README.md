# Neighborhood Concierge

AI-powered local event discovery for Seattle. Ingests events from Eventbrite, Meetup (public find page), Luma, and Reddit; stores them in ChromaDB; delivers personalized digests via **Photon Spectrum** (`spectrum-ts`) and runs the RocketRide pipeline via **`rocketride`** Python SDK.

## Required SDKs

| SDK | Package | Role |
|-----|---------|------|
| **Photon Spectrum** | `spectrum-ts` (Node) | iMessage (Photon cloud RCS/SMS fallback) |
| **RocketRide** | `rocketride` (Python) | Execute `neighborhood_concierge.pipe` chat lane |

## Quick start

```bash
cd neighborhood-concierge
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
playwright install chromium
npm install
cp .env.example .env   # fill PHOTON + ROCKETRIDE credentials
python main.py
```

- **Dashboard:** http://localhost:8080/ (events, chat, profile, digest, ingest)
- **API docs:** http://localhost:8080/docs
- **Photon bridge:** http://localhost:8090 (`/send`, `/health`)

## Environment

| Variable | Required for | Notes |
|----------|----------------|-------|
| `ANTHROPIC_API_KEY` | Claude replies | Or Vibetoken proxy |
| `EVENTBRITE_API_KEY` | Eventbrite ingest | |
| `PHOTON_PROJECT_ID` | Production messaging | From [Photon dashboard](https://app.photon.codes/) |
| `PHOTON_PROJECT_SECRET` | Production messaging | Settings → project secret |
| `ROCKETRIDE_URI` | Pipeline runtime | e.g. `http://localhost:8081` or cloud |
| `ROCKETRIDE_APIKEY` | Pipeline runtime | RocketRide server API key |
| `MEETUP_FIND_URL` | Meetup (no API) | Default: zip 98101 find page |

Meetup does **not** use `MEETUP_API_KEY`. Public RSS URLs 404; we parse `__NEXT_DATA__` from the find-events HTML page.

## API endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /health` | Chroma count + Photon/RocketRide status |
| `POST /internal/chat` | JSON `{phone, body}` — used by Photon server |
| `POST /webhook` | Legacy Twilio-form webhook |
| `POST /send_digest` | Morning digest via Photon |
| `POST /ingest` | Manual ingestion |

## What you need for Photon

1. Create a project at https://app.photon.codes/
2. Copy **Project ID** and **Secret** into `.env`
3. Enable **iMessage** on your Photon project (RCS/SMS fallback is automatic in cloud mode)
4. Optional: set `PHOTON_IMESSAGE_LINE_PHONE` if you use a dedicated Business line
5. Restart `python main.py` (starts `messaging/photon_server.mjs` automatically)

Only **iMessage** is loaded — WhatsApp and terminal are not used. `PHOTON_PROVIDERS=imessage` (default).

## What you need for RocketRide

1. Run a RocketRide server (local Docker or [RocketRide Cloud](https://cloud.rocketride.ai))
2. Set `ROCKETRIDE_URI` and `ROCKETRIDE_APIKEY`
3. The app loads `neighborhood_concierge.pipe` via `client.use()` and prefers `client.chat()` for Q&A

If RocketRide is unreachable, the app falls back to the embedded Python RAG + Claude path.

## Architecture

```
Photon (spectrum-ts) ──POST /internal/chat──► FastAPI (Python)
       ▲                                        │
       │ POST /send                             ├─ RocketRide SDK → .pipe
       └────────────────────────────────────────├─ Chroma + ingest cron
                                                └─ Claude (fallback)
```
