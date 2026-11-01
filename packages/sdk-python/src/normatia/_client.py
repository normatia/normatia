"""The Normatia API client, sync (``Normatia``) and async (``AsyncNormatia``).

Every method is defined once in ``_Methods`` and returns whatever ``_call`` returns: the decoded JSON in the sync
client, a coroutine in the async one. GET requests are retried on 429 ``rate_limit_exceeded``, 502, 503 and 504 and on
network errors, waiting ``Retry-After`` when the API sends it. POST requests (``ask``, ``verify``) are never retried:
a retry would spend a second credit.
"""
from __future__ import annotations

import asyncio
import os
import random
import time
from dataclasses import dataclass, field
from datetime import date
from typing import Any, AsyncIterator, Dict, Iterator, List, Optional, Sequence, Union

import httpx

from .errors import NormatiaError, ValidationError, error_from_response
from .types import (
    AskV2Response,
    Coverage,
    KeyList,
    LayerList,
    MeResponse,
    Parcel,
    ParcelsAtPoint,
    PlaceDetail,
    PlaceList,
    Regulation,
    RegulationContents,
    RegulationDetail,
    RegulationList,
    RegulationSection,
    SandboxInfo,
    UsageResponse,
    VerifyResponse,
)

__version__ = "0.1.0"

DEFAULT_BASE_URL = "https://api.normatia.com"
DEFAULT_TIMEOUT_S = 30.0
# A turn of the agentic engine is capped server-side at 120 s. Waiting less does not stop the turn: it spends the
# credit and throws the answer away.
ASK_TIMEOUT_S = 150.0
MAX_RETRY_WAIT_S = 30.0
PARCEL_INCLUDES = ("constraints", "zoning", "buildings", "units", "geometry")
_RETRY_STATUSES = {502, 503, 504}

DateLike = Union[date, str]


@dataclass
class _Request:
    method: str
    path: str
    params: Dict[str, Any] = field(default_factory=dict)
    json: Any = None
    timeout: Optional[float] = None
    retry: bool = True


def _clean(params: Dict[str, Any]) -> Dict[str, Any]:
    out: Dict[str, Any] = {}
    for key, value in params.items():
        if value is None:
            continue
        if isinstance(value, bool):
            out[key] = "true" if value else "false"
        elif isinstance(value, date):
            out[key] = value.isoformat()
        else:
            out[key] = value
    return out


def _required(value: Any, name: str) -> str:
    if not isinstance(value, str) or not value.strip():
        raise ValidationError(f"{name} must be a non-empty string.", 0, code="invalid_argument")
    return value.strip()


def _path_part(value: str) -> str:
    from urllib.parse import quote

    return quote(value, safe="")


