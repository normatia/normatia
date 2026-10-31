/**
 * Demonstrates Normatia Compliance Verification endpoint usage with raw fetch.
 *
 * POST /api/v1/verify only works on the location of the user's ACTIVE project on
 * normatia.com: geo_id must be that project's geo_id (see GET /api/v1/projects,
 * the project with is_active: true). Any other geo_id returns 422
 * geo_id_mismatch. Each call consumes 1 credit.
 */

const DEFAULT_API_URL = "https://api.normatia.com";

const REQUEST_BODY = {
  element: "Ventana exterior con carpintería de aluminio con rotura de puente térmico",
  parameter: "Transmitancia térmica (valor U)",
  value: 2.3,
  unit: "W/m2K",
  geo_id: "ES-41091",
  codes: [{ slug: "cte-db-he" }],
};

function getClientConfig(): { apiKey: string; baseUrl: string } {
  const apiKey = process.env.NORMATIA_API_KEY;
  if (!apiKey) {
    console.error("Error: NORMATIA_API_KEY is not set.");
    console.error("Set it first: export NORMATIA_API_KEY='sk-normatia-xxxxx'");
    process.exit(1);
  }

  return {
    apiKey,
    baseUrl: (process.env.NORMATIA_API_URL ?? DEFAULT_API_URL).replace(/\/+$/, ""),
  };
}

function asObject(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object") {
    return value as Record<string, unknown>;
  }
  return {};
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function formatOutput(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }
  return JSON.stringify(value, null, 2);
}

function formatValue(value: unknown): string {
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (typeof value === "string") {
    return value;
  }
  if (value === null || value === undefined) {
    return "n/a";
  }
  return JSON.stringify(value);
}

async function postJson(
  config: { apiKey: string; baseUrl: string },
  path: string,
  body: unknown,
): Promise<unknown> {
  const url = `${config.baseUrl}${path}`;

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
  } catch (error) {
    throw new Error(`Network error while calling ${url}: ${String(error)}`);
  }

  const raw = await response.text();
  let payload: unknown = null;
  if (raw) {
    try {
      payload = JSON.parse(raw);
    } catch {
      payload = raw;
    }
  }

  if (!response.ok) {
    throw new Error(`Request failed (${response.status} ${response.statusText}) for ${url}\n${formatOutput(payload)}`);
  }

  return payload;
}

function printSources(sources: unknown): void {
  console.log("\nSources");
  console.log("=======");

  if (!Array.isArray(sources) || sources.length === 0) {
    console.log("No sources returned.");
    return;
  }

  for (const item of sources) {
    const source = asObject(item);
    const title = asString(source.document_title) ?? asString(source.code_slug) ?? "untitled";
    const section = asString(source.section_title);
    const url = asString(source.url) ?? "no url";
    console.log(`[${source.index ?? "?"}] ${title}${section ? ` | ${section}` : ""} | ${url}`);
  }
}

async function main(): Promise<void> {
  const config = getClientConfig();

  console.log("\n== Compliance check: Window U-value in Seville (ES-41091) against CTE DB-HE ==");

  const payload = asObject(await postJson(config, "/api/v1/verify", REQUEST_BODY));

  const isCompliant = payload.is_compliant;
  const resultStatus = asString(payload.result_status) ?? "unknown";

  const providedValue = payload.provided_value ?? REQUEST_BODY.value;
  const providedUnit = asString(payload.unit) ?? REQUEST_BODY.unit;
  const limitValue = payload.limit_value ?? "n/a";

  console.log("\nCompliance status");
  console.log("=================");
  console.log(`is_compliant: ${formatValue(isCompliant)}`);
  console.log(`result_status: ${resultStatus}`);

  console.log("\nProvided vs limit");
  console.log("=================");
  console.log(`provided: ${formatValue(providedValue)} ${providedUnit}`);
  console.log(`limit: ${formatValue(limitValue)} ${providedUnit}`);

  const notes = [
    ...(Array.isArray(payload.conditions) ? payload.conditions : []),
    ...(Array.isArray(payload.warnings) ? payload.warnings : []),
  ];
  if (notes.length > 0) {
    console.log("\nConditions and warnings");
    console.log("=======================");
    for (const note of notes) {
      console.log(`- ${formatValue(note)}`);
    }
  }

  printSources(payload.sources);
}

main().catch((error) => {
  console.error("\nCompliance check example failed.");
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
