"""JSON file store for per-user profiles."""

from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any

PROFILES_DIR = Path(__file__).resolve().parent.parent / "profiles"

DEFAULT_PROFILE: dict[str, Any] = {
    "phone": "",
    "city": "Seattle",
    "neighborhood": "",
    "interests": [],
    "onboarding_step": "location",
    "max_price": None,
    "digest_time": "08:00",
    "timezone": "America/Los_Angeles",
    "lat": 47.6062,
    "lon": -122.3321,
}


def _profile_path(phone: str) -> Path:
    safe = "".join(c if c.isalnum() or c in "+-" else "_" for c in phone)
    PROFILES_DIR.mkdir(parents=True, exist_ok=True)
    return PROFILES_DIR / f"{safe}.json"


def get_profile(phone: str) -> dict:
    path = _profile_path(phone)
    if not path.exists():
        profile = {**DEFAULT_PROFILE, "phone": phone}
        save_profile(phone, profile)
        return profile
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def save_profile(phone: str, profile: dict) -> None:
    profile = {**profile, "phone": phone}
    path = _profile_path(phone)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(profile, f, indent=2)


def list_profiles() -> list[str]:
    if not PROFILES_DIR.exists():
        return []
    phones = []
    for p in PROFILES_DIR.glob("*.json"):
        try:
            with open(p, encoding="utf-8") as f:
                data = json.load(f)
            if data.get("phone"):
                phones.append(data["phone"])
        except (json.JSONDecodeError, OSError):
            continue
    return phones
