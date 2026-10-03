"""OpenCV drawing helpers for inspection results."""

from __future__ import annotations

from collections.abc import Sequence

import cv2
import numpy as np

from ai.detection import Detection


def draw_detections(image: np.ndarray, detections: Sequence[Detection], color: tuple[int, int, int]) -> None:
    for detection in detections:
        box = detection.box
        cv2.rectangle(image, (box.x1, box.y1), (box.x2, box.y2), color, 2)
        label = f"{detection.label} {detection.confidence:.2f}"
        (text_width, text_height), baseline = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.55, 1)
        label_top = max(0, box.y1 - text_height - baseline - 4)
        cv2.rectangle(image, (box.x1, label_top), (box.x1 + text_width + 6, box.y1), color, -1)
        cv2.putText(image, label, (box.x1 + 3, box.y1 - 4), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (255, 255, 255), 1)


def save_annotated_image(image: np.ndarray, output_path: str) -> None:
    if not cv2.imwrite(output_path, image):
        raise OSError(f"Could not write annotated image: {output_path}")
