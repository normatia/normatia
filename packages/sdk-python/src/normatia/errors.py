"""Errors raised by the Normatia client.

Branch on ``code`` (for example ``parcel_not_found`` or ``insufficient_credits``), not on the message. The ``/v1``
routes answer RFC 9457 problems (``{"code": ..., "detail": ...}``, with their extra fields at the root); the older
``/api`` routes wrap theirs in ``{"detail": {"error": ..., "message": ...}}``. Both end up in the same fields here, and
``body`` keeps the whole response.
"""
from __future__ import annotations

from typing import Any, Optional


class NormatiaError(Exception):
    """Base class for every failure the client reports."""

    def __init__(
        self,
        message: str,
        status_code: int = 0,
        *,
        code: Optional[str] = None,
        body: Any = None,
        request_id: Optional[str] = None,
        retry_after: Optional[int] = None,
    ) -> None:
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.code = code
        #: The decoded response body, with any extra fields (``available``, ``required``, ``sandbox_url``...).
        self.body = body
        #: The ``X-Request-Id`` of the response. Include it when you contact support.
        self.request_id = request_id
        #: Seconds to wait before retrying, from ``Retry-After``.
        self.retry_after = retry_after

    def __str__(self) -> str:
        parts = [f"{self.status_code}" if self.status_code else "network", self.code or "", self.message]
        text = " ".join(p for p in parts if p)
        return f"{text} (request {self.request_id})" if self.request_id else text


class AuthenticationError(NormatiaError):
    """401: missing, malformed, unknown or revoked API key."""


class ForbiddenError(NormatiaError):
    """403: for example ``insufficient_scope`` or, with a sandbox key, ``not_available_in_sandbox``."""


class NotFoundError(NormatiaError):
    """404: the parcel, place, regulation or project does not exist, or (sandbox) is not in the sandbox."""


class ValidationError(NormatiaError):
    """422 from the API, or a request the client rejects before sending it."""


class RateLimitError(NormatiaError):
    """429: ``rate_limit_exceeded``, a per-minute limit.

    ``quota_exceeded`` belongs to the monthly query allowance of the plans before credits: with credits it is no longer
    sent, and running out of credits is a 402 (``InsufficientCreditsError``).
    """

    @property
    def group(self) -> Optional[str]:
        """Which per-minute limit was hit on ``rate_limit_exceeded``: the key's (``data``, ``intelligence``, ``mcp``)
        or ``organization``, the one shared by all the keys of the organization. None on ``quota_exceeded``.

        At the root of the body on ``/v1``, inside ``detail`` on the ``/api`` routes.
        """
        root = self.body if isinstance(self.body, dict) else {}
        detail = root.get("detail")
        value = (detail.get("group") if isinstance(detail, dict) else None) or root.get("group")
        return value if isinstance(value, str) else None


class ServiceUnavailableError(NormatiaError):
    """503: the territorial database did not answer in time. Retry after ``retry_after`` seconds."""


class APIError(NormatiaError):
    """Any other error status (500, 502 ``llm_unavailable``, 504...)."""


def _number(error: NormatiaError, name: str) -> Optional[float]:
    """A numeric field of the error: inside ``detail`` on the ``/api`` routes, at the root of the problem on ``/v1``."""
    root = error.body if isinstance(error.body, dict) else {}
    detail = root.get("detail")
    for source in (detail if isinstance(detail, dict) else {}, root):
        value = source.get(name)
        if isinstance(value, (int, float)) and not isinstance(value, bool):
            return value
    return None


class InsufficientCreditsError(APIError):
    """402: the organization's balance does not cover the call (``insufficient_credits``, with ``available`` and
    ``required``), or the member reached their monthly credit limit in the organization (``member_limit_reached``,
    with ``limit`` and ``spent``). Nothing was charged. Credits are bought on normatia.com.
    """

    @property
    def available(self) -> Optional[float]:
        """Credits the organization can spend right now, on ``insufficient_credits``."""
        return _number(self, "available")

    @property
    def required(self) -> Optional[float]:
        """Credits the call needed, on ``insufficient_credits``."""
        return _number(self, "required")

    @property
    def limit(self) -> Optional[float]:
        """The member's monthly credit limit, on ``member_limit_reached``."""
        return _number(self, "limit")

    @property
    def spent(self) -> Optional[float]:
        """Credits the member already spent this month, on ``member_limit_reached``."""
        return _number(self, "spent")


class RetiredEndpointError(APIError):
    """410 ``endpoint_retired``: the route no longer exists. ``POST /api/v1/verify`` was retired on 21 November 2026;
    ask with ``ask`` instead."""


_BY_STATUS = {
    401: AuthenticationError,
    402: InsufficientCreditsError,
    403: ForbiddenError,
    404: NotFoundError,
    410: RetiredEndpointError,
    422: ValidationError,
    429: RateLimitError,
    503: ServiceUnavailableError,
}


def error_from_response(status_code: int, body: Any, headers: Any) -> NormatiaError:
    """The typed error for an error response, from either error format."""
    root = body if isinstance(body, dict) else {}
    detail = root.get("detail")
    nested = detail if isinstance(detail, dict) else {}
    code = nested.get("error") or root.get("error") or root.get("code")
    message = (
        nested.get("message")
        or (detail if isinstance(detail, str) else None)
        or root.get("message")
        or root.get("title")
        or f"HTTP {status_code}"
    )
    request_id = headers.get("x-request-id") or nested.get("request_id") or root.get("request_id")
    try:
        retry_after: Optional[int] = int(headers.get("retry-after"))
    except (TypeError, ValueError):
        retry_after = None
    cls = _BY_STATUS.get(status_code, APIError)
    return cls(str(message), status_code, code=code, body=body, request_id=request_id, retry_after=retry_after)
