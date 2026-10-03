from __future__ import annotations

from typing import ClassVar

import numpy as np

from ai.api_client import build_payload
from ai.detection import (
    BoundingBox,
    Detection,
    detections_to_payload,
    extract_detections,
    normalize_damage_type,
)
from ai.ocr import normalize_serial, read_serial


class FakeTensor:
    def __init__(self, values: object) -> None:
        self.values = values

    def tolist(self) -> object:
        return self.values


class FakeBoxes:
    def __init__(self) -> None:
        self.cls = FakeTensor([0, 1])
        self.conf = FakeTensor([0.85, 0.92])
        self.xyxy = FakeTensor([[1, 2, 30, 40], [40, 2, 70, 40]])


class FakeResult:
    boxes: ClassVar[FakeBoxes] = FakeBoxes()
    names: ClassVar[dict[int, str]] = {0: "rust", 1: "hole"}


class FakeReader:
    def readtext(self, image: np.ndarray, *args: object, **kwargs: object) -> object:
        del image, args, kwargs
        return [[[], "ab-12", 0.9]]


def test_extracts_damage_names_and_confidence() -> None:
    detections = extract_detections(FakeResult(), 0.25)
    assert detections_to_payload(detections) == [
        {"type": "rust", "confidence": 0.85},
        {"type": "hole", "confidence": 0.92},
    ]


def test_normalizes_serial() -> None:
    assert normalize_serial(" ab-12 / x ") == "AB12X"


def test_reads_characters_in_horizontal_order() -> None:
    image = np.zeros((50, 100, 3), dtype=np.uint8)
    detections = [
        Detection("B", 0.8, BoundingBox(50, 5, 70, 40)),
        Detection("A", 0.9, BoundingBox(5, 5, 25, 40)),
    ]
    result = read_serial(image, detections, FakeReader(), "characters")
    assert result.text == "AB12AB12"


def test_builds_backend_payload() -> None:
    payload = build_payload("AB12", [{"type": "rust", "confidence": 0.85}])
    assert payload == {
        "serial_number": "AB12",
        "damages": [{"type": "rust", "confidence": 0.85}],
    }


def test_normalizes_damage_labels_for_dashboard_contract() -> None:
    assert normalize_damage_type("Minor-Dent") == "dent"
    assert normalize_damage_type("Deframe") == "dent"
