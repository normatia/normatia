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

The Normatia MCP server exposes 3 tools, all **read-only** — nothing in the MCP surface writes to your projects:

| Tool                            | Description                                                                                                                        | Cost     |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | -------- |
| `ask(query, project_id?)`       | Ask a natural-language question about the regulations that apply to a project. The only tool that returns citable regulatory text.  | 1 credit |
| `get_project_info(project_id?)` | Full project context: location, territory tech data, applicable regulations with their current edition, files, memory, calculations. | Free     |
| `list_projects()`               | Projects the user can query, with their `project_id`, location and which one is active.                                            | Free     |

### Everything is scoped to a project

Normatia's regulatory scope is defined **per project** — each project on normatia.com carries its municipality, its applicable regulations, its uploaded documents, the recorded facts about the building and any saved calculations.

So the assistant never has to ask for the city, the climate zone or which edition of the CTE applies: `ask` returns values already resolved for that project. And if the user asks about a municipality where they have no project, the server says so and points at creating one — municipal ordinances differ completely between town councils, so there is no generic answer.

### `ask` is agentic

`ask` runs the **same agent loop as the chat on normatia.com**, not a single-shot search. The model decides what to look up, chains several searches, reads the project's memory and saved calculations, consults uploaded documents and cites every source with validated `[N]` markers.

Because the call is synchronous it runs on shorter budgets than the web chat: up to **6 reasoning rounds, 6 searches and 120 seconds**. If your MCP client lets you configure the tool-call timeout, set it to **150 seconds or more**.

### Working across projects

Every tool takes an optional `project_id`, resolved as:

```
explicit project_id  →  the user's active project
```

To ask about a different project or municipality, call `list_projects()`, take the matching `project_id` and pass it to `ask`. **Never ask the user to switch their active project on the website** — several projects can be queried in the same conversation, in parallel, and what the user sees on normatia.com never changes underneath them.

### Typical Workflows

**Active project** — just `ask("...")`. Call `get_project_info()` only when you need the location, the current editions or what is already saved.

**Comparing municipalities** — `list_projects()` → `ask("...", project_id=A)` and `ask("...", project_id=B)` → contrast the answers.

---

## Documentation

Full MCP integration guide: **[docs.normatia.com/mcp](https://docs.normatia.com/mcp)**
