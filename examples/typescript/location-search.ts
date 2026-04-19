/**
 * Demonstrates Normatia Location API usage with raw fetch.
 */

const DEFAULT_API_URL = "https://api.normatia.com";

type ClientConfig = {
  apiKey: string;
  baseUrl: string;
};

function getClientConfig(): ClientConfig {
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

function buildRequest(
  config: ClientConfig,
  path: string,
  init: RequestInit = {},
): { url: string; init: RequestInit } {
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${config.apiKey}`);
  headers.set("Accept", "application/json");

  return {
    url: `${config.baseUrl}${path}`,
    init: { ...init, headers },
  };
}

function withQuery(path: string, params: Record<string, string>): string {
  const query = new URLSearchParams(params);
  return `${path}?${query.toString()}`;
}

function formatOutput(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }
  return JSON.stringify(value, null, 2);
}

async function fetchJson(config: ClientConfig, path: string): Promise<unknown> {
  const request = buildRequest(config, path, { method: "GET" });

  let response: Response;
  try {
    response = await fetch(request.url, request.init);
  } catch (error) {
    throw new Error(`Network error while calling ${request.url}: ${String(error)}`);
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
    throw new Error(
      `Request failed (${response.status} ${response.statusText}) for ${request.url}\n${formatOutput(payload)}`,
    );
  }

  return payload;
}

async function runCall(config: ClientConfig, title: string, path: string): Promise<void> {
  console.log(`\n== ${title} ==`);
  const payload = await fetchJson(config, path);
  console.log(formatOutput(payload));
}

async function main(): Promise<void> {
  const config = getClientConfig();

  await runCall(
    config,
    "1) Basic search: Sevilla",
    withQuery("/api/v1/location/search", { q: "Sevilla" }),
  );

  await runCall(
    config,
    "2) Filter by level: municipality",
    withQuery("/api/v1/location/search", {
      q: "Sevilla",
      level: "municipality",
    }),
  );

  await runCall(
    config,
    "3) Filter by ancestor_id: municipalities inside Sevilla province (ES-41)",
    withQuery("/api/v1/location/search", {
      q: "Mairena del Aljarafe",
      ancestor_id: "ES-41",
      level: "municipality",
    }),
  );

  await runCall(config, "4) Location detail: ES-41091 (Sevilla municipality)", "/api/v1/location/ES-41091");
}

main().catch((error) => {
  console.error("\nLocation example failed.");
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
