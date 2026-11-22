/**
 * Demonstrates a compliance check with Normatia's agentic Q&A endpoint
 * (POST /api/v2/ask) and raw fetch.
 *
 * The question is asked in plain words on the user's active project, which
 * already carries its municipality, its climate zone and its regulations. The
 * answer gives the limit, the section that sets it and the verdict, with its
 * sources. Add project_id to the body to target another project.
 *
 * Each call costs 5 credits of the organization's balance, nothing if it fails.
 * Without enough credits the API answers 402 insufficient_credits.
 */

const DEFAULT_API_URL = "https://api.normatia.com";

const QUERY =
  "Una ventana exterior de aluminio con rotura de puente térmico tiene una transmitancia " +
  "U = 2,3 W/m²K. ¿Cumple el CTE DB-HE en mi proyecto? Dime el valor límite, el apartado " +
  "que lo fija y si cumple.";

// A turn is capped server-side at 120 s. Give the client margin on top: aborting
// early does not stop the turn, it just throws the answer away.
const REQUEST_TIMEOUT_MS = 150_000;

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
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
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

  if (response.status === 402) {
    const detail = asObject(asObject(payload).detail);
    throw new Error(
      `Not enough credits for this query: ${String(detail.available)} available, ${String(detail.required)} needed.`,
    );
  }

  if (!response.ok) {
    throw new Error(`Request failed (${response.status} ${response.statusText}) for ${url}\n${formatOutput(payload)}`);
  }

  return payload;
}

/** Print the cited sources. `index` is the N of each [N] marker in the answer. */
function printSources(sources: unknown): void {
  console.log("\nSources");
  console.log("=======");

  if (!Array.isArray(sources) || sources.length === 0) {
    console.log("No sources returned.");
    return;
  }

  for (const item of sources) {
    const source = asObject(item);
    const title = asString(source.document_title) ?? "untitled";
    const detail = [asString(source.section_title), asString(source.block_title)].filter(Boolean).join(" | ");
    const line = `[${source.index ?? "?"}] ${title}${detail ? ` | ${detail}` : ""}`;
    const url = asString(source.url);
    console.log(url ? `${line} | ${url}` : line);
  }
}

async function main(): Promise<void> {
  const config = getClientConfig();

  console.log("\n== Compliance check: window U-value against CTE DB-HE, on the active project ==");
  console.log(QUERY);

  const payload = asObject(await postJson(config, "/api/v2/ask", { query: QUERY }));

  console.log("\nAnswer");
  console.log("======");
  console.log(asString(payload.answer) ?? "No answer returned.");

  printSources(payload.sources);

  const project = asObject(payload.project);
  console.log(`\nProject: ${asString(project.location) ?? "?"} | ${asString(project.project_id) ?? "?"}`);
}

main().catch((error) => {
  console.error("\nCompliance check example failed.");
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
