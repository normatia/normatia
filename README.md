# Normatia Devtools

Open-source developer toolkit for Spanish building code compliance.

[![npm version](https://img.shields.io/npm/v/normatia?label=npm%20normatia)](https://www.npmjs.com/package/normatia)
[![PyPI version](https://img.shields.io/pypi/v/normatia-mcp?label=PyPI%20normatia-mcp)](https://pypi.org/project/normatia-mcp/)
[![License: MIT](https://img.shields.io/github/license/normatia/normatia)](LICENSE)
[![GitHub stars](https://img.shields.io/github/stars/normatia/normatia?style=social)](https://github.com/normatia/normatia)

Main site: [normatia.com](https://normatia.com)  
API docs: [docs.normatia.com](https://docs.normatia.com)  
API base: [api.normatia.com](https://api.normatia.com)

## What is Normatia?

Normatia is a building code compliance platform for Spain's AECO sector. This repository is the open-source developer toolkit for integrating with Normatia services, not the full end-user platform.

It includes official SDKs, an MCP server for AI assistants, API usage examples, and reusable AI skills/system prompts.

## Packages

| Package | Type | Install | README |
| --- | --- | --- | --- |
| `normatia` | TypeScript SDK | `npm install normatia` | [packages/sdk-typescript/README.md](packages/sdk-typescript/README.md) |
| `normatia-mcp` | MCP Server | `pip install normatia-mcp` or `uvx normatia-mcp` | [packages/mcp-server/README.md](packages/mcp-server/README.md) |

## Quick Start

### 1) Get an API key

Create an account and generate an API key at [normatia.com/api](https://normatia.com/api).

### 2) MCP Server (AI assistants)

**Remote server (recommended)** - no install needed:

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

**Local package** (alternative):

```json
{
	"mcpServers": {
		"normatia": {
			"command": "uvx",
			"args": ["normatia-mcp"],
			"env": {
				"NORMATIA_API_KEY": "sk-normatia-..."
			}
		}
	}
}
```

See [packages/mcp-server/README.md](packages/mcp-server/README.md) for full setup instructions.

### 3) TypeScript SDK

```typescript
import { NormatiaClient } from 'normatia';

const client = new NormatiaClient({ apiKey: 'sk-normatia-...' });
const location = await client.getLocation('ES-41091');
console.log(location.tech_data.climate_zone); // "B4"
```

### 4) cURL

```bash
curl https://api.normatia.com/api/v1/location/ES-41091 \
	-H "Authorization: Bearer sk-normatia-..."
```

## Examples

| Directory | Description |
| --- | --- |
| [examples/curl](examples/curl) | cURL examples for all main API endpoints |
| [examples/python](examples/python) | Python examples using `httpx` |
| [examples/typescript](examples/typescript) | TypeScript examples using native `fetch` |

## AI Skills

The [skills](skills) directory contains reusable prompts and instructions for AI agents working with Normatia workflows, including code search, location-aware retrieval, and compliance-focused tasks.

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

Full API and integration documentation is available at [docs.normatia.com](https://docs.normatia.com).

## Contributing

Contributions are welcome. Please read [CONTRIBUTING.md](CONTRIBUTING.md) before opening an issue or pull request.

## License

MIT - see [LICENSE](LICENSE).

