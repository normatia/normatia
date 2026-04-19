#!/usr/bin/env python3
"""Search codes in Normatia, inspect CTE DB-HE details, and list versions."""

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


def print_code_search(payload: dict[str, Any]) -> None:
    items = payload.get("items")
    if not isinstance(items, list):
        items = []

    total = payload.get("total")

    print("Code Search Results")
    print("===================")
    print(f"query: eficiencia energética")
    print(f"total: {total if total is not None else len(items)}")

    if not items:
        print("No codes found.")
        return

    for index, item in enumerate(items[:10], start=1):
        if not isinstance(item, dict):
            continue
        print(f"{index}. slug: {item.get('slug')}")
        print(f"   title: {item.get('title')}")
        print(f"   normative_scope: {item.get('normative_scope')}")


def print_code_detail(payload: dict[str, Any]) -> None:
    print("\nCode Detail: cte-db-he")
    print("======================")
    print(f"slug: {payload.get('slug')}")
    print(f"title: {payload.get('title')}")
    print(f"normative_scope: {payload.get('normative_scope')}")

    documents = payload.get("documents")
    if not isinstance(documents, list):
        documents = []

    print("documents:")
    if not documents:
        print("  none")
        return

    for document in documents:
        if isinstance(document, dict):
            name = document.get("title") or document.get("name") or "untitled"
            url = document.get("url") or document.get("href") or "no-url"
            print(f"  - {name} ({url})")
        else:
            print(f"  - {document}")


def print_versions(payload: Any) -> None:
    versions: list[Any]
    if isinstance(payload, list):
        versions = payload
    elif isinstance(payload, dict):
        possible = payload.get("versions") or payload.get("items") or payload.get("results")
        versions = possible if isinstance(possible, list) else []
    else:
        versions = []

    print("\nAvailable Versions")
    print("==================")
    if not versions:
        print("No versions found.")
        return

    for version in versions:
        if isinstance(version, dict):
            value = version.get("version") or version.get("id") or version.get("slug")
            label = version.get("label") or version.get("title")
            status = version.get("status")
            pieces = [str(value)] if value is not None else []
            if label:
                pieces.append(str(label))
            if status:
                pieces.append(f"status={status}")
            print(f"- {' | '.join(pieces) if pieces else version}")
        else:
            print(f"- {version}")


async def main() -> None:
    base_url, headers = get_client_config()

    try:
        async with httpx.AsyncClient(base_url=base_url, headers=headers, timeout=20.0) as client:
            search_response = await client.get(
                "/api/v1/codes/search",
                params={"q": "eficiencia energética"},
            )
            search_response.raise_for_status()
            search_payload = search_response.json()
            if not isinstance(search_payload, dict):
                raise RuntimeError("Unexpected response shape for code search.")
            print_code_search(search_payload)

            detail_response = await client.get("/api/v1/codes/cte-db-he")
            detail_response.raise_for_status()
            detail_payload = detail_response.json()
            if not isinstance(detail_payload, dict):
                raise RuntimeError("Unexpected response shape for code detail.")
            print_code_detail(detail_payload)

            versions_response = await client.get("/api/v1/codes/cte-db-he/versions")
            versions_response.raise_for_status()
            versions_payload = versions_response.json()
            print_versions(versions_payload)

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
