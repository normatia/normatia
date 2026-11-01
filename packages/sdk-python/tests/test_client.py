"""The client against a fake transport: requests, both error formats, retries and pagination. No network."""
from __future__ import annotations

import json

import httpx
import pytest

from normatia import (
    AsyncNormatia,
    ForbiddenError,
    Normatia,
    NotFoundError,
    RateLimitError,
    ServiceUnavailableError,
    ValidationError,
)
from normatia import _client

KEY = "sk-normatia-test-" + "a" * 64


def _client_with(handler, **kwargs) -> Normatia:
    return Normatia(KEY, http_client=httpx.Client(transport=httpx.MockTransport(handler)), **kwargs)


@pytest.fixture(autouse=True)
def _no_sleep(monkeypatch):
    monkeypatch.setattr(_client.time, "sleep", lambda s: None)


def test_get_parcel_sends_the_key_and_the_includes() -> None:
    seen = {}

    def handler(request: httpx.Request) -> httpx.Response:
        seen["url"] = str(request.url)
        seen["auth"] = request.headers["authorization"]
        return httpx.Response(200, json={"object": "parcel", "ref": "6963301TG3466N"})

    parcel = _client_with(handler).get_parcel("6963301TG3466N", include=["constraints", "zoning"])
    assert parcel["ref"] == "6963301TG3466N"
    assert seen["url"] == "https://api.normatia.com/v1/parcels/6963301TG3466N?include=constraints%2Czoning"
    assert seen["auth"] == f"Bearer {KEY}"


def test_an_unknown_include_fails_before_sending() -> None:
    with pytest.raises(ValidationError) as e:
        _client_with(lambda r: httpx.Response(500)).get_parcel("6963301TG3466N", include=["owners"])
    assert e.value.code == "invalid_include"


def test_a_v1_problem_becomes_a_typed_error() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        body = {"type": "https://docs.normatia.com/api-reference/errores/#not_in_sandbox", "title": "Not Found",
                "status": 404, "code": "not_in_sandbox", "detail": "Esa parcela no está en el entorno de pruebas.",
                "sandbox_url": "https://docs.normatia.com/api-reference/pruebas/"}
        return httpx.Response(404, json=body, headers={"X-Request-Id": "req_123", "Content-Type": "application/problem+json"})

    with pytest.raises(NotFoundError) as e:
        _client_with(handler).get_parcel("4141412VG4444S")
    assert e.value.code == "not_in_sandbox" and e.value.request_id == "req_123"
    assert e.value.body["sandbox_url"].endswith("/pruebas/")
    assert "not_in_sandbox" in str(e.value) and "req_123" in str(e.value)


def test_a_classic_error_too() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(403, json={"detail": {"error": "not_available_in_sandbox", "message": "No en pruebas."}})

    with pytest.raises(ForbiddenError) as e:
        _client_with(handler).verify(element="puerta", parameter="ancho", value=0.8, unit="m", geo_id="ES-28079")
    assert e.value.code == "not_available_in_sandbox" and e.value.message == "No en pruebas."


def test_get_retries_after_retry_after(monkeypatch) -> None:
    calls = []

    def handler(request: httpx.Request) -> httpx.Response:
        calls.append(1)
        if len(calls) == 1:
            return httpx.Response(503, json={"code": "parcel_data_unavailable"}, headers={"Retry-After": "5"})
        return httpx.Response(200, json={"object": "parcel", "ref": "6963301TG3466N"})

    waits = []
    client = _client_with(handler)
    monkeypatch.setattr(_client.time, "sleep", waits.append)
    assert client.get_parcel("6963301TG3466N")["ref"] == "6963301TG3466N"
    assert len(calls) == 2 and waits == [5.0]


def test_gives_up_after_max_retries() -> None:
    calls = []

    def handler(request: httpx.Request) -> httpx.Response:
        calls.append(1)
        return httpx.Response(503, json={"code": "parcel_data_unavailable"})

    with pytest.raises(ServiceUnavailableError):
        _client_with(handler, max_retries=2).get_parcel("6963301TG3466N")
    assert len(calls) == 3


def test_quota_exceeded_is_not_retried() -> None:
    calls = []

    def handler(request: httpx.Request) -> httpx.Response:
        calls.append(1)
        return httpx.Response(429, json={"detail": {"error": "quota_exceeded", "message": "Sin cupo."}})

    with pytest.raises(RateLimitError) as e:
        _client_with(handler).get_me()
    assert e.value.code == "quota_exceeded" and len(calls) == 1


def test_ask_is_never_retried() -> None:
    calls = []

    def handler(request: httpx.Request) -> httpx.Response:
        calls.append(json.loads(request.content))
        return httpx.Response(503, json={"detail": {"error": "llm_unavailable"}})

    with pytest.raises(ServiceUnavailableError):
        _client_with(handler).ask("¿Altura libre mínima?", project_id="p1")
    assert calls == [{"query": "¿Altura libre mínima?", "project_id": "p1"}]


def test_iter_regulations_follows_the_cursor() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        assert request.url.params["curated"] == "true"
        if "cursor" not in request.url.params:
            return httpx.Response(200, json={"object": "list", "data": [{"slug": "a"}], "has_more": True,
                                             "next_cursor": "c2"})
        return httpx.Response(200, json={"object": "list", "data": [{"slug": "b"}], "has_more": False,
                                         "next_cursor": None})

    slugs = [r["slug"] for r in _client_with(handler).iter_regulations(curated=True)]
    assert slugs == ["a", "b"]


def test_revoke_key_returns_none_on_204() -> None:
    client = _client_with(lambda r: httpx.Response(204))
    assert client.revoke_key("k1") is None


def test_the_key_comes_from_the_environment(monkeypatch) -> None:
    monkeypatch.setenv("NORMATIA_API_KEY", KEY)
    assert Normatia().is_sandbox
    monkeypatch.delenv("NORMATIA_API_KEY")
    with pytest.raises(ValueError):
        Normatia()


async def test_the_async_client() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json={"object": "place", "geo_id": "ES-41091", "name": "Sevilla"})

    async with AsyncNormatia(KEY, http_client=httpx.AsyncClient(transport=httpx.MockTransport(handler))) as client:
        place = await client.get_place("41091")
    assert place["geo_id"] == "ES-41091"
