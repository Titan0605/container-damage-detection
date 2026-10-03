"""Adapters from Ultralytics results to application-level detections."""

from __future__ import annotations

from collections.abc import Mapping, Sequence
from dataclasses import dataclass
from typing import Protocol, cast


class _ScalarLike(Protocol):
    def item(self) -> object: ...


class _ListLike(Protocol):
    def tolist(self) -> object: ...


@dataclass(frozen=True, slots=True)
class BoundingBox:
    x1: int
    y1: int
    x2: int
    y2: int

    def clamp(self, width: int, height: int) -> BoundingBox:
        return BoundingBox(
            max(0, min(self.x1, width - 1)),
            max(0, min(self.y1, height - 1)),
            max(0, min(self.x2, width - 1)),
            max(0, min(self.y2, height - 1)),
        )


@dataclass(frozen=True, slots=True)
class Detection:
    label: str
    confidence: float
    box: BoundingBox

    def as_damage(self) -> dict[str, float | str]:
        return {"type": normalize_damage_type(self.label), "confidence": round(self.confidence, 4)}


def normalize_damage_type(label: str) -> str:
    """Map model labels to the damage categories accepted by the dashboard API."""
    normalized = label.strip().lower().replace("_", "-")
    if normalized in {"hole", "rust", "dent"}:
        return normalized
    if normalized in {"deframe", "minor-dent"}:
        return "dent"
    raise ValueError(f"Unsupported damage label: {label}")


def _attribute(value: object, name: str) -> object:
    return cast(object, getattr(value, name))


def _to_float(value: object) -> float:
    if isinstance(value, (int, float, str)):
        return float(value)
    scalar = cast(_ScalarLike, value).item()
    if not isinstance(scalar, (int, float, str)):
        raise TypeError("Expected a scalar numeric value")
    return float(scalar)


def _to_list(value: object) -> list[object]:
    converted = value if isinstance(value, list) else cast(_ListLike, value).tolist()
    if not isinstance(converted, list):
        raise TypeError("Expected a list-like Ultralytics value")
    return converted


def _box_from_value(value: object) -> BoundingBox:
    coordinates = _to_list(value)
    if len(coordinates) != 4:
        raise ValueError("A bounding box must contain four coordinates")
    return BoundingBox(*(round(_to_float(item)) for item in coordinates))


def _class_name(names: Mapping[int, str] | Sequence[str], class_id: int) -> str:
    if isinstance(names, Mapping):
        return str(names[class_id])
    return str(names[class_id])


def extract_detections(result: object, confidence_threshold: float, names: object | None = None) -> list[Detection]:
    """Extract boxes, class names and confidences from one YOLO result."""
    boxes = _attribute(result, "boxes")
    class_values = _to_list(_attribute(boxes, "cls"))
    confidence_values = _to_list(_attribute(boxes, "conf"))
    coordinate_values = _to_list(_attribute(boxes, "xyxy"))
    result_names = names if names is not None else _attribute(result, "names")
    class_names = cast(Mapping[int, str] | Sequence[str], result_names)

    detections: list[Detection] = []
    for class_value, confidence_value, coordinates in zip(class_values, confidence_values, coordinate_values):
        confidence = _to_float(confidence_value)
        if confidence < confidence_threshold:
            continue
        class_id = round(_to_float(class_value))
        detections.append(Detection(_class_name(class_names, class_id), confidence, _box_from_value(coordinates)))
    return detections


def detections_to_payload(detections: Sequence[Detection]) -> list[dict[str, float | str]]:
    return [detection.as_damage() for detection in detections]
