"""Serial-number localization and OCR strategies."""

from __future__ import annotations

import re
from collections.abc import Sequence
from dataclasses import dataclass
from typing import Literal, Protocol, cast

import numpy as np

from ai.detection import BoundingBox, Detection


class OcrReader(Protocol):
    def readtext(self, image: np.ndarray, *args: object, **kwargs: object) -> object: ...


OcrMode = Literal["auto", "region", "characters"]


@dataclass(frozen=True, slots=True)
class OcrResult:
    text: str
    confidence: float | None
    box: BoundingBox | None


def normalize_serial(text: str) -> str:
    """Normalize OCR output while retaining alphanumeric serial characters."""
    return re.sub(r"[^A-Z0-9]", "", text.upper())


def _crop(image: np.ndarray, box: BoundingBox) -> np.ndarray:
    height, width = image.shape[:2]
    bounded = box.clamp(width, height)
    if bounded.x2 <= bounded.x1 or bounded.y2 <= bounded.y1:
        return image[0:0, 0:0]
    return image[bounded.y1 : bounded.y2, bounded.x1 : bounded.x2]


def _ocr_text(reader: OcrReader, crop: np.ndarray) -> tuple[str, float | None]:
    if crop.size == 0:
        return "", None
    candidates = cast(list[object], reader.readtext(crop, detail=1))
    texts: list[str] = []
    confidences: list[float] = []
    for candidate in candidates:
        if not isinstance(candidate, (list, tuple)) or len(candidate) < 2:
            continue
        texts.append(str(candidate[1]))
        if len(candidate) >= 3:
            try:
                confidences.append(float(candidate[2]))
            except (TypeError, ValueError):
                pass
    confidence = sum(confidences) / len(confidences) if confidences else None
    return normalize_serial("".join(texts)), confidence


def _select_region(detections: Sequence[Detection]) -> Detection | None:
    return max(detections, key=lambda detection: detection.confidence, default=None)


def read_serial(
    image: np.ndarray,
    text_detections: Sequence[Detection],
    reader: OcrReader,
    mode: OcrMode,
) -> OcrResult:
    """Read a serial detected as one region or as separate character boxes."""
    region = _select_region(text_detections)
    if region is None:
        return OcrResult(text="", confidence=None, box=None)

    if mode == "characters" or (mode == "auto" and len(text_detections) > 1):
        ordered = sorted(text_detections, key=lambda detection: (detection.box.x1, detection.box.y1))
        character_texts: list[str] = []
        character_confidences: list[float] = []
        for character in ordered:
            text, confidence = _ocr_text(reader, _crop(image, character.box))
            if text:
                character_texts.append(text)
            if confidence is not None:
                character_confidences.append(confidence)
        average_confidence = (
            sum(character_confidences) / len(character_confidences) if character_confidences else None
        )
        return OcrResult("".join(character_texts), average_confidence, region.box)

    text, confidence = _ocr_text(reader, _crop(image, region.box))
    return OcrResult(text, confidence, region.box)
