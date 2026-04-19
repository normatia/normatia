/**
 * Demonstrates Normatia AI Q&A endpoint usage with raw fetch.
 */

const DEFAULT_API_URL = "https://api.normatia.com";

const REQUEST_BODY = {
  query: "What energy efficiency requirements apply to a residential building facade in Seville?",
  geo_id: "ES-41091",
  codes: [{ slug: "cte-db-he", version: "2022" }],
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

  for (const [index, item] of sources.entries()) {
    const source = asObject(item);
    const codeSlug = asString(source.code_slug) ?? "unknown-code";
    const version = asString(source.version) ?? "n/a";
    const section =
      asString(source.section_title) ??
      asString(source.title) ??
      asString(source.reference) ??
      "untitled section";
    const url = asString(source.url);

    const base = `${index + 1}. ${codeSlug} (${version}) | ${section}`;
    console.log(url ? `${base} | ${url}` : base);
  }
}

async function main(): Promise<void> {
  const config = getClientConfig();

  console.log("\n== AI Q&A: Energy efficiency requirements in Seville (CTE DB-HE) ==");

  const payload = asObject(await postJson(config, "/api/v1/ask", REQUEST_BODY));

  console.log("\nQuestion");
  console.log("========");
  console.log(REQUEST_BODY.query);

  console.log("\nAnswer");
  console.log("======");
  console.log(asString(payload.answer) ?? "No answer returned.");

  printSources(payload.sources);
}

main().catch((error) => {
  console.error("\nAI Q&A example failed.");
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
