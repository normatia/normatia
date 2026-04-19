#!/usr/bin/env python3
"""Search locations in Normatia and fetch detail for a specific geo_id."""

from __future__ import annotations

import asyncio
import json
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
    }
    return base_url, headers


def print_location_results(results: list[dict[str, Any]]) -> None:
    print("Location Search Results")
    print("=======================")
    if not results:
        print("No locations found.")
        return

    for index, item in enumerate(results, start=1):
        ancestors = item.get("ancestors") if isinstance(item, dict) else []
        if not isinstance(ancestors, list):
            ancestors = []

        ancestor_names = [
            ancestor.get("name", "")
            for ancestor in ancestors
            if isinstance(ancestor, dict)
        ]

        print(f"{index}. geo_id: {item.get('geo_id')}")
        print(f"   name: {item.get('name')}")
        print(f"   level: {item.get('level')}")
        print(f"   ancestors: {', '.join(filter(None, ancestor_names)) or 'n/a'}")


def print_location_detail(detail: dict[str, Any]) -> None:
    print("\nLocation Detail: ES-41091")
    print("=========================")
    print(f"geo_id: {detail.get('geo_id')}")
    print(f"name: {detail.get('name')}")
    print(f"level: {detail.get('level')}")

    print("\ntech_data:")
    print(json.dumps(detail.get("tech_data", {}), ensure_ascii=False, indent=2))

    applicable_codes = detail.get("applicable_codes")
    if not isinstance(applicable_codes, list):
        applicable_codes = []

    print("\napplicable_codes:")
    if not applicable_codes:
        print("  none")
        return

    for code in applicable_codes:
        if isinstance(code, dict):
            label = code.get("slug") or code.get("title") or str(code)
            title = code.get("title")
            if title and title != label:
                print(f"  - {label}: {title}")
            else:
                print(f"  - {label}")
        else:
            print(f"  - {code}")


async def main() -> None:
    base_url, headers = get_client_config()

    try:
        async with httpx.AsyncClient(base_url=base_url, headers=headers, timeout=20.0) as client:
            search_response = await client.get("/api/v1/location/search", params={"q": "Sevilla"})
            search_response.raise_for_status()
            search_payload = search_response.json()

            results: list[dict[str, Any]] = []
            if isinstance(search_payload, dict) and isinstance(search_payload.get("results"), list):
                results = [item for item in search_payload["results"] if isinstance(item, dict)]

            print_location_results(results)

            detail_response = await client.get("/api/v1/location/ES-41091")
            detail_response.raise_for_status()
            detail_payload = detail_response.json()
            if not isinstance(detail_payload, dict):
                raise RuntimeError("Unexpected response shape for location detail.")

            print_location_detail(detail_payload)

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
