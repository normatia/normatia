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

const locationSearch = await client.searchLocations({
  q: "Madrid",
  level: "municipality",
});

console.log(locationSearch.results);
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

### ask(request)

Run AI-powered Q&A over the applicable regulations.

```ts
const answer = await client.ask({
  query: "What is the minimum stair width for this use case?",
  geo_id: "ES-MD",
  codes: [{ slug: "cte-db-si" }],
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
- `AskRequest`, `AskResponse`, `VerifyRequest`, `VerifyResponse`
- `PaginatedResponse<T>`
- Shared entities: `Ancestor`, `ApplicableCode`, `Section`, `Source`, `GeoContext`

Example:

```ts
import type { AskRequest, AskResponse, VerifyRequest, VerifyResponse } from "normatia";
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
