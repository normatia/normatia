# MCP Server Configuration

Ready-to-use configuration files for connecting the **Normatia MCP server** to your AI editor.

The Normatia MCP server is a remote server using **Streamable HTTP** transport: no local process or Docker required.

| Property   | Value                                                         |
| ---------- | ------------------------------------------------------------- |
| URL        | `https://mcp.normatia.com/mcp/`                               |
| Transport  | Streamable HTTP (`http` in most client configs)               |
| Auth       | OAuth, or an API key as `Authorization: Bearer sk-normatia-...` |

API and MCP access are turned on per organization, each on its own: write to hola@normatia.com to get them. With OAuth, the client sends you to sign in to Normatia and gets access for you. To use a key instead, create one on normatia.com in [your account](https://normatia.com/es/area-usuario/cuenta) (section "Claves API"). Keys look like `sk-normatia-` followed by 64 hex characters.

---

## Quick Setup (Automated)

Run the interactive installer (Claude Code, Cursor, VS Code, Windsurf, OpenCode):

```bash
bash <(curl -fsSL https://raw.githubusercontent.com/normatia/normatia/main/mcp/install.sh)
```

Or clone this repo and run it locally:

```bash
bash mcp/install.sh
```

For Claude Code, VS Code and OpenCode you can leave the key empty and sign in with OAuth instead. Merging into an existing config file needs `jq`.

---

## Manual Setup

### Claude Code

With OAuth (then run `/mcp` inside Claude Code and sign in):

```bash
claude mcp add --transport http normatia https://mcp.normatia.com/mcp/
```

With an API key:

```bash
claude mcp add --transport http normatia https://mcp.normatia.com/mcp/ \
  --header "Authorization: Bearer sk-normatia-YOUR_API_KEY"
```

To share the server with your team through a project `.mcp.json`, copy [`claude-code.json`](./claude-code.json): it reads the key from the `NORMATIA_API_KEY` environment variable, so the key never lands in the repository.

### Claude (claude.ai and Claude Desktop)

Remote servers are added as a **custom connector** from your Claude account, not in `claude_desktop_config.json` (that file is for local servers only):

1. Go to [Customize > Connectors](https://claude.ai/customize/connectors), click **+ Add**, then **Add custom connector**.
2. Enter a name and the URL `https://mcp.normatia.com/mcp/`.
3. Choose OAuth sign-in (if asked for the OAuth client, pick **Register automatically**), or no sign-in plus an `Authorization: Bearer sk-normatia-...` request header.

On Team and Enterprise plans, an owner adds it from [Organization settings > Connectors](https://claude.ai/admin-settings/connectors).

### Cursor

**File:** `~/.cursor/mcp.json` (all projects) or `.cursor/mcp.json` (one project)

Copy [`cursor.json`](./cursor.json) into your config file and replace `sk-normatia-YOUR_API_KEY`.

### VS Code / GitHub Copilot

**File:** `.vscode/mcp.json` (per workspace), or the user configuration opened with the **MCP: Open User Configuration** command

Copy [`vscode.json`](./vscode.json). VS Code asks for the key the first time the server starts and keeps it in its secret storage, so it is not written to the file. To sign in with OAuth instead, drop the `inputs` and `headers` blocks and keep only `type` and `url`.

### Windsurf

**File:** `~/.codeium/windsurf/mcp_config.json`

```json
{
  "mcpServers": {
    "normatia": {
      "serverUrl": "https://mcp.normatia.com/mcp/",
      "headers": {
        "Authorization": "Bearer sk-normatia-YOUR_API_KEY"
      }
    }
  }
}
```

### OpenCode

**File:** `~/.config/opencode/opencode.json` (global) or `opencode.json` (project)

Copy [`opencode.json`](./opencode.json) and replace `sk-normatia-YOUR_API_KEY`. Without `headers`, OpenCode signs in with OAuth (`opencode mcp auth normatia`).

---

## Available Tools

The Normatia MCP server exposes 3 tools, all **read-only**: nothing in the MCP surface writes to your projects.

| Tool                            | Description                                                                                                                        | Cost     |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | -------- |
| `ask(query, project_id?)`       | Ask a natural-language question about the regulations that apply to a project. The only tool that returns citable regulatory text.  | 1 credit |
| `get_project_info(project_id?)` | Full project context: location, territory tech data, applicable regulations with their current edition, files, memory, calculations. | Free     |
| `list_projects()`               | Projects the user can query, with their `project_id`, location and which one is active.                                            | Free     |

The server accepts **60 requests per minute per key**. `ask` also counts against your plan's per-minute limit and credits, like `POST /api/v2/ask` on the REST API.

### Everything is scoped to a project

Normatia's regulatory scope is defined **per project**: each project on normatia.com carries its municipality, its applicable regulations, its uploaded documents, the recorded facts about the building and any saved calculations.

So the assistant never has to ask for the city, the climate zone or which edition of the CTE applies: `ask` returns values already resolved for that project. And if the user asks about a municipality where they have no project, the assistant should say so and point at creating one, because municipal ordinances differ completely between town councils and there is no generic answer.

### `ask` is agentic

`ask` runs the **same agent loop as the chat on normatia.com**, not a single-shot search. The model decides what to look up, chains several searches, reads the project's memory and saved calculations, consults uploaded documents and cites every source with validated `[N]` markers.

Because the call is synchronous it runs on shorter budgets than the web chat: up to **6 reasoning rounds, 6 searches and 120 seconds**. If your MCP client lets you configure the tool-call timeout, set it to **150 seconds or more**.

### Working across projects

Every tool takes an optional `project_id`, resolved as:

```
explicit project_id  →  the user's active project
```

To ask about a different project or municipality, call `list_projects()`, take the matching `project_id` and pass it to `ask`. There is no need to switch the active project on the website: several projects can be queried in the same conversation, in parallel, and what the user sees on normatia.com never changes underneath them.

### Typical Workflows

**Active project**: just `ask("...")`. Call `get_project_info()` only when you need the location, the current editions or what is already saved.

**Comparing municipalities**: `list_projects()`, then `ask("...", project_id=A)` and `ask("...", project_id=B)`, then contrast the answers.

---

## Documentation

Full MCP integration guide: **[docs.normatia.com/mcp](https://docs.normatia.com/mcp/)**
