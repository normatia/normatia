"""MCP server exposing tools for the Normatia API."""

import json
from typing import Any

from mcp.server.fastmcp import FastMCP

from normatia_mcp.client import api_get, api_post

mcp = FastMCP(
    "normatia",
    instructions=(
        "Normatia is a Spanish building code compliance API. Use these tools to search "
        "construction regulations, look up geographic locations, verify technical compliance, "
        "and ask natural language questions about building codes. Typical workflow: "
        "1) Search for a location to get its geo_id, 2) Use the geo_id to verify compliance "
        "parameters or ask regulatory questions."
    ),
    stateless_http=True,
)


def _as_text(value: Any, default: str = "N/A") -> str:
    """Return a human-readable string for optional scalar values."""
    if value is None:
        return default

    if isinstance(value, str):
        stripped = value.strip()
        return stripped if stripped else default

    return str(value)


def _format_tags(tags: Any) -> str:
    """Format tags as a comma-separated string."""
    if not tags:
        return "none"

    if isinstance(tags, list):
        rendered = [str(tag) for tag in tags if tag is not None and str(tag).strip()]
        return ", ".join(rendered) if rendered else "none"

    return str(tags)


def _is_flat_dict(data: dict[str, Any]) -> bool:
    """Return True when all values are scalar or None."""
    return all(not isinstance(v, (dict, list)) for v in data.values())


def _format_tech_data(tech_data: Any) -> str:
    """Format location technical data with a readable fallback for nested payloads."""
    if not tech_data:
        return "- none"

    if isinstance(tech_data, dict) and _is_flat_dict(tech_data):
        lines: list[str] = []
        for key, value in tech_data.items():
            lines.append(f"- {key}: {_as_text(value)}")
        return "\n".join(lines) if lines else "- none"

    return "\n".join(
        [
            "```json",
            json.dumps(tech_data, indent=2, ensure_ascii=False),
            "```",
        ]
    )


def _format_sources(sources: list[dict[str, Any]] | None) -> list[str]:
    """Format API source objects into readable bullet lines."""
    if not sources:
        return ["- none"]

    lines: list[str] = []
    for src in sources:
        index = _as_text(src.get("index"), default="?")
        code_slug = _as_text(src.get("code_slug"), default="unknown")
        version = _as_text(src.get("version"), default="n/a")
        section = _as_text(src.get("section_title"), default="n/a")
        doc_title = _as_text(src.get("document_title"), default="n/a")
        url = _as_text(src.get("url"), default="n/a")

        lines.append(
            f"- [{index}] {code_slug} (version: {version}) - section: {section} - document: {doc_title} - url: {url}"
        )

    return lines


@mcp.tool()
async def search_locations(
    q: str,
    level: str | None = None,
    ancestor_id: str | None = None,
) -> str:
    """Search for geographic locations (municipalities, provinces, autonomous communities) in Spain.

    Args:
        q: Search query (accent-insensitive). E.g., "Madrid", "Sevilla", "Barcelona"
        level: Filter by geographic level: "municipality", "province", or "autonomous_community"
        ancestor_id: Filter locations within a parent geography (e.g., province ID to find municipalities)
    """
    params: dict[str, Any] = {"q": q}
    if level is not None:
        params["level"] = level
    if ancestor_id is not None:
        params["ancestor_id"] = ancestor_id

    payload = await api_get("/api/v1/location/search", params=params)
    results = payload.get("results") or []

    if not results:
        return f"No locations found for query '{q}'"

    lines = ["## Location Search Results"]
    for item in results:
        name = _as_text(item.get("name"), default="Unknown")
        item_level = _as_text(item.get("level"), default="unknown")
        geo_id = _as_text(item.get("geo_id"), default="unknown")
        lines.append(f"- {name} (level: {item_level}, geo_id: {geo_id})")

    return "\n".join(lines)