class _Methods:
    """The API, one method per route. Subclasses provide ``_call``."""

    def _call(self, request: _Request) -> Any:  # pragma: no cover - overridden
        raise NotImplementedError

    # ── Account ─────────────────────────────────────────────────────────

    def get_me(self) -> MeResponse:
        """The key, its organization, whether it is a sandbox key, its limits and the month's quota."""
        return self._call(_Request("GET", "/v1/me"))

    def get_usage(self, *, from_date: Optional[DateLike] = None, to_date: Optional[DateLike] = None) -> UsageResponse:
        """Calls and credits between two days (UTC, both included), by route and by day. At most 92 days."""
        return self._call(_Request("GET", "/v1/usage", {"from": from_date, "to": to_date}))

    def list_keys(self) -> KeyList:
        """The user's keys in the key's organization, active and revoked."""
        return self._call(_Request("GET", "/v1/keys"))

    def revoke_key(self, key_id: str) -> None:
        """Revoke one of the user's keys (also the one making the call). It cannot be undone."""
        return self._call(_Request("DELETE", f"/v1/keys/{_path_part(_required(key_id, 'key_id'))}", retry=False))

    # ── Parcels ─────────────────────────────────────────────────────────

    def get_parcel(self, ref: str, *, include: Sequence[str] = ()) -> Parcel:
        """A parcel by its cadastral reference (14 characters, or the 20 of a unit).

        ``include`` adds blocks in the same call: constraints, zoning, buildings, units, geometry. A layer that is
        not loaded in the parcel's municipality comes back ``no_data``, never ``not_affected``.
        """
        unknown = sorted(set(include) - set(PARCEL_INCLUDES))
        if unknown:
            raise ValidationError(f"Unknown include: {', '.join(unknown)}.", 0, code="invalid_include")
        params = {"include": ",".join(include) if include else None}
        return self._call(_Request("GET", f"/v1/parcels/{_path_part(_required(ref, 'ref'))}", params))

    def find_parcels_at_point(self, lat: float, lon: float) -> ParcelsAtPoint:
        """The parcel that contains a WGS84 point or, if none does, the nearest ones."""
        return self._call(_Request("GET", "/v1/parcels", {"lat": lat, "lon": lon}))

    def get_sandbox(self) -> SandboxInfo:
        """The parcels a sandbox key (``sk-normatia-test-``) answers with, and the case each one covers."""
        return self._call(_Request("GET", "/v1/sandbox"))

    # ── Layers, coverage and places ─────────────────────────────────────

    def list_layers(self) -> LayerList:
        """Every constraint layer with its name, theme, mode and sources (license, attribution)."""
        return self._call(_Request("GET", "/v1/layers"))

    def get_coverage(self, place: str) -> Coverage:
        """What is loaded for a municipality (``ES-41091`` or ``41091``): cadastre, planning and each layer."""
        return self._call(_Request("GET", "/v1/coverage", {"place": _required(place, "place")}))

    def find_places(
        self, q: str, *, level: Optional[str] = None, within: Optional[str] = None, limit: Optional[int] = None
    ) -> PlaceList:
        """Municipalities, provinces and regions by name (accent-insensitive) or INE code."""
        params = {"q": _required(q, "q"), "level": level, "within": within, "limit": limit}
        return self._call(_Request("GET", "/v1/places", params))

    def get_place(self, place: str) -> PlaceDetail:
        """A place; for a municipality, its location and technical data, each with the regulation it comes from."""
        return self._call(_Request("GET", f"/v1/places/{_path_part(_required(place, 'place'))}"))

    # ── Regulations ─────────────────────────────────────────────────────

    def list_regulations(
        self,
        *,
        q: Optional[str] = None,
        scope: Optional[str] = None,
        tag: Optional[str] = None,
        place: Optional[str] = None,
        curated: Optional[bool] = None,
        limit: Optional[int] = None,
        cursor: Optional[str] = None,
    ) -> RegulationList:
        """One page of the regulation catalog. ``iter_regulations`` walks every page."""
        params = {"q": q, "scope": scope, "tag": tag, "place": place, "curated": curated, "limit": limit,
                  "cursor": cursor}
        return self._call(_Request("GET", "/v1/regulations", params))

    def get_regulation(self, slug: str) -> RegulationDetail:
        """A regulation, its versions (with ``has_text`` and ``curated``) and its related documents."""
        return self._call(_Request("GET", f"/v1/regulations/{_path_part(_required(slug, 'slug'))}"))

    def get_regulation_contents(self, slug: str, *, version: Optional[str] = None) -> RegulationContents:
        """The table of contents of a version (the current one if ``version`` is omitted)."""
        path = f"/v1/regulations/{_path_part(_required(slug, 'slug'))}/contents"
        return self._call(_Request("GET", path, {"version": version}))

    def get_regulation_section(
        self, slug: str, section: str, *, version: Optional[str] = None, format: Optional[str] = None
    ) -> RegulationSection:
        """The text of one section, block by block. ``format="html"`` adds the formatted text."""
        path = (f"/v1/regulations/{_path_part(_required(slug, 'slug'))}"
                f"/sections/{_path_part(_required(section, 'section'))}")
        return self._call(_Request("GET", path, {"version": version, "format": format}))

    # ── Intelligence (spends credits) ───────────────────────────────────

    def ask(self, query: str, *, project_id: Optional[str] = None) -> AskV2Response:
        """A question about a project, answered by the agentic engine with its sources. One credit; 10 to 60 s."""
        body = {"query": _required(query, "query"), "project_id": project_id}
        return self._call(_Request("POST", "/api/v2/ask", json={k: v for k, v in body.items() if v is not None},
                                   timeout=ASK_TIMEOUT_S, retry=False))

    def verify(
        self,
        *,
        element: str,
        parameter: str,
        value: float,
        unit: str,
        geo_id: str,
        codes: Optional[List[Dict[str, str]]] = None,
    ) -> VerifyResponse:
        """Whether a value complies with the applicable regulation in a place. One credit."""
        body: Dict[str, Any] = {
            "element": _required(element, "element"),
            "parameter": _required(parameter, "parameter"),
            "value": value,
            "unit": _required(unit, "unit"),
            "geo_id": _required(geo_id, "geo_id"),
        }
        if codes:
            body["codes"] = codes
        return self._call(_Request("POST", "/api/v1/verify", json=body, timeout=ASK_TIMEOUT_S, retry=False))


