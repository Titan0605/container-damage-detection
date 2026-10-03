"""Typed runtime configuration for the inspection pipeline."""

from __future__ import annotations

import argparse
import os
from dataclasses import dataclass
from pathlib import Path
from typing import Literal

OcrMode = Literal["auto", "region", "characters"]


@dataclass(frozen=True, slots=True)
class PipelineConfig:
    """Configuration required to run one image inspection."""

    damage_model: Path
    text_model: Path
    input_image: Path
    output_image: Path
    api_url: str = "http://127.0.0.1:3001/api/reports"
    api_key: str | None = None
    damage_confidence: float = 0.25
    text_confidence: float = 0.25
    ocr_mode: OcrMode = "auto"
    ocr_languages: tuple[str, ...] = ("en",)
    request_timeout_seconds: float = 10.0
    device: str | None = None
    send_report: bool = True

    def validate(self) -> None:
        """Validate user-controlled paths and numeric thresholds."""
        if not self.damage_model.is_file():
            raise FileNotFoundError(f"Damage model not found: {self.damage_model}")
        if not self.text_model.is_file():
            raise FileNotFoundError(f"Text model not found: {self.text_model}")
        if not self.input_image.is_file():
            raise FileNotFoundError(f"Input image not found: {self.input_image}")
        if not 0.0 <= self.damage_confidence <= 1.0:
            raise ValueError("damage_confidence must be between 0 and 1")
        if not 0.0 <= self.text_confidence <= 1.0:
            raise ValueError("text_confidence must be between 0 and 1")
        if self.request_timeout_seconds <= 0:
            raise ValueError("request_timeout_seconds must be greater than zero")


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Inspect a container image with YOLO and EasyOCR.")
    parser.add_argument("--damage-model", type=Path, required=True)
    parser.add_argument("--text-model", type=Path, required=True)
    parser.add_argument("--image", dest="input_image", type=Path, required=True)
    parser.add_argument("--output", dest="output_image", type=Path, default=Path("resultado_clasificado.jpg"))
    parser.add_argument(
        "--api-url",
        default=os.getenv("REPORTS_API_URL", "http://127.0.0.1:3001/api/reports"),
    )
    parser.add_argument("--api-key", default=os.getenv("REPORTS_API_KEY"))
    parser.add_argument("--damage-confidence", type=float, default=0.25)
    parser.add_argument("--text-confidence", type=float, default=0.25)
    parser.add_argument("--ocr-mode", choices=("auto", "region", "characters"), default="auto")
    parser.add_argument("--ocr-languages", nargs="+", default=("en",))
    parser.add_argument("--timeout", dest="request_timeout_seconds", type=float, default=10.0)
    parser.add_argument("--device", default=None)
    parser.add_argument(
        "--no-api",
        action="store_true",
        help="Procesa la imagen y muestra el resultado sin llamar al backend",
    )
    return parser


def config_from_args(args: argparse.Namespace) -> PipelineConfig:
    config = PipelineConfig(
        damage_model=args.damage_model,
        text_model=args.text_model,
        input_image=args.input_image,
        output_image=args.output_image,
        api_url=args.api_url,
        api_key=args.api_key,
        damage_confidence=args.damage_confidence,
        text_confidence=args.text_confidence,
        ocr_mode=args.ocr_mode,
        ocr_languages=tuple(args.ocr_languages),
        request_timeout_seconds=args.request_timeout_seconds,
        device=args.device,
        send_report=not args.no_api,
    )
    config.validate()
    return config
