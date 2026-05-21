"""Location + category onboarding over Photon/iMessage."""

from __future__ import annotations

import re

from bot.user_profile import save_profile

CATEGORIES = [
    ("music", "Music"),
    ("food", "Food"),
    ("tech", "Tech"),
    ("sports", "Sports"),
    ("arts", "Arts"),
    ("community", "Community"),
]

CATEGORY_ALIASES: dict[str, str] = {
    "concert": "music",
    "concerts": "music",
    "live": "music",
    "jazz": "music",
    "restaurant": "food",
    "dining": "food",
    "brunch": "food",
    "beer": "food",
    "coding": "tech",
    "startup": "tech",
    "hackathon": "tech",
    "ai": "tech",
    "run": "sports",
    "yoga": "sports",
    "fitness": "sports",
    "hike": "sports",
    "art": "arts",
    "gallery": "arts",
    "theater": "arts",
    "theatre": "arts",
    "meetup": "community",
    "networking": "community",
    "volunteer": "community",
}

SEATTLE_NEIGHBORHOODS = [
    "capitol hill",
    "ballard",
    "fremont",
    "queen anne",
    "west seattle",
    "university district",
    "u-district",
    "udistrict",
    "downtown",
    "belltown",
    "south lake union",
    "slu",
    "green lake",
    "wallingford",
    "beacon hill",
    "columbia city",
    "international district",
    "chinatown",
    "ravenna",
    "wedgwood",
    "magnolia",
    "georgetown",
    "white center",
    "lake city",
    "northgate",
    "roosevelt",
    "phinney",
    "greenwood",
]


def onboarding_step(profile: dict) -> str:
    if profile.get("onboarding_step") == "done":
        return "done"
    if not (profile.get("neighborhood") or "").strip():
        return "location"
    interests = profile.get("interests") or []
    if not interests or profile.get("onboarding_step") == "categories":
        return "categories"
    return "done"


_GREETINGS = frozenset(
    {"hi", "hello", "hey", "help", "start", "yo", "sup", "hiya", "howdy"}
)


def parse_neighborhood(text: str) -> str | None:
    lower = text.lower().strip()
    if lower in _GREETINGS:
        return None
    if lower in ("seattle", "all", "anywhere"):
        return "Seattle"
    for hood in SEATTLE_NEIGHBORHOODS:
        if hood in lower:
            return hood.title().replace("Slu", "SLU").replace("U-District", "University District")
    m = re.search(
        r"(?:in|near|around|at)\s+([a-z][a-z\s-]{2,30}?)(?:\s+(?:this|week|weekend|today)|[?.!,]|$)",
        lower,
    )
    if m:
        cand = m.group(1).strip().title()
        if len(cand) > 2:
            return cand
    words = lower.split()
    if (
        len(text.strip()) < 40
        and len(words) <= 4
        and not any(
            w in lower
            for w in ("music", "food", "tech", "sport", "art", "community", "all")
        )
        and lower not in _GREETINGS
    ):
        cand = text.strip().title()
        if cand.lower() not in _GREETINGS:
            return cand
    return None


def parse_categories(text: str) -> list[str]:
    lower = text.lower()
    found: list[str] = []

    if any(w in lower for w in ("all", "everything", "any", "whatever", "surprise")):
        return [c[0] for c in CATEGORIES]

    for num, (cid, _) in enumerate(CATEGORIES, 1):
        if re.search(rf"\b{num}\b", lower):
            found.append(cid)

    for cid, label in CATEGORIES:
        if cid in lower or label.lower() in lower:
            found.append(cid)

    for alias, cid in CATEGORY_ALIASES.items():
        if alias in lower:
            found.append(cid)

    seen: set[str] = set()
    out: list[str] = []
    for c in found:
        if c not in seen:
            seen.add(c)
            out.append(c)
    return out


def ask_location_message() -> str:
    return (
        "Hey! I'm your Seattle event concierge.\n\n"
        "What neighborhood are you in? (e.g. Capitol Hill, Ballard, Fremont, SLU)"
    )


def ask_categories_message(neighborhood: str) -> str:
    lines = [f"Got it — {neighborhood}! What are you into? Reply with any categories:\n"]
    for i, (_, label) in enumerate(CATEGORIES, 1):
        lines.append(f"{i}. {label}")
    lines.append('\nExample: "music and food" or "1, 2, 5"')
    return "\n".join(lines)


def format_events_by_category(
    events: list[dict],
    categories: list[str],
    neighborhood: str,
    *,
    per_category: int = 3,
) -> str:
    by_cat: dict[str, list[dict]] = {c: [] for c in categories}
    for ev in events:
        cat = (ev.get("category") or "other").lower()
        if cat in by_cat and len(by_cat[cat]) < per_category:
            by_cat[cat].append(ev)

    icons = {
        "music": "Music",
        "food": "Food",
        "tech": "Tech",
        "sports": "Sports",
        "arts": "Arts",
        "community": "Community",
    }

    lines = [f"Here's what's happening near {neighborhood}:\n"]
    any_events = False
    for cat in categories:
        items = by_cat.get(cat, [])
        if not items:
            continue
        any_events = True
        label = icons.get(cat, cat.title())
        lines.append(f"{label}")
        for ev in items:
            title = ev.get("title", "Event")
            url = ev.get("url", "")
            when = (ev.get("date_start") or "")[:10]
            lines.append(f"• {title} ({when})")
            if url:
                lines.append(f"  {url}")
        lines.append("")

    if not any_events:
        return (
            f"I don't have stored events for those categories near {neighborhood} yet. "
            "Try music, food, or tech — or check back after the next refresh (every 6h)."
        )
    lines.append("Reply with another category anytime, or ask a follow-up question.")
    return "\n".join(lines).strip()


def try_onboarding_reply(phone: str, body: str, profile: dict) -> tuple[str | None, bool]:
    """Handle location/category setup. Returns (message, send_category_picks)."""
    step = onboarding_step(profile)
    text = body.strip()

    if step == "location" and text.lower() in _GREETINGS:
        return ask_location_message(), False

    if step == "location":
        hood = parse_neighborhood(text)
        if not hood:
            return (
                "I didn't catch the neighborhood — try something like "
                "Capitol Hill, Ballard, or Fremont.",
                False,
            )
        profile["neighborhood"] = hood
        profile["city"] = "Seattle"
        profile["onboarding_step"] = "categories"
        profile["interests"] = []
        save_profile(phone, profile)
        return ask_categories_message(hood), False

    if step == "categories":
        cats = parse_categories(text)
        if not cats:
            return (
                "Which categories do you want? Pick from:\n"
                + "\n".join(f"• {label}" for _, label in CATEGORIES)
                + '\n\nOr say "music and food".',
                False,
            )
        profile["interests"] = cats
        profile["onboarding_step"] = "done"
        save_profile(phone, profile)
        return None, True

    return None, False
