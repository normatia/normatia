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

Create a key on normatia.com, in [your account](https://normatia.com/es/area-usuario/cuenta)
(section "Claves API"). API access is turned on per organization (write to
hola@normatia.com); a key from an organization without it gets `403 api_not_enabled`.
The key acts as the user who created it, within its organization: it sees that
organization's projects only, and its usage
counts against its organization.

Pass your API key to the client constructor. The SDK sends:

- Header: `Authorization: Bearer sk-normatia-xxxxx`

```ts
import { NormatiaClient } from "normatia";

const client = new NormatiaClient({
  apiKey: "sk-normatia-xxxxx",
});
```

## API Methods

Every method calls an existing route of the API and resolves with its JSON
body. Data methods (account, locations, codes, projects) are free and limited
to 60 requests per minute; `askV2` and `verify` consume 1 credit per call.

### getMe()

The key, its organization, what it has turned on (API and MCP), its
per-minute limits and the credits left this month. Call it first: if it
answers, the key works.

```ts
const me = await client.getMe();
console.log(me.organization?.name, me.organization?.api_enabled, me.quota.remaining);
```

### getUsage(params?)

Calls and credits of the key's organization between two dates (UTC, both
included), by endpoint and by day, with this key's share. Defaults to the
current month; at most 92 days per call.

```ts
const usage = await client.getUsage({ from: "2026-11-01", to: "2026-11-30" });
console.log(usage.totals.calls, usage.totals.credits);
```

### getParcel(ref, options?)

A parcel by its cadastral reference, from Normatia's territorial database:
place, cadastral class, area, centroid and addresses, and with `include`
its constraints, zoning, buildings and geometry. A layer without data has
`affected: null`, which never means "not affected".

```ts
const parcel = await client.getParcel("9872023VH5797S", { include: ["constraints", "zoning"] });
const affected = parcel.constraints?.layers.filter((l) => l.affected === true);
```

### searchLocations(params)

Search countries, autonomous communities, provinces and municipalities by name
(case- and accent-insensitive, up to 50 results).

```ts
const data = await client.searchLocations({
  q: "Sevilla",
  level: "municipality",
});

// { results: LocationResult[] }, e.g. { geo_id: "ES-41091", name: "Sevilla", level: "municipality" }
```

### getLocation(geoId)

Get a location with its ancestors, its tech data and the regulations that apply
to it, its own and those inherited from its ancestors.

```ts
const location = await client.getLocation("ES-41091");

console.log(location.tech_data?.climate_zone);
// LocationDetail
```

### searchCodes(params?)

Search the regulation catalog by title, scope or tag, with pagination.

```ts
const codes = await client.searchCodes({
  q: "ahorro",
  normative_scope: "national",
  page: 1,
  page_size: 20,
});

// PaginatedResponse<CodeResult>
```

`normative_scope` takes `national`, `regional`, `provincial`, `municipal`,
`sectoral`, `supramunicipal` or `european`.

### getCode(slug)

Get a regulation with all its versions (`documents`), those in force first.

```ts
const code = await client.getCode("cte-db-he");

// CodeDetail
```

The API also has `GET /api/v1/codes/{slug}/latest` (versions in force) and
`GET /api/v1/codes/{slug}/{version}` (one version with its section index); the
SDK has no method for them yet. The catalog never returns the text of a
regulation: to get what a regulation says, with citations, use `askV2`.

### listProjects()

List the projects this key can query. Free: it does not consume quota.

```ts
const { projects } = await client.listProjects();

// ProjectListResponse
// projects[].is_active marks the one used when no project_id is passed
```

### getProjectInfo(projectId?)

Full context of a project: location and territory tech data, applicable
regulations with their current edition, regulations available but not selected,
uploaded and generated documents, recorded facts and saved calculations. Omit
the argument to describe the active project. Free: it does not consume quota.

```ts
const project = await client.getProjectInfo("3f8c1a90-5b2e-4d77-9d21-0e5f4a6c8b13");

// ProjectInfoResponse
```

### askV2(request)

Ask a regulatory question through the agentic engine, the same agent loop as
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
  console.log(`[${source.index}] ${source.document_title}: ${source.url ?? "project document"}`);
}

// AskV2Response
```

A turn takes noticeably longer than a plain search: the server caps it at 6
reasoning rounds, 6 searches and 120 seconds, and the SDK waits up to 150
seconds. Each call consumes **1 credit**, however many searches the agent runs.

### ask(request) (deprecated)

Calls the frozen `POST /api/v1/ask`: a single semantic search over the active
project, with no tools, project memory or calculations. Kept for existing
integrations and scheduled for removal. **Use `askV2` instead.**

The endpoint no longer accepts `geo_id`, `codes` or `messages`: sending any of
them returns `422`.

```ts
const answer = await client.ask({
  query: "What is the minimum stair width for this use case?",
});

