# Normatia TypeScript SDK

Official TypeScript SDK for the Normatia building code compliance API.

## Installation

### npm

```bash
npm install normatia
```

### pnpm

```bash
pnpm add normatia
```

### yarn

```bash
yarn add normatia
```

### bun

```bash
bun add normatia
```

## Quick Start

```ts
import NormatiaClient from "normatia";

const client = new NormatiaClient({
  apiKey: process.env.NORMATIA_API_KEY as string,
  baseUrl: "https://api.normatia.com",
});

// Regulatory questions are scoped to a project, which already carries its
// municipality, its applicable regulations and its documents.
const { projects } = await client.listProjects();
const active = projects.find((project) => project.is_active) ?? projects[0];

const answer = await client.askV2({
  query: "¿Qué transmitancia máxima puedo poner en las ventanas?",
  project_id: active.project_id,
});

console.log(answer.answer);
```

## Authentication

Pass your API key to the client constructor. The SDK sends:

- Header: `Authorization: Bearer sk-normatia-xxxxx`

```ts
import { NormatiaClient } from "normatia";

const client = new NormatiaClient({
  apiKey: "sk-normatia-xxxxx",
});
```

## API Methods

### searchLocations(params)

Search geographic locations.

```ts
const data = await client.searchLocations({
  q: "Barcelona",
  level: "municipality",
});

// { results: LocationResult[] }
```

### getLocation(geoId)

Get full details for a location.

```ts
const location = await client.getLocation("ES-CT-B");

// LocationDetail
```

### searchCodes(params?)

Search building codes with optional filters and pagination.

```ts
const codes = await client.searchCodes({
  q: "db-si",
  normative_scope: "state",
  page: 1,
  page_size: 20,
});

// PaginatedResponse<CodeResult>
```

### getCode(slug)

Get code metadata and available document versions.

```ts
const code = await client.getCode("cte-db-si");

// CodeDetail
```

### getCodeVersions(slug)

List versions for a building code.

```ts
const versions = await client.getCodeVersions("cte-db-si");

// PaginatedResponse<DocumentVersion>
```

### getCodeVersion(slug, version)

Get a specific code version with sections.

```ts
const version = await client.getCodeVersion("cte-db-si", "2023-12");

// CodeVersionDetail
```

### listProjects()

List the projects this key can query. Free — does not consume quota.

```ts
const { projects } = await client.listProjects();

// ProjectListResponse
// projects[].is_active marks the one used when no project_id is passed
```

### getProjectInfo(projectId?)

Full context of a project: location and territory tech data, applicable
regulations with their current edition, regulations available but not selected,
uploaded and generated documents, recorded facts and saved calculations. Omit
the argument to describe the active project. Free — does not consume quota.

```ts
const project = await client.getProjectInfo("3f8c1a90-5b2e-4d77-9d21-0e5f4a6c8b13");

// ProjectInfoResponse
```

### askV2(request)

Ask a regulatory question through the agentic engine — the same agent loop as
the chat on normatia.com. It chains several searches, reads the project's
recorded facts and saved calculations, consults uploaded documents and cites
every source with `[N]` markers that match `sources[].index`.

The scope comes from the project, so there is no geography or code filter. Omit
`project_id` to use the active project.

```ts
const answer = await client.askV2({
  query: "¿Qué anchura mínima de escalera me exige la normativa?",
  project_id: "3f8c1a90-5b2e-4d77-9d21-0e5f4a6c8b13",
});

console.log(answer.answer);
for (const source of answer.sources) {
  console.log(`[${source.index}] ${source.document_title} — ${source.url ?? "project document"}`);
}

// AskV2Response
```

A turn takes noticeably longer than a plain search — the server caps it at 6
reasoning rounds, 6 searches and 120 seconds, and the SDK waits up to 150
seconds. Each call consumes **1 credit**, however many searches the agent runs.

### ask(request) — deprecated

Calls the frozen `POST /api/v1/ask`: a single semantic search over the active
project, with no tools, project memory or calculations. Kept for existing
integrations and scheduled for removal. **Use `askV2` instead.**

The endpoint no longer accepts `geo_id`, `codes` or `messages` — sending any of
them returns `422`.

```ts
const answer = await client.ask({
  query: "What is the minimum stair width for this use case?",
});

// AskResponse
```

### verify(request)

Run a compliance verification check for a specific parameter.

```ts
const verification = await client.verify({
  element: "stair",
  parameter: "width",
  value: 1.1,
  unit: "m",
  geo_id: "ES-MD",
  codes: [{ slug: "cte-db-si", version: "2023-12" }],
  context: "Residential building evacuation path",
});

// VerifyResponse
```

## TypeScript Types

The SDK exports all request and response types, including:

- `NormatiaConfig`
- `LocationSearchParams`, `LocationResult`, `LocationDetail`
- `CodeSearchParams`, `CodeResult`, `CodeDetail`, `DocumentVersion`, `CodeVersionDetail`
- `AskV2Request`, `AskV2Response`, `AskV2Source`, `AskV2Project`
- `ProjectListResponse`, `ProjectListItem`, `ProjectInfoResponse`
- Project sub-entities: `ProjectGeoContext`, `ProjectCollection`, `ProjectUnselectedCollection`, `ProjectGeneratedDocument`, `ProjectMemoryFact`, `ProjectCalculation`, `ProjectCalculator`
- `VerifyRequest`, `VerifyResponse`
- `AskRequest`, `AskResponse` (deprecated, for the frozen v1 endpoint)
- `PaginatedResponse<T>`
- Shared entities: `Ancestor`, `ApplicableCode`, `Section`, `Source`, `GeoContext`

Example:

```ts
import type { AskV2Request, AskV2Response, ProjectInfoResponse, VerifyResponse } from "normatia";
```

## Error Handling

The SDK throws typed errors for common HTTP statuses:

- `AuthenticationError` (401)
- `ForbiddenError` (403)
- `NotFoundError` (404)
- `ValidationError` (422)
- `RateLimitError` (429)
- `NormatiaError` (fallback for other API/network errors)

```ts
import { NormatiaClient, AuthenticationError, ValidationError, NormatiaError } from "normatia";

try {
  await client.verify({
    element: "window",
    parameter: "area",
    value: 0,
    unit: "m2",
    geo_id: "ES-MD",
  });
} catch (error) {
  if (error instanceof AuthenticationError) {
    console.error("Invalid API key");
  } else if (error instanceof ValidationError) {
    console.error("Request payload is invalid", error.detail);
  } else if (error instanceof NormatiaError) {
    console.error(`Normatia API error (${error.statusCode}): ${error.message}`);
  } else {
    console.error("Unexpected error", error);
  }
}
```

## Environment Variables

Typical setup:

```bash
NORMATIA_API_KEY=sk-normatia-xxxxx
NORMATIA_API_BASE_URL=https://api.normatia.com
```

Usage:

```ts
const client = new NormatiaClient({
  apiKey: process.env.NORMATIA_API_KEY as string,
  baseUrl: process.env.NORMATIA_API_BASE_URL,
});
```

## API Documentation

- Main API docs: https://docs.normatia.com
- OpenAPI schema: https://api.normatia.com/openapi.json
- Repository docs: https://github.com/normatia/normatia-docs

## License

MIT
