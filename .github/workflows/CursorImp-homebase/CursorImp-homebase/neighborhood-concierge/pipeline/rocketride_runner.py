"""RocketRide Python SDK — load neighborhood_concierge.pipe and run chat."""

from __future__ import annotations

import asyncio
import json
import logging
import os
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)

PIPE_PATH = Path(__file__).resolve().parent.parent / "neighborhood_concierge.pipe"


class RocketRideRunner:
    """Wraps rocketride.RocketRideClient for pipeline chat when a server is available."""

    def __init__(self) -> None:
        self.uri = os.environ.get("ROCKETRIDE_URI", "")
        self.auth = os.environ.get("ROCKETRIDE_APIKEY", "")
        self._token: str | None = None
        self._client = None

    @property
    def enabled(self) -> bool:
        return bool(self.uri and self.auth)

    async def _ensure_client(self):
        from rocketride import RocketRideClient

        if self._client is None:
            client = RocketRideClient(uri=self.uri, auth=self.auth, persist=False)
            await client.__aenter__()
            self._client = client
        return self._client

    async def start_pipeline(self) -> str | None:
        if not self.enabled:
            return None
        try:
            client = await self._ensure_client()
            result = await client.use(filepath=str(PIPE_PATH))
            self._token = result.get("token")
            logger.info("RocketRide pipeline started token=%s", self._token)
            return self._token
        except Exception as e:
            logger.warning("RocketRide use() failed: %s", e)
            return None

    async def chat_async(
        self,
        question: str,
        *,
        profile: dict | None = None,
        events: list[dict] | None = None,
        history: list[dict] | None = None,
    ) -> str | None:
        if not self.enabled:
            return None
        if not self._token:
            await self.start_pipeline()
        if not self._token:
            return None

        from rocketride.schema import Question, QuestionHistory

        q = Question()
        q.addInstruction(
            "Anti-hallucination",
            "Answer ONLY from STORED_EVENTS in context. Never invent events. "
            "Every event mentioned must use exact title and url from context. "
            "If no events in context, say no matching stored events.",
        )
        from pipeline.event_context import format_events_for_llm

        if profile:
            q.addContext(json.dumps(profile, default=str))
        if events:
            q.addContext(format_events_for_llm(events))
        elif not events:
            q.addContext("STORED_EVENTS: []")
        for item in history or []:
            if item.get("role") in ("user", "assistant") and item.get("content"):
                q.addHistory(QuestionHistory(role=item["role"], content=item["content"]))
        q.addQuestion(question)

        try:
            client = await self._ensure_client()
            result = await client.chat(token=self._token, question=q)
            body = result.get("body") or result.get("result") or result
            if isinstance(body, bytes):
                return body.decode("utf-8", errors="replace")
            if isinstance(body, str):
                return body
            return json.dumps(body, default=str)
        except Exception as e:
            logger.warning("RocketRide chat() failed: %s", e)
            return None

    async def trigger_ingest_lane(self) -> dict[str, Any] | None:
        if not self.enabled:
            return None
        if not self._token:
            await self.start_pipeline()
        if not self._token:
            return None
        try:
            client = await self._ensure_client()
            result = await client.send(
                self._token,
                "run scheduled ingestion",
                objinfo={"name": "ingest.trigger"},
                mimetype="text/plain",
            )
            return dict(result) if result else None
        except Exception as e:
            logger.warning("RocketRide ingest send failed: %s", e)
            return None

    async def close(self) -> None:
        if self._client:
            try:
                if self._token:
                    await self._client.terminate(self._token)
                await self._client.__aexit__(None, None, None)
            except Exception:
                pass
            self._client = None


_runner: RocketRideRunner | None = None


def get_runner() -> RocketRideRunner:
    global _runner
    if _runner is None:
        _runner = RocketRideRunner()
    return _runner


def rocketride_chat(
    question: str,
    *,
    profile: dict | None = None,
    events: list[dict] | None = None,
    history: list[dict] | None = None,
) -> str | None:
    runner = get_runner()
    if not runner.enabled:
        return None
    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        return asyncio.run(
            runner.chat_async(question, profile=profile, events=events, history=history)
        )
    import concurrent.futures

    with concurrent.futures.ThreadPoolExecutor(max_workers=1) as pool:
        return pool.submit(
            asyncio.run,
            runner.chat_async(question, profile=profile, events=events, history=history),
        ).result()
