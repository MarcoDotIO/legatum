"""Position-only gate shape checks."""
import json
import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(__file__))
import scenario  # noqa: E402


class PositionShape(unittest.TestCase):
    def test_lab_card_is_not_required(self):
        file = {"format": "legatum-scenario", "version": 1, "id": "probe", "title": "Probe",
                "objective": {"summary": "Hold", "turns": 5, "score": [1]},
                "state": {"encoding": "json", "hash": "1", "data": json.dumps({"save_version": 53})}}
        self.assertEqual(scenario.shape_findings("probe.json", json.dumps(file), 53, "probe"), [])

    def test_invalid_state_version_is_rejected(self):
        file = {"format": "legatum-scenario", "version": 1, "id": "probe", "title": "Probe",
                "objective": {"summary": "Hold", "turns": 5, "score": [1]},
                "state": {"encoding": "json", "hash": "1", "data": json.dumps({"save_version": 52})}}
        self.assertTrue(any("rules version 52" in x for x in
                            scenario.shape_findings("probe.json", json.dumps(file), 53, "probe")))
