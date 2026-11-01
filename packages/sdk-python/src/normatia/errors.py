"""Errors raised by the Normatia client.

Branch on ``code`` (for example ``parcel_not_found`` or ``quota_exceeded``), not on the message. The ``/v1`` routes
answer RFC 9457 problems (``{"code": ..., "detail": ...}``); the older ``/api`` routes wrap theirs in
``{"detail": {"error": ..., "message": ...}}``. Both end up in the same fields here.
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
        #: The decoded response body, with any extra fields (``remaining``, ``reset_at``, ``sandbox_url``...).
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
    """403: for example ``api_not_enabled`` or, with a sandbox key, ``not_available_in_sandbox``."""


class NotFoundError(NormatiaError):
    """404: the parcel, place, regulation or project does not exist, or (sandbox) is not in the sandbox."""


class ValidationError(NormatiaError):
    """422 from the API, or a request the client rejects before sending it."""


class RateLimitError(NormatiaError):
    """429: ``rate_limit_exceeded`` (per minute) or ``quota_exceeded`` (the month's credits are used up)."""


class ServiceUnavailableError(NormatiaError):
    """503: the territorial database did not answer in time. Retry after ``retry_after`` seconds."""


class APIError(NormatiaError):
    """Any other error status (500, 502 ``llm_unavailable``, 504...)."""


_BY_STATUS = {
    401: AuthenticationError,
    403: ForbiddenError,
    404: NotFoundError,
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
