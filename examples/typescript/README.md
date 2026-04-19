# Normatia TypeScript Fetch Examples

These scripts demonstrate how to call the Normatia API from TypeScript using native fetch (no SDK).

## Included examples

- `location-search.ts`: Location search filters and location detail
- `code-lookup.ts`: Code search, code detail, versions list, and version detail
- `ai-qa.ts`: AI Q&A request with location and code filters
- `compliance-check.ts`: Compliance verification request for a building element

## Prerequisites

- Node.js 18+
- A valid API key

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
npm run verify
```
