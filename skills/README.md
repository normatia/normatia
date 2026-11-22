# Normatia AI Skills

This folder contains reusable AI skills (system prompts) for the Normatia platform.
Normatia is a building code compliance API for the AECO sector in Spain.

## What Skills Are

Skills are reusable system prompts and instruction sets that give AI assistants
specialized knowledge about Normatia's capabilities, domain language, and workflows.

They help assistants:
- Understand Spanish building regulation context (CTE, RITE, LOE, and related codes)
- Use consistent terminology for AECO compliance tasks
- Query Normatia tools and endpoints in a predictable, production-ready way
- Produce more accurate and actionable responses for compliance analysis

## How To Use These Skills

Use one or more skill files as high-priority instructions in your AI tool.

### Claude Projects

Paste a skill into Project Instructions in your Claude Project.

### ChatGPT

Paste a skill into Custom Instructions or a custom GPT configuration.

### GitHub Copilot

Add a skill as custom instructions in:
- .github/copilot-instructions.md
- VS Code settings for Copilot instructions

### Cursor

Add a skill as rules in:
- .cursorrules
- Project-level Cursor settings

### Other AI Tools

Paste the skill into the system prompt or context window.

## Available Skills

- normatia-building-codes.md
  Expert navigation of Spanish building codes (CTE, RITE, LOE, etc.).
- normatia-compliance.md
  Regulatory compliance verification specialist.
- normatia-location-aware.md
  Location-intelligent building regulation queries.

## MCP Tools And API Usage

These skills reference Normatia MCP tools and workflows.
You can use them with:
- The Normatia MCP server (tool-based integration)
- The Normatia API directly (endpoint-based integration)

This allows the same skill behavior whether your assistant runs through MCP
or calls the API without an MCP layer.

### A project, a municipality or a parcel

Normatia answers within a scope. A project on normatia.com carries its municipality,
its applicable regulations with the edition in force, its uploaded documents, the facts
recorded about the building and any saved calculations. Without a project, `ask` takes a
municipality (`place`) or a cadastral parcel (`parcel`) and uses the regulations
Normatia has for that municipality, from national to municipal.

The skills are written around that: they never ask the user for a city, a climate zone
or which codes apply, because the project, the municipality or the parcel already
answers those. And they never answer about one municipality with another one's
regulations.

### The MCP tools

| Tool | Purpose | Credits |
| --- | --- | --- |
| `find_parcel(lat?, lon?, address?, province?)` | The cadastral parcel at a point, or the parcels of an address. | 0.1 |
| `get_parcel(ref, include?)` | A parcel with its constraints, zoning and buildings. | 1 with constraints or zoning (the default), 0.1 without |
| `get_place(place)` | A municipality with its technical data (climate zone, seismic, snow, wind, rainfall, radon), each with its source. | 0.1 |
| `search_regulations(query?, place?, scope?, curated?)` | The regulation catalog, or the regulations that apply in a municipality. | 0.1 |
| `get_regulation_contents(regulation, version?)` | A regulation's table of contents. | 0.1 |
| `read_regulation_section(regulation, section, version?)` | The text of a section, article by article. | 0.1 |
| `ask(query, project_id? \| place? \| parcel?)` | Regulatory Q&A interpreted by the agentic engine, with cited sources. | 5, nothing if it fails |
| `get_answer(answer_id)` | Collects an `ask` that took longer than 45 seconds. | Free |
| `list_projects()` | The projects the user can query, with their `project_id` and location. | Free |
| `get_project_info(project_id?)` | Project context: location, tech data, regulations with their version, documents, recorded facts, calculations. | Free |
| `get_usage(from_date?, to_date?)` | Calls and credits spent, and the organization's credit balance. | Free |

Tools are paid with the credits of the user's organization, and only when they
succeed. All are read-only except `ask`, which saves its conversation. There is no
compliance-verification tool: to check a value, ask the question with `ask` and compare.

### REST equivalents

| Tool | Endpoint |
| --- | --- |
| `find_parcel` | `GET /v1/parcels` |
| `get_parcel` | `GET /v1/parcels/{ref}` |
| `get_place` | `GET /v1/places/{place}` |
| `search_regulations` | `GET /v1/regulations` |
| `get_regulation_contents` | `GET /v1/regulations/{slug}/contents` |
| `read_regulation_section` | `GET /v1/regulations/{slug}/sections/{section}` |
| `ask` | `POST /api/v2/ask` (a project only; `place` and `parcel` are MCP only) |
| `get_project_info` | `GET /api/v1/project/info` |
| `list_projects` | `GET /api/v1/projects` |
| `get_usage` | `GET /v1/usage` |

`POST /api/v1/ask` and `POST /api/v1/verify` were retired on 21 November 2026 and
answer 410 `endpoint_retired`.

### MCP Server

The simplest setup is the hosted remote server, with no local installation needed:

| Setting | Value |
| --- | --- |
| URL | `https://mcp.normatia.com/mcp/` |
| Transport | Streamable HTTP |
| Auth | OAuth, or `Authorization: Bearer sk-normatia-...` |

The exact config differs per client (`"type": "http"` in VS Code and Claude Code,
`"url"` in Cursor, `"serverUrl"` in Windsurf, `"type": "remote"` in OpenCode, a
custom connector in claude.ai and Claude Desktop). Copy the right one from
[mcp](../mcp) or [docs.normatia.com/mcp](https://docs.normatia.com/mcp/).

## Combining Skills For Complex Workflows

For advanced tasks, combine skills in sequence.

Example:
1. Use normatia-building-codes.md to identify relevant regulations.
2. Use normatia-location-aware.md to apply location-specific context.
3. Use normatia-compliance.md to validate and explain compliance outcomes.

When combining skills, keep instruction priority explicit to avoid conflicts.
Start with the domain skill, then add context and verification skills.