@mcp.tool()
async def get_location(geo_id: str) -> str:
    """Get detailed information about a geographic location, including ancestors, technical data (climate zone, etc.), and applicable building codes.

    Args:
        geo_id: The geographic location ID (obtained from search_locations)
    """
    payload = await api_get(f"/api/v1/location/{geo_id}")

    name = _as_text(payload.get("name"), default="Unknown")
    level = _as_text(payload.get("level"), default="unknown")

    ancestors = payload.get("ancestors") or []
    ancestor_names: list[str] = []
    for ancestor in ancestors:
        if isinstance(ancestor, dict):
            ancestor_names.append(_as_text(ancestor.get("name"), default="unknown"))
        else:
            ancestor_names.append(_as_text(ancestor, default="unknown"))

    ancestor_chain = " > ".join(ancestor_names) if ancestor_names else "none"

    applicable_codes = payload.get("applicable_codes") or []
    if applicable_codes:
        code_lines = []
        for code in applicable_codes:
            code_lines.append(
                "- "
                f"{_as_text(code.get('title'), default='Unknown')} "
                f"(slug: {_as_text(code.get('slug'), default='unknown')}, "
                f"scope: {_as_text(code.get('normative_scope'), default='unknown')}, "
                f"reason: {_as_text(code.get('match_reason'), default='unknown')})"
            )
    else:
        code_lines = ["- none"]

    lines = [
        "## Location Detail",
        f"- Name: {name}",
        f"- Level: {level}",
        f"- Geo ID: {_as_text(payload.get('geo_id'), default=geo_id)}",
        "",
        "## Ancestors",
        f"- Chain: {ancestor_chain}",
        "",
        "## Technical Data",
        _format_tech_data(payload.get("tech_data")),
        "",
        "## Applicable Codes",
        *code_lines,
    ]

    return "\n".join(lines)


@mcp.tool()
async def search_codes(
    q: str | None = None,
    normative_scope: str | None = None,
    tag: str | None = None,
    page: int = 1,
    page_size: int = 20,
) -> str:
    """Search building codes and technical regulations.

    Args:
        q: Search query for code title or description
        normative_scope: Filter by scope, e.g. "national", "autonomous", "municipal"
        tag: Filter by tag
        page: Page number (default: 1)
        page_size: Results per page (default: 20, max: 50)
    """
    safe_page = page if page > 0 else 1
    safe_page_size = min(max(page_size, 1), 50)

    params: dict[str, Any] = {"page": safe_page, "page_size": safe_page_size}
    if q is not None:
        params["q"] = q
    if normative_scope is not None:
        params["normative_scope"] = normative_scope
    if tag is not None:
        params["tag"] = tag

    payload = await api_get("/api/v1/codes/search", params=params)

    items = payload.get("items") or []
    total = int(payload.get("total") or 0)
    current_page = int(payload.get("page") or safe_page)
    total_pages = int(payload.get("total_pages") or 0)

    lines = [
        "## Code Search Results",
        f"Page {current_page} of {total_pages} (total: {total})",
    ]

    if not items:
        lines.append("- No results found")
        return "\n".join(lines)

    for item in items:
        lines.append(
            "- "
            f"{_as_text(item.get('slug'), default='unknown')}: "
            f"{_as_text(item.get('title'), default='Untitled')} "
            f"(scope: {_as_text(item.get('normative_scope'), default='unknown')}, "
            f"tags: {_format_tags(item.get('tags'))})"
        )

    return "\n".join(lines)


