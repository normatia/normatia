/**
 * Demonstrates Normatia's agentic Q&A endpoint (POST /api/v2/ask) with raw fetch.
 *
 * The scope of a query comes from its project — municipality, selected
 * regulations, uploaded documents — so there is no geo_id or code filter to
 * pass. Omit project_id to use the user's active project.
 */

const DEFAULT_API_URL = "https://api.normatia.com";

const QUERY =
  "¿Qué requisitos de eficiencia energética aplican a la fachada de mi edificio?";

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

async function request(
  config: { apiKey: string; baseUrl: string },
  path: string,
  init: { method?: "GET" | "POST"; body?: unknown } = {},
): Promise<unknown> {
  const url = `${config.baseUrl}${path}`;
  const headers: Record<string, string> = {
    Authorization: `Bearer ${config.apiKey}`,
    Accept: "application/json",
  };
  if (init.body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  let response: Response;
  try {
    response = await fetch(url, {
      method: init.method ?? "GET",
      headers,
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
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

  if (!response.ok) {
    throw new Error(
      `Request failed (${response.status} ${response.statusText}) for ${url}\n${formatOutput(payload)}`,
    );
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
    const index = source.index ?? "?";
    const title = asString(source.document_title) ?? "untitled";
    const detail = [asString(source.section_title), asString(source.block_title)]
      .filter(Boolean)
      .join(" | ");
    const line = `[${index}] ${title}${detail ? ` | ${detail}` : ""}`;

    if (source.citation_type === "user_document") {
      // Private document uploaded to the project: it has no public URL.
      console.log(`${line} | (project document)`);
    } else {
      const url = asString(source.url);
      console.log(url ? `${line} | ${url}` : line);
    }
  }
}

async function main(): Promise<void> {
  const config = getClientConfig();

  console.log("\n== Projects reachable with this key ==");
  const projectList = asObject(await request(config, "/api/v1/projects"));
  const projects = Array.isArray(projectList.projects) ? projectList.projects : [];

  if (projects.length === 0) {
    console.log(
      "This account has no projects. Create one at normatia.com — the regulatory " +
        "scope of a query is defined by its project.",
    );
    process.exit(1);
  }

  for (const item of projects) {
    const project = asObject(item);
    const mark = project.is_active ? " (active)" : "";
    console.log(
      `- ${asString(project.name) ?? "untitled"}${mark} | ${asString(project.location) ?? "?"} | ${asString(project.project_id)}`,
    );
  }

  const target = asObject(projects.find((item) => asObject(item).is_active) ?? projects[0]);

  console.log("\n== Agentic Q&A ==");
  const payload = asObject(
    await request(config, "/api/v2/ask", {
      method: "POST",
      body: { query: QUERY, project_id: target.project_id },
    }),
  );

  console.log("\nQuestion");
  console.log("========");
  console.log(QUERY);

  console.log("\nAnswer");
  console.log("======");
  console.log(asString(payload.answer) ?? "No answer returned.");

  printSources(payload.sources);

  const resolved = asObject(payload.project);
  console.log("\nProject");
  console.log("=======");
  console.log(`${asString(resolved.location) ?? "?"} | ${asString(resolved.project_id) ?? "?"}`);

  console.log(
    `\nTurn: ${payload.iterations ?? 0} reasoning rounds, ${payload.searches ?? 0} searches.`,
  );
}

main().catch((error) => {
  console.error("\nAI Q&A example failed.");
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
