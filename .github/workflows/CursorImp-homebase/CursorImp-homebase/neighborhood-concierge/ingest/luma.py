"""Luma event scraper via Playwright."""

from __future__ import annotations

import asyncio
import logging
import os

from ingest.normalize import build_event, finalize_event

logger = logging.getLogger(__name__)

SELECTORS = {
    "event_list": "[data-testid='event-card']",
    "title": "h2",
    "date": "[data-testid='event-date']",
    "location": "[data-testid='event-location']",
    "url": "a[href]",
}


async def _scrape_async(city_slug: str) -> list[dict]:
    from playwright.async_api import async_playwright

    url = f"https://lu.ma/{city_slug}"
    events: list[dict] = []

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        try:
            await page.goto(url, wait_until="networkidle", timeout=60000)
            cards = await page.query_selector_all(SELECTORS["event_list"])
            if not cards:
                cards = await page.query_selector_all("a[href*='/']")

            for card in cards[:50]:
                try:
                    title_el = await card.query_selector(SELECTORS["title"])
                    date_el = await card.query_selector(SELECTORS["date"])
                    loc_el = await card.query_selector(SELECTORS["location"])
                    link_el = await card.query_selector(SELECTORS["url"])

                    title = (await title_el.inner_text()).strip() if title_el else ""
                    if not title:
                        title = (await card.inner_text()).split("\n")[0].strip()[:120]
                    if not title:
                        continue

                    date_text = (await date_el.inner_text()).strip() if date_el else ""
                    location = (await loc_el.inner_text()).strip() if loc_el else ""
                    href = await link_el.get_attribute("href") if link_el else ""
                    if href and not href.startswith("http"):
                        href = f"https://lu.ma{href}"

                    event = build_event(
                        title=title,
                        source="luma",
                        date_start=date_text or None,
                        address=location,
                        url=href or url,
                        description=location,
                        tags=["luma"],
                    )
                    events.append(finalize_event(event))
                except Exception as e:
                    logger.debug("Luma card parse skip: %s", e)
                    continue
        except Exception as e:
            logger.error("Luma scrape failed: %s", e)
        finally:
            await browser.close()

    return events


def _run_scrape(city_slug: str) -> list[dict]:
    try:
        asyncio.get_running_loop()
    except RuntimeError:
        return asyncio.run(_scrape_async(city_slug))
    import concurrent.futures

    with concurrent.futures.ThreadPoolExecutor(max_workers=1) as pool:
        return pool.submit(asyncio.run, _scrape_async(city_slug)).result()


def fetch_events(city_slug: str | None = None) -> list[dict]:
    city_slug = city_slug or os.environ.get("CITY_SLUG", "seattle")
    try:
        events = _run_scrape(city_slug)
    except Exception as e:
        logger.error("Luma Playwright error: %s", e)
        events = []
    logger.info("Luma: fetched %d events", len(events))
    return events