@mcp.tool()
async def get_code(slug: str) -> str:
    """Get detailed information about a specific building code.

    Args:
        slug: The code slug identifier (e.g., "cte-db-he", obtained from search_codes)
    """
    payload = await api_get(f"/api/v1/codes/{slug}")

    documents = payload.get("documents") or []
    if documents:
        doc_lines = []
        for doc in documents:
            doc_lines.append(
                "- "
                f"{_as_text(doc.get('version'), default='unknown')}: "
                f"{_as_text(doc.get('title'), default='Untitled')} "
                f"(status: {_as_text(doc.get('status'), default='unknown')}, "
                f"published: {_as_text(doc.get('published_date'))}, "
                f"effective: {_as_text(doc.get('effective_date'))})"
            )
    else:
        doc_lines = ["- none"]

    lines = [
        "## Code Detail",
        f"- Slug: {_as_text(payload.get('slug'), default=slug)}",
        f"- Title: {_as_text(payload.get('title'), default='Untitled')}",
        f"- Short Title: {_as_text(payload.get('short_title'))}",
        f"- Normative Scope: {_as_text(payload.get('normative_scope'), default='unknown')}",
        f"- Description: {_as_text(payload.get('description'))}",
        f"- Tags: {_format_tags(payload.get('tags'))}",
        f"- Country Code: {_as_text(payload.get('country_code'), default='es')}",
        "",
        "## Document Versions",
        *doc_lines,
    ]

    return "\n".join(lines)


@mcp.tool()
async def get_code_latest(slug: str) -> str:
    """Get the latest/active versions of a building code.

    Args:
        slug: The code slug identifier
    """
    payload = await api_get(f"/api/v1/codes/{slug}/latest")

    if isinstance(payload, list):
        versions = payload
    elif isinstance(payload, dict):
        items = payload.get("items")
        versions = items if isinstance(items, list) else [payload]
    else:
        versions = []

    if not versions:
        return f"No results found for latest versions of code '{slug}'"

    lines = ["## Latest Code Versions", f"- Code: {slug}"]
    for version_item in versions:
        lines.append(
            "- "
            f"{_as_text(version_item.get('version'), default='unknown')}: "
            f"{_as_text(version_item.get('title'), default='Untitled')} "
            f"(status: {_as_text(version_item.get('status'), default='unknown')}, "
            f"published: {_as_text(version_item.get('published_date'))}, "
            f"effective: {_as_text(version_item.get('effective_date'))})"
        )

    return "\n".join(lines)


@mcp.tool()
async def get_code_version(slug: str, version: str) -> str:
    """Get detailed information about a specific version of a building code, including its section index.

    Args:
        slug: The code slug identifier
        version: The version identifier (e.g., "2022", obtained from get_code_latest)
    """
    payload = await api_get(f"/api/v1/codes/{slug}/{version}")

    sections = payload.get("sections") or []
    if sections:
        section_lines = []
        for section in sections:
            section_lines.append(
                "- "
                f"[{_as_text(section.get('order'), default='?')}] "
                f"{_as_text(section.get('title'), default='Untitled')} "
                f"(slug: {_as_text(section.get('slug'), default='unknown')})"
            )
    else:
        section_lines = ["- none"]

    lines = [
        "## Code Version Detail",
        f"- Code: {_as_text(payload.get('slug'), default=slug)}",
        f"- Version: {_as_text(payload.get('version'), default=version)}",
        f"- Title: {_as_text(payload.get('title'), default='Untitled')}",
        f"- Status: {_as_text(payload.get('status'), default='unknown')}",
        f"- Published Date: {_as_text(payload.get('published_date'))}",
        f"- Effective Date: {_as_text(payload.get('effective_date'))}",
        f"- Description: {_as_text(payload.get('description'))}",
        f"- Author: {_as_text(payload.get('author'))}",
        f"- Source URL: {_as_text(payload.get('source_url'))}",
        "",
        "## Sections",
        *section_lines,
    ]

    return "\n".join(lines)