class _Base(_Methods):
    def __init__(
        self,
        api_key: Optional[str],
        base_url: str,
        timeout: float,
        max_retries: int,
    ) -> None:
        api_key = api_key or os.environ.get("NORMATIA_API_KEY")
        if not api_key or not api_key.strip():
            raise ValueError("Normatia needs an API key: pass api_key or set NORMATIA_API_KEY.")
        self.api_key = api_key.strip()
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout
        self.max_retries = max(0, max_retries)

    @property
    def is_sandbox(self) -> bool:
        """Whether the key is a sandbox key (``sk-normatia-test-``)."""
        return self.api_key.startswith("sk-normatia-test-")

    def _headers(self) -> Dict[str, str]:
        return {
            "Authorization": f"Bearer {self.api_key}",
            "Accept": "application/json",
            "User-Agent": f"normatia-python/{__version__}",
        }

    def _decode(self, response: httpx.Response) -> Any:
        if response.status_code == 204 or not response.content:
            if response.is_success:
                return None
            body: Any = None
        else:
            try:
                body = response.json()
            except ValueError:
                if response.is_success:
                    raise NormatiaError("The API response was not valid JSON.", response.status_code,
                                        body=response.text, request_id=response.headers.get("x-request-id"))
                body = {"message": response.text}
        if response.is_success:
            return body
        raise error_from_response(response.status_code, body, response.headers)

    def _should_retry(self, request: _Request, attempt: int, error: Optional[NormatiaError]) -> bool:
        if not request.retry or attempt >= self.max_retries:
            return False
        if error is None:
            return True  # network error
        if error.status_code == 429:
            return error.code != "quota_exceeded"
        return error.status_code in _RETRY_STATUSES

    @staticmethod
    def _wait(attempt: int, error: Optional[NormatiaError]) -> float:
        if error is not None and error.retry_after is not None:
            return min(float(error.retry_after), MAX_RETRY_WAIT_S)
        return min(0.5 * (2 ** attempt) + random.uniform(0, 0.25), MAX_RETRY_WAIT_S)


class Normatia(_Base):
    """The Normatia API client.

    >>> client = Normatia()  # reads NORMATIA_API_KEY
    >>> parcel = client.get_parcel("6963301TG3466N", include=["constraints", "zoning"])
    """

    def __init__(
        self,
        api_key: Optional[str] = None,
        *,
        base_url: str = DEFAULT_BASE_URL,
        timeout: float = DEFAULT_TIMEOUT_S,
        max_retries: int = 2,
        http_client: Optional[httpx.Client] = None,
    ) -> None:
        super().__init__(api_key, base_url, timeout, max_retries)
        self._http = http_client or httpx.Client()
        self._owns_http = http_client is None

    def _call(self, request: _Request) -> Any:
        attempt = 0
        while True:
            error: Optional[NormatiaError] = None
            try:
                response = self._http.request(
                    request.method, f"{self.base_url}{request.path}", params=_clean(request.params),
                    json=request.json, headers=self._headers(), timeout=request.timeout or self.timeout,
                )
                return self._decode(response)
            except NormatiaError as e:
                error = e
                if not self._should_retry(request, attempt, error):
                    raise
            except httpx.TransportError as e:
                if not self._should_retry(request, attempt, None):
                    raise NormatiaError(f"Network request failed: {e}") from e
            time.sleep(self._wait(attempt, error))
            attempt += 1

    def iter_regulations(self, **filters: Any) -> Iterator[Regulation]:
        """Every regulation that matches the filters of ``list_regulations``, page after page."""
        cursor = filters.pop("cursor", None)
        while True:
            page = self.list_regulations(cursor=cursor, **filters)
            yield from page["data"]
            cursor = page.get("next_cursor")
            if not page.get("has_more") or not cursor:
                return

    def close(self) -> None:
        if self._owns_http:
            self._http.close()

    def __enter__(self) -> "Normatia":
        return self

    def __exit__(self, *exc: Any) -> None:
        self.close()


class AsyncNormatia(_Base):
    """The async Normatia API client: the same methods, awaited.

    >>> async with AsyncNormatia() as client:
    ...     place = await client.get_place("ES-41091")
    """

    def __init__(
        self,
        api_key: Optional[str] = None,
        *,
        base_url: str = DEFAULT_BASE_URL,
        timeout: float = DEFAULT_TIMEOUT_S,
        max_retries: int = 2,
        http_client: Optional[httpx.AsyncClient] = None,
    ) -> None:
        super().__init__(api_key, base_url, timeout, max_retries)
        self._http = http_client or httpx.AsyncClient()
        self._owns_http = http_client is None

    async def _call(self, request: _Request) -> Any:  # type: ignore[override]
        attempt = 0
        while True:
            error: Optional[NormatiaError] = None
            try:
                response = await self._http.request(
                    request.method, f"{self.base_url}{request.path}", params=_clean(request.params),
                    json=request.json, headers=self._headers(), timeout=request.timeout or self.timeout,
                )
                return self._decode(response)
            except NormatiaError as e:
                error = e
                if not self._should_retry(request, attempt, error):
                    raise
            except httpx.TransportError as e:
                if not self._should_retry(request, attempt, None):
                    raise NormatiaError(f"Network request failed: {e}") from e
            await asyncio.sleep(self._wait(attempt, error))
            attempt += 1

    async def iter_regulations(self, **filters: Any) -> AsyncIterator[Regulation]:
        """Every regulation that matches the filters of ``list_regulations``, page after page."""
        cursor = filters.pop("cursor", None)
        while True:
            page = await self.list_regulations(cursor=cursor, **filters)
            for regulation in page["data"]:
                yield regulation
            cursor = page.get("next_cursor")
            if not page.get("has_more") or not cursor:
                return

    async def aclose(self) -> None:
        if self._owns_http:
            await self._http.aclose()

    async def __aenter__(self) -> "AsyncNormatia":
        return self

    async def __aexit__(self, *exc: Any) -> None:
        await self.aclose()
