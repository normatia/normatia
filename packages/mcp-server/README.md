# Normatia MCP Server

Normatia MCP Server is a standalone Model Context Protocol (MCP) server for the Normatia API.
It lets AI clients (Claude Desktop, VS Code Copilot, Cursor, Windsurf, and others) call Normatia's Spanish building code compliance endpoints through MCP tools over stdio.

The server is a thin translation layer:

- Client <-> MCP (stdio)
- MCP <-> Normatia API (HTTP + Bearer token)

## Quick Start (no install)

Use `uvx` to run directly without installing globally:

```bash
NORMATIA_API_KEY=sk-normatia-xxxxx uvx normatia-mcp
```

On Windows PowerShell:

```powershell
$env:NORMATIA_API_KEY="sk-normatia-xxxxx"
uvx normatia-mcp
```

## Installation

```bash
pip install normatia-mcp
```

Then run:

```bash
NORMATIA_API_KEY=sk-normatia-xxxxx normatia-mcp
```

You can also run it as a Python module:

```bash
python -m normatia_mcp
```

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `NORMATIA_API_KEY` | Yes | - | API key in the format `sk-normatia-xxxxx` |
| `NORMATIA_API_BASE_URL` | No | `https://api.normatia.com` | Base URL for the Normatia REST API |

Authentication header used by this MCP server:

```http
Authorization: Bearer sk-normatia-xxxxx
```

## Client Configuration

### Claude Desktop

Update your Claude Desktop MCP config file:

- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\\Claude\\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "normatia": {
      "command": "uvx",
      "args": ["normatia-mcp"],
      "env": {
        "NORMATIA_API_KEY": "sk-normatia-your-key-here",
        "NORMATIA_API_BASE_URL": "https://api.normatia.com"
      }
    }
  }
}
```

### VS Code Copilot

Create or update `.vscode/mcp.json` in your workspace:

```json
{
  "servers": {
    "normatia": {
      "type": "stdio",
      "command": "uvx",
      "args": ["normatia-mcp"],
      "env": {
        "NORMATIA_API_KEY": "sk-normatia-your-key-here",
        "NORMATIA_API_BASE_URL": "https://api.normatia.com"
      }
    }
  }
}
```

### Cursor

In Cursor MCP settings (or `~/.cursor/mcp.json`), add:

```json
{
  "mcpServers": {
    "normatia": {
      "command": "uvx",
      "args": ["normatia-mcp"],
      "env": {
        "NORMATIA_API_KEY": "sk-normatia-your-key-here",
        "NORMATIA_API_BASE_URL": "https://api.normatia.com"
      }
    }
  }
}
```

### Windsurf

In Windsurf MCP settings (typically under `~/.codeium/windsurf/`), add:

```json
{
  "mcpServers": {
    "normatia": {
      "command": "uvx",
      "args": ["normatia-mcp"],
      "env": {
        "NORMATIA_API_KEY": "sk-normatia-your-key-here",
        "NORMATIA_API_BASE_URL": "https://api.normatia.com"
      }
    }
  }
}
```

## Available Tools

| Tool | Description | Key Parameters |
|---|---|---|
| `search_locations` | Search Spanish geographic locations | `q`, `level?`, `ancestor_id?` |
| `get_location` | Get detailed location data, ancestors, technical context, and applicable codes | `geo_id` |
| `search_codes` | Search building codes and regulations | `q?`, `normative_scope?`, `tag?`, `page?`, `page_size?` |
| `get_code` | Get building code detail and document versions | `slug` |
| `get_code_latest` | Get latest/active versions for a code | `slug` |
| `get_code_version` | Get detailed information for one code version, including section index | `slug`, `version` |
| `verify_compliance` | Verify whether a technical value complies with regulations | `element`, `parameter`, `value`, `unit`, `geo_id`, `codes?`, `context?` |
| `ask` | Ask natural-language questions about Spanish building regulations | `query`, `geo_id?`, `codes?` |

## Example Prompts

- Search for municipalities named "Sevilla".
- Get details for geo ID `ES-AN-SEV-41091`.
- Search national codes tagged with energy efficiency.
- Show the latest version of `cte-db-he`.
- Verify if a wall with U-value 0.35 W/m2K is compliant in Madrid.
- Ask: "What are the fire resistance requirements for residential structure elements?"

## Architecture (text diagram)

```text
AI Client (Claude / Copilot / Cursor / Windsurf)
                |
                |  MCP over stdio
                v
        normatia-mcp (this package)
                |
                |  HTTPS + Bearer API key
                v
   Normatia REST API (location, codes, verify, ask)
```

## Links

- Main site: https://normatia.com
- API docs: https://api.normatia.com/docs
- Repository: https://github.com/normatia/normatia
- Issues: https://github.com/normatia/normatia/issues