#!/usr/bin/env python3
"""Ask a regulation question to Normatia AI and print answer with sources."""

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
    print("Sources")
    print("=======")
    if not isinstance(sources, list) or not sources:
        print("No sources returned.")
        return

    for index, source in enumerate(sources, start=1):
        if isinstance(source, dict):
            title = source.get("title") or source.get("name") or "untitled"
            section = source.get("section") or source.get("reference") or "no-section"
            url = source.get("url") or source.get("href")
            if url:
                print(f"{index}. {title} | {section} | {url}")
            else:
                print(f"{index}. {title} | {section}")
        else:
            print(f"{index}. {source}")


async def main() -> None:
    base_url, headers = get_client_config()

    request_payload = {
        "query": "¿Cuáles son los requisitos de aislamiento térmico para muros exteriores?",
        "geo_id": "ES-41091",
    }

    try:
        async with httpx.AsyncClient(base_url=base_url, headers=headers, timeout=30.0) as client:
            response = await client.post("/api/v1/ask", json=request_payload)
            response.raise_for_status()
            payload = response.json()
            if not isinstance(payload, dict):
                raise RuntimeError("Unexpected response shape for AI Q&A.")

            print("Question")
            print("========")
            print(request_payload["query"])

            print("\nAnswer")
            print("======")
            print(payload.get("answer", "No answer returned."))

            print()
            print_sources(payload.get("sources"))

            geo_context = payload.get("geo_context")
            if geo_context is not None:
                print("\nGeo Context")
                print("===========")
                print(geo_context)

            metadata = payload.get("metadata")
            if metadata is not None:
                print("\nMetadata")
                print("========")
                print(metadata)

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
