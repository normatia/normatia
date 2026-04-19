"""Shared async HTTP client for calling the Normatia FastAPI service."""

from __future__ import annotations

import json

import httpx

from normatia_mcp.config import get_mcp_settings

_client: httpx.AsyncClient | None = None


async def get_http_client() -> httpx.AsyncClient:
    """Return a lazily initialized shared httpx async client."""
    global _client

    if _client is None:
        settings = get_mcp_settings()
        _client = httpx.AsyncClient(
            base_url=settings.normatia_api_base_url,
            headers={
                "Authorization": f"Bearer {settings.normatia_api_key}",
                "User-Agent": "normatia-mcp/0.1.0",
            },
            timeout=httpx.Timeout(30.0),
        )

    return _client


def _extract_error_detail(response: httpx.Response) -> str:
    """Extract a useful error detail string from a JSON or text response."""
    try:
        payload = response.json()
    except ValueError:
        return response.text

    if isinstance(payload, dict) and "detail" in payload:
        detail = payload["detail"]
        if isinstance(detail, str):
            return detail
        return json.dumps(detail, ensure_ascii=True)

    return json.dumps(payload, ensure_ascii=True)


async def _request(method: str, path: str, *, params: dict | None = None, body: dict | None = None) -> dict | list:
    """Perform an HTTP request and normalize response/error handling."""
    settings = get_mcp_settings()
    client = await get_http_client()

    try:
        response = await client.request(method, path, params=params, json=body)
    except httpx.ConnectError as exc:
        raise Exception(
            f"Cannot connect to Normatia API at {settings.normatia_api_base_url}. Is the server running?"
        ) from exc

    if response.status_code >= 400:
        detail = _extract_error_detail(response)

        if response.status_code == 401:
            raise Exception("Authentication failed. Check your NORMATIA_API_KEY.")
        if response.status_code == 429:
            raise Exception(detail)
        if response.status_code == 404:
            raise Exception(detail)
        if response.status_code == 422:
            raise Exception(detail)

        raise Exception(f"Normatia API error {response.status_code}: {response.text}")

    try:
        payload = response.json()
    except ValueError as exc:
        raise Exception("Normatia API returned a non-JSON response.") from exc

    return payload


async def api_get(path: str, params: dict | None = None) -> dict | list:
    """Issue a GET request and return the parsed JSON body."""
    return await _request("GET", path, params=params)


async def api_post(path: str, body: dict) -> dict | list:
    """Issue a POST request and return the parsed JSON body."""
    return await _request("POST", path, body=body)