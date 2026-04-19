/**
 * Demonstrates Normatia Building Codes API usage with raw fetch.
 */

const DEFAULT_API_URL = "https://api.normatia.com";

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

function formatOutput(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }
  return JSON.stringify(value, null, 2);
}

function withQuery(path: string, params: Record<string, string>): string {
  const query = new URLSearchParams(params);
  return `${path}?${query.toString()}`;
}

async function fetchJson(
  config: { apiKey: string; baseUrl: string },
  path: string,
): Promise<unknown> {
  const url = `${config.baseUrl}${path}`;

  let response: Response;
  try {
    response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        Accept: "application/json",
      },
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

async function runCall(config: { apiKey: string; baseUrl: string }, title: string, path: string): Promise<void> {
  console.log(`\n== ${title} ==`);
  const payload = await fetchJson(config, path);
  console.log(formatOutput(payload));
}

async function main(): Promise<void> {
  const config = getClientConfig();

  await runCall(
    config,
    "1) Search codes by text: ahorro energetico",
    withQuery("/api/v1/codes/search", {
      q: "ahorro energetico",
      normative_scope: "national",
      page: "1",
      page_size: "5",
    }),
  );

  await runCall(config, "2) Code detail: cte-db-he", "/api/v1/codes/cte-db-he");

  await runCall(config, "3) List versions: cte-db-he", "/api/v1/codes/cte-db-he/versions");

  await runCall(
    config,
    "4) Version detail: cte-db-he 2022",
    "/api/v1/codes/cte-db-he/versions/2022",
  );
}

main().catch((error) => {
  console.error("\nCode lookup example failed.");
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
