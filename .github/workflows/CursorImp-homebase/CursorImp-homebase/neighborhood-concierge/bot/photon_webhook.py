"""FastAPI — chat/digest reads ChromaDB only; ingest writes vectors on fetch."""

from __future__ import annotations

import logging
from datetime import datetime
from pathlib import Path

from fastapi import FastAPI, Form
from fastapi.responses import FileResponse, PlainTextResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from bot.api_routes import router as dashboard_router
from bot.concierge import get_store, handle_message, send_digest_for_phone
from bot.user_profile import get_profile, list_profiles, save_profile
from delivery.photon_client import send_message
from pipeline.rocketride_runner import get_runner

logger = logging.getLogger(__name__)

app = FastAPI(title="Neighborhood Concierge", version="1.0.0")

STATIC_DIR = Path(__file__).resolve().parent.parent / "static"


@app.get("/")
def root_dashboard():
    index = STATIC_DIR / "index.html"
    if index.exists():
        return FileResponse(index, media_type="text/html")
    return {"message": "Neighborhood Concierge API", "docs": "/docs", "health": "/health"}


app.include_router(dashboard_router)

if STATIC_DIR.exists():
    app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")


class ChatRequest(BaseModel):
    phone: str
    body: str
    platform: str | None = None


@app.get("/health")
def health():
    from delivery.photon_client import bridge_healthy

    store = get_store()
    runner = get_runner()
    rr_status = "disabled"
    if runner.enabled:
        rr_status = "connected" if runner._token else "configured"

    return {
        "status": "ok",
        "collection_count": store.count,
        "photon_bridge": bridge_healthy(),
        "photon_project_configured": bool(
            __import__("os").environ.get("PHOTON_PROJECT_ID")
            and __import__("os").environ.get("PHOTON_PROJECT_SECRET")
        ),
        "rocketride_configured": runner.enabled,
        "rocketride_status": rr_status,
    }


@app.post("/internal/chat")
async def internal_chat(req: ChatRequest):
    reply = handle_message(req.phone, req.body.strip())
    return {"reply": reply, "phone": req.phone, "platform": req.platform}


@app.post("/webhook")
async def webhook(From: str = Form(default=""), Body: str = Form(default="")):
    phone = From
    body = Body.strip()
    if not phone or not body:
        return PlainTextResponse("Missing From or Body", status_code=400)
    reply = handle_message(phone, body)
    send_message(phone, reply)
    return PlainTextResponse("<Response></Response>", media_type="application/xml")


@app.post("/send_digest")
async def send_digest(phone: str | None = None):
    if phone:
        return {"sent": [send_digest_for_phone(phone)]}
    sent = []
    for p in list_profiles():
        try:
            sent.append(send_digest_for_phone(p))
        except Exception as e:
            logger.error("Digest failed for %s: %s", p, e)
            sent.append({"phone": p, "error": str(e)})
    return {"sent": sent, "count": len(sent)}


@app.post("/ingest")
async def trigger_ingest():
    from pipeline.cron import run_ingestion

    return run_ingestion(get_store())


@app.post("/profile")
async def update_profile(phone: str, neighborhood: str = "", interests: str = ""):
    profile = get_profile(phone)
    if neighborhood:
        profile["neighborhood"] = neighborhood
    if interests:
        profile["interests"] = [i.strip() for i in interests.split(",") if i.strip()]
    save_profile(phone, profile)
    return profile


def users_due_for_digest(now: datetime | None = None) -> list[str]:
    import pytz

    now = now or datetime.now(pytz.UTC)
    due = []
    for phone in list_profiles():
        profile = get_profile(phone)
        tz_name = profile.get("timezone", "America/Los_Angeles")
        digest_time = profile.get("digest_time", "08:00")
        try:
            tz = pytz.timezone(tz_name)
            local = now.astimezone(tz)
            hour, minute = map(int, digest_time.split(":"))
            if local.hour == hour and local.minute < 15:
                due.append(phone)
        except Exception:
            continue
    return due
