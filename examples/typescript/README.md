# Normatia TypeScript Fetch Examples

These scripts demonstrate how to call the Normatia API from TypeScript using native fetch (no SDK).

## Included examples

- `location-search.ts`: Location search filters and location detail
- `code-lookup.ts`: Code search, code detail, versions in force and one version with its section index
- `ai-qa.ts`: Agentic Q&A (`POST /api/v2/ask`) over one of your projects
- `compliance-check.ts`: A compliance check asked in plain words (`POST /api/v2/ask`) on your active project

## Prerequisites

- Node.js 18+
- A valid API key (created on normatia.com, in your account). `ai-qa.ts` and `compliance-check.ts` cost 5 credits
  each, nothing if they fail; the other examples 0.1 credits a call

## Environment variables

PowerShell:

```powershell
$env:NORMATIA_API_KEY = "sk-normatia-xxxxx"
$env:NORMATIA_API_URL = "https://api.normatia.com"
```

Bash:

```bash
export NORMATIA_API_KEY="sk-normatia-xxxxx"
export NORMATIA_API_URL="https://api.normatia.com"
```

`NORMATIA_API_URL` is optional and defaults to `https://api.normatia.com`.

## Run examples

From this directory:

```bash
npm install
npm run location
npm run codes
npm run ai
npm run compliance
```
