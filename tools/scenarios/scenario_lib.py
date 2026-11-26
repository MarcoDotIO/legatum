"""Decode and describe AI measurement positions for show.py."""

from __future__ import annotations

import base64
import gzip
import json
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]

# PlayerId::BARBARIAN and TeamId::BARBARIAN (crates/core/src/types.rs): u8::MAX.
BARBARIAN = 255


def load_json(path: str | Path) -> dict:
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def decode_state(encoded: dict) -> dict:
    """The scenario's start state (save JSON) as a dict."""
    if encoded["encoding"] == "json":
        return json.loads(encoded["data"])
    if encoded["encoding"] == "gzip-base64":
        return json.loads(gzip.decompress(base64.b64decode(encoded["data"])))
    raise ValueError(f"unknown state encoding {encoded['encoding']!r}")


class World:
    """Names for empires and teams in a position state."""

    def __init__(self, state: dict):
        self.units = {u["id"]: u for u in state["units"].values()} if isinstance(state["units"], dict) else {
            u["id"]: u for u in state["units"]
        }
        cities = state["cities"]
        self.cities = {c["id"]: c for c in (cities.values() if isinstance(cities, dict) else cities)}
        self.players = state["players"]

    def empire(self, player: int) -> str:
        """An owner's name. Barbarians (PlayerId::BARBARIAN, 255) and any other id that isn't a
        seat own units too, so look the id up instead of indexing the seat list."""
        if player == BARBARIAN:
            return "Barbarian"
        p = next((q for q in self.players if q["id"] == player), None)
        if p is None:
            return f"player {player}"
        same = [q for q in self.players if q["faction"] == p["faction"]]
        return p["faction"] if len(same) == 1 else f"{p['faction']} ({p['name']})"

    def team_empire(self, team: int) -> str:
        if team == BARBARIAN:
            return "Barbarian"
        for p in self.players:
            if p["team"] == team:
                return self.empire(p["id"])
        return f"team {team}"
