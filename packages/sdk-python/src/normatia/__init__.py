"""Normatia: Spanish parcels, constraints, planning and regulations as data.

    from normatia import Normatia

    client = Normatia()  # reads NORMATIA_API_KEY
    parcel = client.get_parcel("6963301TG3466N", include=["constraints", "zoning"])

Docs: https://docs.normatia.com
"""
from ._client import AsyncNormatia, Normatia, __version__
from .errors import (
    APIError,
    AuthenticationError,
    ForbiddenError,
    NormatiaError,
    NotFoundError,
    RateLimitError,
    ServiceUnavailableError,
    ValidationError,
)

__all__ = [
    "APIError",
    "AsyncNormatia",
    "AuthenticationError",
    "ForbiddenError",
    "Normatia",
    "NormatiaError",
    "NotFoundError",
    "RateLimitError",
    "ServiceUnavailableError",
    "ValidationError",
    "__version__",
]
