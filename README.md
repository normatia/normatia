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

Normatia provides a remote MCP server that gives AI assistants access to Spanish building code data, location intelligence, compliance verification, and regulatory Q&A — no installation required.

```
https://mcp.normatia.com/mcp
```

### Available Tools

| Tool | Description |
| --- | --- |
| `search_locations` | Search Spanish geographic locations (municipalities, provinces, autonomous communities) |
| `search_codes` | Search building codes and regulations by topic, scope, or tag |
| `verify_compliance` | Verify if a technical value complies with regulations for a location |
| `ask` | Ask natural-language questions about Spanish building regulations |

### Setup

#### Prerequisites

Get an API key at [normatia.com/es/api](https://normatia.com/es/api). Keys use the format `sk-normatia-...`.

#### Claude Desktop

Add to your config (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS, `%APPDATA%\Claude\claude_desktop_config.json` on Windows):

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

#### Claude Code

```bash
claude mcp add normatia --transport streamable-http https://mcp.normatia.com/mcp \
	-h "Authorization: Bearer sk-normatia-..."
```

#### VS Code / GitHub Copilot

Add to `.vscode/mcp.json` in your workspace:

```json
{
	"servers": {
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

Or add to your User Settings (JSON) for global access:

```json
{
	"mcp": {
		"servers": {
			"normatia": {
				"type": "streamable-http",
				"url": "https://mcp.normatia.com/mcp",
				"headers": {
					"Authorization": "Bearer sk-normatia-..."
				}
			}
		}
	}
}
```

#### Cursor

Add to Cursor MCP settings (`~/.cursor/mcp.json`):

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

#### Windsurf

Add to Windsurf MCP settings:

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

#### Zed

Add to Zed settings (`~/.config/zed/settings.json`):

```json
{
	"context_servers": {
		"normatia": {
			"transport": "streamable-http",
			"url": "https://mcp.normatia.com/mcp",
			"headers": {
				"Authorization": "Bearer sk-normatia-..."
			}
		}
	}
}
```

#### Any MCP Client

Use these connection details with any MCP-compatible client:

| Setting | Value |
| --- | --- |
| Transport | `streamable-http` |
| URL | `https://mcp.normatia.com/mcp` |
| Auth header | `Authorization: Bearer sk-normatia-...` |

For full setup instructions for 30+ MCP clients, see [docs.normatia.com/mcp](https://docs.normatia.com/mcp).

### Example Prompts

Once connected, try these prompts in your AI assistant:

- "Search for municipalities named Sevilla"
- "What climate zone is Madrid in?"
- "What are the fire resistance requirements for residential structures?"
- "Verify if a wall with U-value 0.35 W/m²K is compliant in Sevilla"
- "Show me the latest version of the CTE DB-HE"

## TypeScript SDK

```bash
npm install normatia
```

```typescript
import { NormatiaClient } from 'normatia';

const client = new NormatiaClient({ apiKey: 'sk-normatia-...' });
const location = await client.getLocation('ES-41091');
console.log(location.tech_data.climate_zone); // "B4"
```

See [packages/sdk-typescript/README.md](packages/sdk-typescript/README.md) for full documentation.

## Examples

| Directory | Description |
| --- | --- |
| [examples/curl](examples/curl) | cURL examples for all main API endpoints |
| [examples/python](examples/python) | Python examples using `httpx` |
| [examples/typescript](examples/typescript) | TypeScript examples using the SDK |

## AI Skills

The [skills](skills) directory contains reusable system prompts for AI agents working with Normatia:

- **Building Codes** — Expert navigation of Spanish regulations (CTE, RITE, LOE)
- **Compliance** — Structured compliance verification workflows
- **Location-Aware** — Geography-contextual regulatory guidance

## API Overview

| Endpoint | Method | Description |
| --- | --- | --- |
| `/api/v1/location/search` | GET | Search geographic locations |
| `/api/v1/location/{geo_id}` | GET | Get location detail + climate data |
| `/api/v1/codes/search` | GET | Search building codes |
| `/api/v1/codes/{slug}` | GET | Get code detail |
| `/api/v1/codes/{slug}/versions` | GET | List code versions |
| `/api/v1/codes/{slug}/versions/{version}` | GET | Get version detail + sections |
| `/api/v1/ask` | POST | AI-powered regulatory Q&A |
| `/api/v1/verify` | POST | Compliance verification |

## Documentation

Full API reference and integration guides at [docs.normatia.com](https://docs.normatia.com).

## Contributing

Contributions are welcome. Please read [CONTRIBUTING.md](CONTRIBUTING.md) before opening an issue or pull request.

## License

MIT — see [LICENSE](LICENSE).