@mcp.tool()
async def verify_compliance(
    element: str,
    parameter: str,
    value: float,
    unit: str,
    geo_id: str,
    codes: list[dict] | None = None,
    context: str | None = None,
) -> str:
    """Verify if a building element's technical parameter complies with applicable regulations.

    Args:
        element: Building element type (e.g., "muro exterior", "cubierta", "ventana")
        parameter: Technical parameter to check (e.g., "transmitancia_termica", "resistencia_al_fuego")
        value: Numeric value to verify
        unit: Unit of measurement (e.g., "W/m2K", "min")
        geo_id: Geographic location ID (determines which regulations apply)
        codes: Optional filter to check against specific codes. List of dicts with "slug" and optional "version", e.g. [{"slug": "cte-db-he", "version": "2022"}]
        context: Optional additional context about the building (e.g., "edificio residencial de 5 plantas")
    """
    body: dict[str, Any] = {
        "element": element,
        "parameter": parameter,
        "value": value,
        "unit": unit,
        "geo_id": geo_id,
    }
    if codes is not None:
        body["codes"] = codes
    if context is not None:
        body["context"] = context

    payload = await api_post("/api/v1/verify", body=body)

    raw_status = _as_text(payload.get("result_status"), default="undetermined").lower()
    status_map = {
        "compliant": "COMPLIANT",
        "non_compliant": "NON-COMPLIANT",
        "undetermined": "INDETERMINATE",
        "conditional": "INDETERMINATE",
    }
    compliance_status = status_map.get(raw_status, "INDETERMINATE")

    provided_value = _as_text(payload.get("provided_value"), default=str(value))
    limit_value = _as_text(payload.get("limit_value"), default="not specified")
    result_unit = _as_text(payload.get("unit"), default=unit)

    condition_items = payload.get("conditions") or []
    condition_lines = [f"- {item}" for item in condition_items] if condition_items else ["- none"]

    warning_items = payload.get("warnings") or []
    warning_lines = [f"- {item}" for item in warning_items] if warning_items else ["- none"]

    geo_context = payload.get("geo_context") or {}
    geo_lines = [
        f"- Geo ID: {_as_text(geo_context.get('geo_id'), default=geo_id)}",
        f"- Name: {_as_text(geo_context.get('name'))}",
        f"- Climate Zone: {_as_text(geo_context.get('climate_zone'))}",
    ]

    lines = [
        "## Compliance Verification",
        f"- Compliance Status: {compliance_status}",
        "",
        "## Check Summary",
        f"- Element: {_as_text(payload.get('element'), default=element)}",
        f"- Parameter: {_as_text(payload.get('parameter'), default=parameter)}",
        f"- Provided vs Limit: {provided_value} vs {limit_value} {result_unit}",
        "",
        "## Conditions",
        *condition_lines,
        "",
        "## Sources",
        *_format_sources(payload.get("sources") or []),
        "",
        "## Warnings",
        *warning_lines,
        "",
        "## Geographic Context",
        *geo_lines,
    ]

    return "\n".join(lines)


@mcp.tool()
async def ask(
    query: str,
    geo_id: str | None = None,
    codes: list[dict] | None = None,
) -> str:
    """Ask a natural language question about Spanish building regulations. Best for open-ended questions about requirements, procedures, definitions, or code interpretation.

    Args:
        query: Your question in natural language (Spanish or English)
        geo_id: Optional geographic location ID for location-specific answers
        codes: Optional filter to search in specific codes. List of dicts with "slug" and optional "version"
    """
    body: dict[str, Any] = {"query": query}
    if geo_id is not None:
        body["geo_id"] = geo_id
    if codes is not None:
        body["codes"] = codes

    payload = await api_post("/api/v1/ask", body=body)

    answer = _as_text(payload.get("answer"), default="No answer returned.")
    sources = payload.get("sources") or []
    geo_context = payload.get("geo_context")

    lines = [
        "## Answer",
        answer,
        "",
        "## Sources",
        *_format_sources(sources),
    ]

    if geo_context:
        lines.extend(
            [
                "",
                "## Geographic Context",
                f"- Geo ID: {_as_text(geo_context.get('geo_id'))}",
                f"- Name: {_as_text(geo_context.get('name'))}",
                f"- Climate Zone: {_as_text(geo_context.get('climate_zone'))}",
            ]
        )

    return "\n".join(lines)