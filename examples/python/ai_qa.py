#!/usr/bin/env python3
"""Ask a regulation question to Normatia and print the answer with its sources.

Uses the agentic endpoint `POST /api/v2/ask`. The scope of the query comes from
the project, so there is no `geo_id` or code filter to pass: list the projects
first and pick one, or omit `project_id` to use the user's active project.
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


async def pick_project(client: httpx.AsyncClient) -> dict[str, Any] | None:
    """Return the active project, or the first one the user can access."""
    response = await client.get("/api/v1/projects")
    response.raise_for_status()
    projects = response.json().get("projects") or []

    if not projects:
        return None

    print("Projects")
    print("========")
    for project in projects:
        mark = " (active)" if project.get("is_active") else ""
        print(f"- {project.get('name')}{mark} | {project.get('location')} | {project.get('project_id')}")
    print()

    for project in projects:
        if project.get("is_active"):
            return project
    return projects[0]


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

        index = source.get("index", "?")
        title = source.get("document_title") or "untitled"
        parts = [part for part in (source.get("section_title"), source.get("block_title")) if part]
        detail = " | ".join(parts)
        line = f"[{index}] {title}" + (f" | {detail}" if detail else "")

        if source.get("citation_type") == "user_document":
            # Private document uploaded to the project: it has no public URL.
            print(f"{line} | (project document)")
        elif source.get("url"):
            print(f"{line} | {source['url']}")
        else:
            print(line)


async def main() -> None:
    base_url, headers = get_client_config()

    query = "¿Cuáles son los requisitos de aislamiento térmico para muros exteriores?"

    try:
        async with httpx.AsyncClient(
            base_url=base_url, headers=headers, timeout=REQUEST_TIMEOUT
        ) as client:
            project = await pick_project(client)
            if project is None:
                print(
                    "This account has no projects. Create one at normatia.com — the "
                    "regulatory scope of a query is defined by its project."
                )
                sys.exit(1)

            request_payload = {"query": query, "project_id": project["project_id"]}

            response = await client.post("/api/v2/ask", json=request_payload)
            response.raise_for_status()
            payload = response.json()
            if not isinstance(payload, dict):
                raise RuntimeError("Unexpected response shape for AI Q&A.")

            print("Question")
            print("========")
            print(query)

            print("\nAnswer")
            print("======")
            print(payload.get("answer", "No answer returned."))

            print()
            print_sources(payload.get("sources"))

            resolved = payload.get("project")
            if resolved:
                print("\nProject")
                print("=======")
                print(f"{resolved.get('location')} | {resolved.get('project_id')}")

            print(
                f"\nTurn: {payload.get('iterations', 0)} reasoning rounds, "
                f"{payload.get('searches', 0)} searches."
            )

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
