"""Train the damage and serial-localization YOLO models."""

from __future__ import annotations

import argparse
import shutil
from pathlib import Path

from ultralytics import YOLO  # type: ignore[attr-defined]


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Train a YOLO inspection model from a dataset YAML.")
    parser.add_argument("--task", choices=("damage", "text"), required=True)
    parser.add_argument("--data", type=Path, required=True, help="Ultralytics dataset YAML")
    parser.add_argument("--base-model", default="yolo11n.pt")
    parser.add_argument("--epochs", type=int, default=100)
    parser.add_argument("--imgsz", type=int, default=640)
    parser.add_argument("--batch", type=int, default=16)
    parser.add_argument("--device", default=None)
    parser.add_argument("--project", type=Path, default=Path("runs"))
    return parser


def train_model(args: argparse.Namespace) -> Path:
    if not args.data.is_file():
        raise FileNotFoundError(f"Dataset YAML not found: {args.data}")
    if args.epochs <= 0 or args.imgsz <= 0 or args.batch <= 0:
        raise ValueError("epochs, imgsz and batch must be greater than zero")

    model = YOLO(args.base_model)
    train_kwargs: dict[str, object] = {
        "data": str(args.data),
        "epochs": args.epochs,
        "imgsz": args.imgsz,
        "batch": args.batch,
        "project": str(args.project),
        "name": args.task,
    }
    if args.device is not None:
        train_kwargs["device"] = args.device
    result = model.train(**train_kwargs)
    save_dir = Path(str(getattr(result, "save_dir", args.project / args.task)))
    best_weights = save_dir / "weights" / "best.pt"
    if not best_weights.is_file():
        raise FileNotFoundError(f"Training finished without best weights: {best_weights}")
    target = Path(f"{args.task}_model.pt")
    shutil.copy2(best_weights, target)
    return target


def main() -> int:
    args = build_parser().parse_args()
    target = train_model(args)
    print(f"Saved {args.task} model to {target}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
