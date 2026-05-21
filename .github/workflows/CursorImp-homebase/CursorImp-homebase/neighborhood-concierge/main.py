"""Neighborhood Concierge — entry point."""

from __future__ import annotations

import logging
import os
import subprocess
import sys
import threading
import time
from pathlib import Path

from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))

load_dotenv(ROOT / ".env")

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("main")

_photon_proc: subprocess.Popen | None = None


def _start_photon_bridge() -> subprocess.Popen | None:
    if os.environ.get("PHOTON_DISABLED", "").lower() in ("1", "true", "yes"):
        logger.info("Photon bridge disabled (PHOTON_DISABLED)")
        return None

    messaging_dir = ROOT / "messaging"
    server = messaging_dir / "photon_server.mjs"
    if not server.exists():
        logger.warning("Photon server script missing at %s", server)
        return None

    node_modules = messaging_dir / "node_modules"
    if not node_modules.exists():
        root_modules = ROOT / "node_modules"
        node_modules = root_modules if root_modules.exists() else node_modules

    env = {
        **os.environ,
        "CONCIERGE_BACKEND_URL": f"http://127.0.0.1:{os.environ.get('PORT', '8080')}",
    }
    if "PHOTON_PROVIDERS" not in env:
        env["PHOTON_PROVIDERS"] = "imessage"
    cmd = ["node", str(server)]
    logger.info("Starting Photon Spectrum bridge: %s", " ".join(cmd))
    try:
        proc = subprocess.Popen(
            cmd,
            cwd=str(messaging_dir if (messaging_dir / "node_modules").exists() else ROOT),
            env=env,
        )
        return proc
    except FileNotFoundError:
        logger.error("Node.js not found — install Node 18+ for Photon spectrum-ts")
        return None


def _check_chroma():
    from pipeline.vector_store import VectorStore

    try:
        store = VectorStore()
        count = store.count
        logger.info("ChromaDB connected — collection NEIGHBORHOOD_EVENTS has %d documents", count)
        return store
    except Exception as e:
        logger.warning("ChromaDB check failed (will retry on first use): %s", e)
        return None


def _init_rocketride():
    from pipeline.rocketride_runner import get_runner

    runner = get_runner()
    if not runner.enabled:
        logger.info(
            "RocketRide SDK idle — set ROCKETRIDE_URI and ROCKETRIDE_APIKEY to run neighborhood_concierge.pipe"
        )
        return

    import asyncio

    async def boot():
        await runner.start_pipeline()

    try:
        asyncio.run(boot())
    except Exception as e:
        logger.warning("RocketRide pipeline start failed: %s", e)


def _cron_loop(store):
    import schedule

    from pipeline.cron import run_ingestion

    def job():
        logger.info("Starting scheduled ingestion")
        run_ingestion(store or None)

    def digest_job():
        from bot.photon_webhook import send_digest_for_phone, users_due_for_digest

        for phone in users_due_for_digest():
            try:
                send_digest_for_phone(phone)
                logger.info("Digest sent to %s", phone)
            except Exception as e:
                logger.error("Digest error for %s: %s", phone, e)

    schedule.every(6).hours.do(job)
    schedule.every(15).minutes.do(digest_job)

    logger.info("Cron scheduler started (ingest every 6h, digest check every 15m)")
    while True:
        schedule.run_pending()
        time.sleep(30)


def main():
    global _photon_proc
    port = int(os.environ.get("PORT", "8080"))
    store = _check_chroma()
    _init_rocketride()
    _photon_proc = _start_photon_bridge()

    cron_thread = threading.Thread(target=_cron_loop, args=(store,), daemon=True)
    cron_thread.start()

    import uvicorn

    from bot.photon_webhook import app

    logger.info("Starting Neighborhood Concierge API on port %s", port)
    uvicorn.run(app, host="0.0.0.0", port=port, log_level="info")


if __name__ == "__main__":
    main()
