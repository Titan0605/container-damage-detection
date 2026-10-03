"""Example payload from an inference pipeline; does not run a trained model."""
import json
import os
import sys

import requests


def main() -> None:
    url = os.getenv("REPORTS_API_URL", "http://127.0.0.1:3001/api/reports")
    key = os.getenv("INGEST_API_KEY")
    payload = {
        "serial_number": "MSKU123",
        "damages": [{"type": "rust", "confidence": 0.89}],
    }
    try:
        response = requests.post(
            url,
            json=payload,
            headers={"X-API-Key": key} if key else {},
            timeout=(5, 30),
        )
        response.raise_for_status()
        print(json.dumps(response.json(), indent=2, ensure_ascii=False))
    except requests.Timeout:
        sys.exit("Timeout: verifica el historial antes de reenviar; el reporte podría estar guardado.")
    except requests.RequestException as error:
        sys.exit(f"No se pudo enviar la inspección: {error}")


if __name__ == "__main__":
    main()
