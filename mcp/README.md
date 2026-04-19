# MCP Server Configuration

Ready-to-use configuration files for connecting the **Normatia MCP server** to your AI editor.

The Normatia MCP server is a remote server using **Streamable HTTP** transport — no local process or Docker required.

| Property   | Value                              |
| ---------- | ---------------------------------- |
| URL        | `https://mcp.normatia.com/mcp`     |
| Transport  | Streamable HTTP                    |
| Auth       | Bearer token (`sk-normatia-...`)   |

> Get your API key at [normatia.com](https://normatia.com).

---

## Quick Setup (Automated)

Run the interactive installer:

```bash
bash <(curl -fsSL https://raw.githubusercontent.com/normatia/normatia/main/mcp/install.sh)
```

Or clone this repo and run locally:

```bash
./mcp/install.sh
```

---

## Manual Setup

Copy the config for your editor and replace `sk-normatia-YOUR_API_KEY` with your actual key.

### Claude Code

**File:** `~/.claude.json` or run the CLI command

```bash
claude mcp add normatia --transport streamable-http https://mcp.normatia.com/mcp \
  -h "Authorization: Bearer sk-normatia-YOUR_API_KEY"
```

Or copy [`claude-code.json`](./claude-code.json) to your config.

### Cursor

**File:** `~/.cursor/mcp.json`

Copy [`cursor.json`](./cursor.json) contents into your config file.

### VS Code / GitHub Copilot

**File:** `.vscode/mcp.json` (per-project)

Copy [`vscode.json`](./vscode.json) into your project's `.vscode/` directory.

### Windsurf

**File:** `~/.codeium/windsurf/mcp_config.json`

Same format as Cursor — uses the `mcpServers` key.

### OpenCode

**File:** `~/.config/opencode/config.json`

Copy [`opencode.json`](./opencode.json) contents into your config file.

---

## Available Tools

The Normatia MCP server exposes 8 tools for Spanish building code compliance:

| Tool                 | Description                                                                            |
| -------------------- | -------------------------------------------------------------------------------------- |
| `search_locations`   | Search geographic locations (municipalities, provinces, autonomous communities)         |
| `get_location`       | Get location details including climate zone, ancestors, and applicable codes            |
| `search_codes`       | Search building codes and technical regulations                                        |
| `get_code`           | Get detailed info about a specific building code                                       |
| `get_code_latest`    | Get the latest/active versions of a building code                                      |
| `get_code_version`   | Get a specific version of a code, including its section index                          |
| `verify_compliance`  | Verify if a building parameter complies with regulations for a location                |
| `ask`                | Ask natural language questions about building regulations                              |

### Typical Workflow

1. **Search for a location** → `search_locations("Madrid")` → get the `geo_id`
2. **Check what codes apply** → `get_location(geo_id)` → see applicable codes
3. **Verify compliance** → `verify_compliance(element, parameter, value, unit, geo_id)`
4. **Ask questions** → `ask("¿Cuál es la transmitancia máxima para muros?", geo_id)`

---

## Documentation

Full MCP integration guide: **[docs.normatia.com/mcp](https://docs.normatia.com/mcp)**
