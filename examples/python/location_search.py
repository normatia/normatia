#!/usr/bin/env python3
"""Demonstrate `search_locations` only using Normatia's search endpoint."""

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
