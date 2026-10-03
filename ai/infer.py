"""Command-line entry point for one container image inspection."""

from __future__ import annotations

import argparse
import json
import sys
from typing import Protocol, cast

import cv2
import easyocr  # type: ignore[import-untyped]
import numpy as np
from ultralytics import YOLO  # type: ignore[attr-defined]

from ai.api_client import build_payload, post_report
from ai.config import build_parser, config_from_args
from ai.detection import detections_to_payload, extract_detections
from ai.ocr import OcrReader, OcrResult, read_serial
from ai.visualization import draw_detections, save_annotated_image


class YoloModel(Protocol):
    def predict(self, source: np.ndarray, conf: float, verbose: bool, device: str | None = None) -> object: ...


def _first_result(results: object) -> object:
    if not isinstance(results, (list, tuple)) or not results:
        raise RuntimeError("YOLO returned no results")
    return cast(object, results[0])


def run_inference(args: argparse.Namespace) -> int:
    config = config_from_args(args)
    image = cv2.imread(str(config.input_image))
    if image is None:
        raise OSError(f"Could not read input image: {config.input_image}")

    damage_model = cast(YoloModel, YOLO(str(config.damage_model)))
    text_model = cast(YoloModel, YOLO(str(config.text_model)))
    damage_result = _first_result(
        damage_model.predict(
            source=image,
            conf=config.damage_confidence,
            verbose=False,
            device=config.device,
        )
    )
    text_result = _first_result(
        text_model.predict(
            source=image,
            conf=config.text_confidence,
            verbose=False,
            device=config.device,
        )
    )
    damage_detections = extract_detections(damage_result, config.damage_confidence)
    text_detections = extract_detections(text_result, config.text_confidence)

    reader = cast(OcrReader, easyocr.Reader(list(config.ocr_languages), gpu=False))
    ocr_result: OcrResult = read_serial(image, text_detections, reader, config.ocr_mode)
    draw_detections(image, damage_detections, (0, 0, 255))
    draw_detections(image, text_detections, (0, 180, 0))
    save_annotated_image(image, str(config.output_image))

    payload = build_payload(ocr_result.text, detections_to_payload(damage_detections))
    print(json.dumps(payload, indent=2, ensure_ascii=False))
    print(f"Serial detectado: {ocr_result.text or '<vacío>'}")
    print(f"Imagen anotada: {config.output_image}")

    if not config.send_report:
        print("Modo consola: no se envió información al backend.")
        return 0

    status_code = post_report(config.api_url, payload, config.request_timeout_seconds, config.api_key)
    print(f"Reporte enviado con HTTP {status_code}")
    return 0


def main() -> int:
    parser = build_parser()
    try:
        return run_inference(parser.parse_args())
    except (FileNotFoundError, OSError, RuntimeError, ValueError) as error:
        print(f"Inference failed: {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
