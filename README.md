[🇬🇧 English](./README.md) | [🇪🇸 Español](./README.es.md)

# Normatia

Open-source developer toolkit for Spanish building code compliance.

[![npm version](https://img.shields.io/npm/v/normatia?label=npm%20normatia)](https://www.npmjs.com/package/normatia)
[![License: MIT](https://img.shields.io/github/license/normatia/normatia)](LICENSE)
[![GitHub stars](https://img.shields.io/github/stars/normatia/normatia?style=social)](https://github.com/normatia/normatia)

Main site: [normatia.com](https://normatia.com)
API docs: [docs.normatia.com](https://docs.normatia.com)
API base: [api.normatia.com](https://api.normatia.com)

## What is Normatia?

Normatia is a building code compliance platform for Spain's AECO sector (architecture, engineering, construction, and operations). This repository contains the open-source developer toolkit: an MCP server for AI assistants, a TypeScript SDK, API usage examples, and reusable AI skills.

## MCP Server

Normatia provides a remote MCP server that gives AI assistants the Normatia API, with no installation required:
cadastral parcels with their constraints and zoning, municipalities with their technical data, the text of Spanish
building regulations, and an agentic engine that interprets them with cited sources.

```
https://mcp.normatia.com/mcp/
```

### Available Tools

Data first: free, deterministic, and the same JSON as the REST API (`structuredContent` with an `outputSchema`).

| Tool | Description | Cost |
| --- | --- | --- |
| `find_parcel`, `get_parcel` | A parcel at a point or by its cadastral reference, with constraints, zoning, buildings, units, geometry | Free |
| `get_place` | A municipality with its technical data, each with the regulation it comes from | Free |
| `search_regulations`, `get_regulation_contents`, `read_regulation_section` | The regulation catalog, a regulation's contents and the text of each section | Free |
| `ask` | A question interpreted by the engine, about a project, a municipality (`place`) or a parcel (`parcel`) | 1 query |
| `get_answer` | Collects an `ask` that took longer than 45 seconds | Free |
| `list_projects`, `get_project_info`, `get_usage` | The user's projects and the organization's usage | Free |

`ask` runs the **same agent loop as the chat on normatia.com** and cites every source with validated `[N]` markers.
It waits at most 45 seconds; if the engine has not finished it returns an `id` that `get_answer` collects, so no
client times out. All tools are read-only except `ask`, which saves its conversation. Full guide:
[docs.normatia.com/mcp](https://docs.normatia.com/mcp/) and [mcp/README.md](./mcp/README.md).

### Setup

| Setting | Value |
| --- | --- |
| URL | `https://mcp.normatia.com/mcp/` |
| Transport | Streamable HTTP (`http` in most client configs) |
| Auth | OAuth, or an API key as `Authorization: Bearer sk-normatia-...` |

API and MCP access are turned on per organization, each on its own: write to hola@normatia.com to get them. With OAuth, the client sends you to sign in to Normatia and gets access for you. For clients without OAuth, create a key on normatia.com in [your account](https://normatia.com/es/area-usuario/cuenta) (section "Claves API").

#### Claude (claude.ai and Claude Desktop)

Remote servers are added as a **custom connector** from your Claude account, not in `claude_desktop_config.json` (that file is for local servers only). A connector added on claude.ai also shows up in Claude Desktop.

1. Go to [Customize > Connectors](https://claude.ai/customize/connectors)
2. Click **+ Add**, then **Add custom connector**
3. Enter a name and the server URL: `https://mcp.normatia.com/mcp/`
4. Choose OAuth sign-in (if asked for the OAuth client, pick **Register automatically**), or no sign-in plus an `Authorization: Bearer sk-normatia-...` request header
5. Click **Add** and sign in to Normatia

On Team and Enterprise plans, an owner adds it from [Organization settings > Connectors](https://claude.ai/admin-settings/connectors) (**Add**, **Custom**, **Web**) and members then connect it from Customize > Connectors.

#### ChatGPT

1. Enable developer mode: Settings > Apps > Advanced settings > **Developer mode**
2. Click **Create app**
3. Enter the server URL `https://mcp.normatia.com/mcp/` and choose `OAuth` as authentication
4. Click **Create** and sign in to Normatia

#### Claude Code

```bash
# OAuth: then run /mcp inside Claude Code and sign in
claude mcp add --transport http normatia https://mcp.normatia.com/mcp/

# Or with an API key
claude mcp add --transport http normatia https://mcp.normatia.com/mcp/ \
  --header "Authorization: Bearer sk-normatia-..."
```

#### VS Code / GitHub Copilot

Add to `.vscode/mcp.json` in your workspace (or to your user configuration, with the **MCP: Open User Configuration** command). VS Code opens the Normatia sign-in the first time the server starts:

```json
{
  "servers": {
    "normatia": {
      "type": "http",
      "url": "https://mcp.normatia.com/mcp/"
    }
  }
}
```

To use an API key instead, see [mcp/vscode.json](mcp/vscode.json): VS Code asks for the key and stores it encrypted, outside the file.

#### Cursor

Add to `~/.cursor/mcp.json` (or `.cursor/mcp.json` in a project):

```json
{
  "mcpServers": {
    "normatia": {
      "url": "https://mcp.normatia.com/mcp/",
      "headers": {
        "Authorization": "Bearer sk-normatia-..."
      }
    }
  }
}
```

#### Windsurf

Add to `~/.codeium/windsurf/mcp_config.json`:

```json
{
  "mcpServers": {
    "normatia": {
      "serverUrl": "https://mcp.normatia.com/mcp/",
      "headers": {
        "Authorization": "Bearer sk-normatia-..."
      }
    }
  }
}
```

#### OpenCode

Add to `~/.config/opencode/opencode.json` (or `opencode.json` in a project). Without `headers`, OpenCode signs in with OAuth:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "normatia": {
      "type": "remote",
      "url": "https://mcp.normatia.com/mcp/",
      "enabled": true,
      "headers": {
        "Authorization": "Bearer sk-normatia-..."
      }
    }
  }
}
```

#### Zed

Add to Zed's `settings.json`:

```json
{
  "context_servers": {
    "normatia": {
      "url": "https://mcp.normatia.com/mcp/",
      "headers": {
        "Authorization": "Bearer sk-normatia-..."
      }
    }
  }
}
```

Ready-to-copy files and an interactive installer are in [mcp](mcp). Full guide: [docs.normatia.com/mcp](https://docs.normatia.com/mcp/).

### Example Prompts

Once connected, try these prompts in your AI assistant:

- "Which regulations are active on my project, and which edition of each?"
- "What is the maximum window U-value I can use on my project?"
- "Review the attached carpentry schedule and tell me whether the values comply"
- "What minimum clear height does the municipal ordinance require on the Sevilla project?"
- "Compare the accessibility requirements of my Madrid project against the Bilbao one"
- "What does the code say about garage ventilation, given the calculations I already saved?"

## TypeScript SDK

```bash
npm install normatia
```

```typescript
import { NormatiaClient } from 'normatia';

const client = new NormatiaClient({ apiKey: 'sk-normatia-...' });
const location = await client.getLocation('ES-41091'); // Sevilla
console.log(location.tech_data?.climate_zone); // "B4"
```

See [packages/sdk-typescript/README.md](packages/sdk-typescript/README.md) for full documentation.

## Examples

| Directory | Description |
| --- | --- |
| [examples/curl](examples/curl) | cURL examples for all main API endpoints |
| [examples/python](examples/python) | Python examples using `httpx` |
| [examples/typescript](examples/typescript) | TypeScript examples using native `fetch` |

## AI Skills

The [skills](skills) directory contains reusable system prompts for AI agents working with Normatia:

- **Building Codes**: expert navigation of Spanish regulations (CTE, RITE, LOE)
- **Compliance**: structured compliance verification workflows
- **Location-Aware**: geography-contextual regulatory guidance

## API Overview

| Endpoint | Method | Description |
| --- | --- | --- |
| `/api/v1/location/search` | GET | Search locations by name |
| `/api/v1/location/{geo_id}` | GET | Location detail: ancestors, tech data and applicable codes |
| `/api/v1/codes/search` | GET | Search the regulation catalog |
| `/api/v1/codes/{slug}` | GET | Regulation detail with all its versions |
| `/api/v1/codes/{slug}/latest` | GET | Versions in force |
| `/api/v1/codes/{slug}/{version}` | GET | One version with its section index (titles, no text) |
| `/api/v1/projects` | GET | List the projects the user can query |
| `/api/v1/project/info` | GET | Full context of a project |
| `/api/v2/ask` | POST | Agentic regulatory Q&A over a project (1 credit) |
| `/api/v1/verify` | POST | Check a parameter on the active project's location (1 credit) |

Every call needs `Authorization: Bearer sk-normatia-...`. Errors come as `{"detail": {"error": "<code>", "message": "..."}}`; the codes, limits and quota are described in [docs.normatia.com/api-reference/authentication](https://docs.normatia.com/api-reference/authentication/).

`POST /api/v1/ask` (the old single-shot RAG endpoint) is frozen and hidden from the public schema. It still works for existing integrations, but new ones should use `/api/v2/ask`.

## Documentation

Full API reference and integration guides at [docs.normatia.com](https://docs.normatia.com).

## Contributing

Contributions are welcome. Please read [CONTRIBUTING.md](CONTRIBUTING.md) before opening an issue or pull request.

## License

MIT, see [LICENSE](LICENSE).

