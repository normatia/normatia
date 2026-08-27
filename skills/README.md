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

### Everything is scoped to a project

Normatia's regulatory scope is defined per project. A project on normatia.com carries
its municipality, its applicable regulations with the edition in force, its uploaded
documents, the facts recorded about the building and any saved calculations.

The skills are written around that: they never ask the user for a city, a climate zone
or which codes apply, because the project already answers those. And they never answer
about a municipality where the user has no project.

### The three MCP tools

| Tool | Purpose | Cost |
| --- | --- | --- |
| `ask(query, project_id?)` | Regulatory Q&A over a project. The only tool that returns citable regulatory text. | 1 credit |
| `get_project_info(project_id?)` | Project context: location, tech data, regulations with their version, documents, recorded facts, calculations. | Free |
| `list_projects()` | The projects the user can query, with their `project_id` and location. | Free |

All three are read-only. There is no `search_locations`, `search_codes` or
`verify_compliance` on the MCP server: the geography and code catalog endpoints, and
deterministic verification, live on the REST API only.

### REST equivalents

| Tool | Endpoint |
| --- | --- |
| `ask` | `POST /api/v2/ask` |
| `get_project_info` | `GET /api/v1/project/info` |
| `list_projects` | `GET /api/v1/projects` |

`POST /api/v1/ask` is frozen and superseded by `/api/v2/ask`.

### MCP Server

The simplest setup is the hosted remote server — no local installation needed:

```json
{
  "mcpServers": {
    "normatia": {
      "type": "streamable-http",
      "url": "https://mcp.normatia.com/mcp",
      "headers": {
        "Authorization": "Bearer sk-normatia-..."
      }
    }
  }
}
```

## Combining Skills For Complex Workflows

For advanced tasks, combine skills in sequence.

Example:
1. Use normatia-building-codes.md to identify relevant regulations.
2. Use normatia-location-aware.md to apply location-specific context.
3. Use normatia-compliance.md to validate and explain compliance outcomes.

When combining skills, keep instruction priority explicit to avoid conflicts.
Start with the domain skill, then add context and verification skills.
