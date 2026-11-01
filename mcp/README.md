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

Data first, interpretation second. The data tools are free and deterministic and return the same JSON as the REST
API (in `structuredContent`, with an `outputSchema`) plus a text summary for the model. `ask` interprets the
regulations with Normatia's agentic engine and spends one query.

| Tool | Description | Cost |
| --- | --- | --- |
| `find_parcel(lat, lon)` | The cadastral parcel at a point, or the nearest ones | Free |
| `get_parcel(ref, include?)` | A parcel: municipality, class, area, addresses and, with `include`, constraints, zoning, buildings, units, geometry | Free |
| `get_place(place)` | A municipality (name, INE code or `ES-…`) with its technical data, each with the regulation it comes from | Free |
| `search_regulations(query?, place?, scope?, curated?)` | The regulation catalog, by title, scope or municipality | Free |
| `get_regulation_contents(regulation, version?)` | A regulation's table of contents | Free |
| `read_regulation_section(regulation, section, version?)` | The text of a section, article by article | Free |
| `ask(query, project_id? \| place? \| parcel?)` | A question interpreted by the engine, with cited sources | 1 query |
| `get_answer(answer_id)` | Collects an `ask` that was still running | Free |
| `list_projects()` | The user's projects, with their `project_id` | Free |
| `get_project_info(project_id?)` | A project's context: location, applicable regulations, files, memory, calculations | Free |
| `get_usage(from_date?, to_date?)` | Calls and queries spent, and what is left this month | Free |

All are read-only except `ask`, which saves its conversation. Errors come back as `isError` results with the API
error code, the message and what to do next. The server accepts **60 requests per minute per key**; `ask` also
counts against the plan's per-minute limit and monthly quota.

Two rules the server gives the assistant: a constraint layer with `no_data` is unknown, never "not affected"; and
regulation text with `curated: false` was converted automatically and is unreviewed.

### `ask`: three scopes, 45 seconds

`ask` runs the **same agent loop as the chat on normatia.com** and cites every source with validated `[N]` markers.
It takes at most one scope:

- a project (`project_id`, or the active one by default): its regulations, uploaded documents, memory and calculations;
- a municipality (`place`), without a project: the regulations that apply there, from national to municipal;
- a parcel (`parcel`), without a project: its municipality's regulations plus its constraints and zoning.

It waits at most **45 seconds**, with a progress notification every 5. If the engine has not finished it returns
`status: "running"` and an `id`, the query keeps running on the server, and `get_answer` collects it without
spending another query.

### Working across projects

To ask about a different project, call `list_projects()`, take the matching `project_id` and pass it to `ask`. There
is no need to switch the active project on the website. If the user has no project in that municipality, use `place`
or `parcel`, never another project's regulations.

### OAuth tokens

The access token a client gets through OAuth lasts **one hour** and is renewed with a refresh token that lasts 30
days and rotates on every use; reusing a spent one closes the whole connection. Connected assistants are listed in
Mi cuenta > Aplicaciones conectadas, where they can be disconnected.

---

## Documentation

Full MCP integration guide: **[docs.normatia.com/mcp](https://docs.normatia.com/mcp/)**
