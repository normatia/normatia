#!/usr/bin/env python3
"""Run a sample compliance verification for window thermal transmittance."""

from __future__ import annotations

import asyncio
import os
import sys
from typing import Any

import httpx

DEFAULT_API_URL = "https://api.normatia.com"


def get_client_config() -> tuple[str, dict[str, str]]:
    api_key = os.getenv("NORMATIA_API_KEY")
    if not api_key:
        raise RuntimeError(
            "Missing NORMATIA_API_KEY environment variable. "
            "Set it to your bearer key, for example: sk-normatia-xxxxx"
        )

    base_url = os.getenv("NORMATIA_API_URL", DEFAULT_API_URL).rstrip("/")
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Accept": "application/json",
        "Content-Type": "application/json",
    }
    return base_url, headers


def print_sources(sources: Any) -> None:
    print("sources:")
    if not isinstance(sources, list) or not sources:
        print("  none")
        return

    for source in sources:
        if isinstance(source, dict):
            title = source.get("title") or source.get("name") or "untitled"
            ref = source.get("reference") or source.get("url") or source.get("id") or "no-reference"
            print(f"  - {title} ({ref})")
        else:
            print(f"  - {source}")


def print_result(payload: dict[str, Any]) -> None:
    print("Compliance Check: Window U-Value")
    print("===============================")
    print("geo_id: ES-41091")
    print("scope: CTE DB-HE")
    print("input: U = 2.7 W/m2K")
    print()
    print(f"is_compliant: {payload.get('is_compliant')}")
    print(f"result_status: {payload.get('result_status')}")
    print(f"limit_value: {payload.get('limit_value')}")
    print(f"unit: {payload.get('unit')}")
    print(f"reasoning: {payload.get('reasoning')}")
    print_sources(payload.get("sources"))


async def main() -> None:
    base_url, headers = get_client_config()
    request_payload = {
        "element": "Ventana exterior con carpintería de aluminio con rotura de puente térmico",
        "parameter": "Transmitancia térmica (valor U)",
        "value": 2.7,
        "unit": "W/m2K",
        "geo_id": "ES-41091",
    }

    try:
        async with httpx.AsyncClient(base_url=base_url, headers=headers, timeout=20.0) as client:
            response = await client.post("/api/v1/verify", json=request_payload)
            response.raise_for_status()
            payload = response.json()
            if not isinstance(payload, dict):
                raise RuntimeError("Unexpected response shape for compliance verification.")

            print_result(payload)

    except httpx.HTTPStatusError as exc:
        print("\nRequest failed with a non-success HTTP status.")
        print(f"Status: {exc.response.status_code}")
        print(f"URL: {exc.request.url}")
        print(f"Body: {exc.response.text}")
        sys.exit(1)
    except httpx.RequestError as exc:
        print("\nNetwork error while calling Normatia API.")
        print(f"Error: {exc}")
        sys.exit(1)
    except RuntimeError as exc:
        print(f"\nConfiguration or response error: {exc}")
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