// AskResponse
```

### verify(request)

Check a technical parameter against the regulations in force for the location
of the user's **active project**. `geo_id` must be that project's location
(find it with `listProjects()`, the project with `is_active: true`); any other
`geo_id` returns `422 geo_id_mismatch`, and a user with no active project gets
`400 no_active_project`. The active project is changed on normatia.com.

The evaluation is made by a language model from the retrieved regulatory text,
so treat it as a first check with its sources, not as a certification.

```ts
const verification = await client.verify({
  element: "Fachada de ladrillo cara vista",
  parameter: "transmitancia térmica",
  value: 0.35,
  unit: "W/m²K",
  geo_id: "ES-41091",
  codes: [{ slug: "cte-db-he" }],
});

console.log(verification.result_status, verification.limit_value);
// VerifyResponse
```

`codes[].version` and `context` are accepted by the API but currently ignored:
the search always uses the versions in force.

## TypeScript Types

The SDK exports all request and response types, including:

- `NormatiaConfig`
- `LocationSearchParams`, `LocationResult`, `LocationDetail`
- `CodeSearchParams`, `CodeResult`, `CodeDetail`, `DocumentVersion`
- `AskV2Request`, `AskV2Response`, `AskV2Source`, `AskV2Project`
- `ProjectListResponse`, `ProjectListItem`, `ProjectInfoResponse`
- Project sub-entities: `ProjectGeoContext`, `ProjectCollection`, `ProjectUnselectedCollection`, `ProjectGeneratedDocument`, `ProjectMemoryFact`, `ProjectCalculation`, `ProjectCalculator`
- `VerifyRequest`, `VerifyResponse`, `VerifySource`, `CodeReference`
- `AskRequest`, `AskResponse` (deprecated, for the frozen v1 endpoint)
- `PaginatedResponse<T>`
- Shared entities: `Ancestor`, `ApplicableCode`, `Source`, `GeoContext`

Example:

```ts
import type { AskV2Request, AskV2Response, ProjectInfoResponse, VerifyResponse } from "normatia";
```

## Error Handling

The `/api/v1` and `/api/v2` routes send their errors as
`{"detail": {"error": "<code>", "message": "..."}}`; the `/v1` routes
(`getMe`, `getUsage`) send RFC 9457 problems with `code` and `detail`. The SDK
reads both. Every SDK error exposes:

- `statusCode`: the HTTP status (0 for network failures)
- `requestId`: the `X-Request-Id` of the response. Include it when you contact
  support
- `code`: the machine-readable code, such as
  `missing_api_key`, `api_not_enabled`, `not_found`, `project_not_found`,
  `no_active_project`, `geo_id_mismatch`, `rate_limit_exceeded` or
  `quota_exceeded`. Branch on this, not on the message.
- `message`: `detail.message` when the API sends one (in English or Spanish);
  otherwise a summary built from the code, the validation errors or the HTTP
  status
- `detail`: the raw `detail` value, with extra fields such as `remaining` and
  `reset_at` on `quota_exceeded`
- `retryAfter` (only `RateLimitError`): seconds to wait, from `Retry-After`

The SDK throws typed errors for common HTTP statuses:

- `AuthenticationError` (401)
- `ForbiddenError` (403)
- `NotFoundError` (404)
- `ValidationError` (422)
- `RateLimitError` (429)
- `NormatiaError` (fallback for other API/network errors)

```ts
import { NormatiaClient, AuthenticationError, RateLimitError, NormatiaError } from "normatia";

try {
  await client.askV2({ query: "¿Qué altura libre mínima exige la ordenanza?" });
} catch (error) {
  if (error instanceof AuthenticationError) {
    console.error("Invalid API key");
  } else if (error instanceof RateLimitError && error.code === "quota_exceeded") {
    console.error("No credits left until", (error.detail as { reset_at?: string | null })?.reset_at);
  } else if (error instanceof RateLimitError) {
    console.error(`Too many requests, retry in ${error.retryAfter ?? 60} s`);
  } else if (error instanceof NormatiaError) {
    console.error(`Normatia API error ${error.statusCode} (${error.code}, ${error.requestId}): ${error.message}`);
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

- API reference: https://docs.normatia.com
- Authentication, limits and error codes: https://docs.normatia.com/api-reference/authentication/

## License

MIT
