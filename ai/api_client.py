"""HTTP client for the reports backend contract."""

from __future__ import annotations

from collections.abc import Mapping, Sequence
from typing import Protocol, cast

import requests


class HttpResponse(Protocol):
    status_code: int

    def raise_for_status(self) -> None: ...


class HttpSession(Protocol):
    def post(
        self,
        url: str,
        *,
        json: object,
        timeout: float,
        headers: Mapping[str, str],
    ) -> HttpResponse: ...


def build_payload(serial_number: str, damages: Sequence[dict[str, float | str]]) -> dict[str, object]:
    return {"serial_number": serial_number, "damages": list(damages)}


def post_report(
    api_url: str,
    payload: dict[str, object],
    timeout_seconds: float,
    api_key: str | None = None,
    session: HttpSession | None = None,
) -> int:
    """Post one report and return its HTTP status code."""
    client: HttpSession = session if session is not None else cast(HttpSession, requests.Session())
    headers = {"X-API-Key": api_key} if api_key else {}
    try:
        response = client.post(api_url, json=payload, timeout=timeout_seconds, headers=headers)
        response.raise_for_status()
    except requests.RequestException as error:
        raise RuntimeError(f"Could not send report to {api_url}: {error}") from error
    return response.status_code
