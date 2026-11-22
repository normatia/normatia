#!/usr/bin/env python3
"""Check whether a window U-value complies, asking Normatia in plain words.

Uses the agentic endpoint `POST /api/v2/ask` on the user's active project: the
project already carries its municipality, its climate zone and its regulations,
so the question only needs the element and its value. The answer gives the
limit, the section that sets it and the verdict, with its sources.

Each call costs 5 credits of the organization's balance, nothing if it fails.
Without enough credits the API answers 402 `insufficient_credits`.
"""

from __future__ import annotations

import asyncio
import os
import sys
from typing import Any

import httpx

DEFAULT_API_URL = "https://api.normatia.com"

# A turn is capped server-side at 120 s. Give the client margin on top: cutting
# the request early does not stop the turn, it just throws the answer away.
REQUEST_TIMEOUT = 150.0

QUERY = (
    "Una ventana exterior de aluminio con rotura de puente térmico tiene una "
    "transmitancia U = 2,7 W/m²K. ¿Cumple el CTE DB-HE en mi proyecto? Dime el "
    "valor límite, el apartado que lo fija y si cumple."
)


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
    """Print the cited sources. `index` is the N of each [N] marker."""
    print("Sources")
    print("=======")
    if not isinstance(sources, list) or not sources:
        print("No sources returned.")
        return

    for source in sources:
        if not isinstance(source, dict):
            print(f"- {source}")
            continue

        title = source.get("document_title") or "untitled"
        parts = [part for part in (source.get("section_title"), source.get("block_title")) if part]
        line = f"[{source.get('index', '?')}] {title}" + (f" | {' | '.join(parts)}" if parts else "")
        print(f"{line} | {source['url']}" if source.get("url") else line)


async def main() -> None:
    base_url, headers = get_client_config()

    try:
        async with httpx.AsyncClient(base_url=base_url, headers=headers, timeout=REQUEST_TIMEOUT) as client:
            # Omit project_id to use the active project; add it to check another one.
            response = await client.post("/api/v2/ask", json={"query": QUERY})
            if response.status_code == 402:
                detail = response.json().get("detail") or {}
                print("Not enough credits for this query.")
                print(f"Available: {detail.get('available')} | needed: {detail.get('required')}")
                sys.exit(1)
            response.raise_for_status()
            payload = response.json()
            if not isinstance(payload, dict):
                raise RuntimeError("Unexpected response shape for the query.")

            print("Compliance check: window U-value")
            print("================================")
            print(QUERY)
            print()
            print("Answer")
            print("======")
            print(payload.get("answer", "No answer returned."))
            print()
            print_sources(payload.get("sources"))

            project = payload.get("project") or {}
            print(f"\nProject: {project.get('location')} | {project.get('project_id')}")

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
