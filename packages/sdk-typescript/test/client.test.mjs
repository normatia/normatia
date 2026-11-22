// The client against a fake fetch: requests, errors and the new address routes. No network.
// It tests the built package (dist), so `npm test` builds first.
import assert from "node:assert/strict";
import { afterEach, test } from "node:test";

import {
  InsufficientCreditsError,
  NormatiaClient,
  NormatiaError,
  RateLimitError,
  RetiredEndpointError,
  ValidationError,
} from "../dist/index.mjs";

const KEY = "sk-normatia-test-" + "a".repeat(64);
const realFetch = globalThis.fetch;

/** Replace fetch with `handler(url, init)`; returns the list of requests it saw. */
function fakeFetch(handler) {
  const calls = [];
  globalThis.fetch = async (input, init) => {
    const url = new URL(String(input));
    calls.push({ url, init });
    return handler(url, init);
  };
  return calls;
}

function json(status, body, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });
}

afterEach(() => {
  globalThis.fetch = realFetch;
});

const client = () => new NormatiaClient({ apiKey: KEY });

test("findParcelsByAddress sends the address and the province", async () => {
  const body = {
    object: "list",
    data: [
      {
        ref: "0847106VK4704F",
        address: "Calle Mayor 5, Madrid",
        place: { geo_id: "ES-28079", ine: "28079", name: "Madrid" },
        location: { lat: 40.4155, lon: -3.7074 },
        confidence: "confirmed",
        match: { municipality: true, number: true },
      },
    ],
    has_more: false,
    exact: true,
    interpreted: { street: "CALLE MAYOR", number: "5", municipality: "Madrid", province: null },
    reason: null,
    suggestions: [],
  };
  const calls = fakeFetch(() => json(200, body));

  const result = await client().findParcelsByAddress("  Calle Mayor 5, Madrid ", { province: "ES-28" });

  assert.deepEqual(result, body);
  assert.equal(calls.length, 1);
  const { url, init } = calls[0];
  assert.equal(url.origin + url.pathname, "https://api.normatia.com/v1/parcels");
  assert.equal(url.searchParams.get("address"), "Calle Mayor 5, Madrid");
  assert.equal(url.searchParams.get("province"), "ES-28");
  assert.equal(url.searchParams.has("lat"), false);
  assert.equal(new Headers(init.headers).get("authorization"), `Bearer ${KEY}`);
});

test("findParcelsByAddress leaves out a missing or blank province", async () => {
  const calls = fakeFetch(() =>
    json(200, { object: "list", data: [], has_more: false, exact: false, interpreted: null, reason: "no_candidates", suggestions: [] }),
  );

  const result = await client().findParcelsByAddress("Calle Inventada 99, Madrid");
  await client().findParcelsByAddress("Calle Inventada 99, Madrid", { province: "  " });

  assert.equal(result.reason, "no_candidates");
  assert.deepEqual(
    calls.map(({ url }) => [...url.searchParams.keys()]),
    [["address"], ["address"]],
  );
});

test("findParcelsByAddress rejects an empty address before sending", async () => {
  const calls = fakeFetch(() => json(500, {}));

  await assert.rejects(client().findParcelsByAddress("   "), (error) => {
    assert.ok(error instanceof ValidationError);
    assert.deepEqual(error.detail, { field: "address" });
    return true;
  });
  assert.equal(calls.length, 0);
});

test("an unknown province is a ValidationError with its code", async () => {
  fakeFetch(() =>
    json(
      422,
      {
        type: "https://docs.normatia.com/api-reference/errores/#invalid_place",
        title: "Datos no válidos",
        status: 422,
        detail: "La provincia es `ES-` y su código INE de 2 cifras (ES-28) o su nombre.",
        code: "invalid_place",
      },
      { "Content-Type": "application/problem+json", "X-Request-Id": "req_123" },
    ),
  );

  await assert.rejects(client().findParcelsByAddress("Calle Mayor 5", { province: "ES-99" }), (error) => {
    assert.ok(error instanceof ValidationError);
    assert.equal(error.code, "invalid_place");
    assert.equal(error.requestId, "req_123");
    return true;
  });
});

test("findParcelsAtPoint still sends lat and lon", async () => {
  const calls = fakeFetch(() =>
    json(200, { object: "list", data: [{ ref: "9872023VH5797S", contains_point: true, distance_m: 0 }], has_more: false }),
  );

  const { data } = await client().findParcelsAtPoint(40.451247, -3.573312);

  assert.equal(data[0].ref, "9872023VH5797S");
  assert.equal(calls[0].url.pathname, "/v1/parcels");
  assert.deepEqual(Object.fromEntries(calls[0].url.searchParams), { lat: "40.451247", lon: "-3.573312" });
});

test("suggestAddresses sends q and limit", async () => {
  const body = {
    object: "list",
    data: [
      {
        type: "address",
        text: "Calle Mayor 5, Madrid",
        place: { geo_id: "ES-28079", ine: "28079", name: "Madrid" },
        province: "Madrid",
        postal_code: "28013",
        ref: "0847106VK4704F",
        location: { lat: 40.4155, lon: -3.7074 },
      },
      {
        type: "street",
        text: "Calle Mayor, Alcalá de Henares",
        place: { geo_id: "ES-28005", ine: "28005", name: "Alcalá de Henares" },
        province: "Madrid",
        postal_code: null,
        ref: null,
        location: { lat: 40.48, lon: -3.36 },
      },
    ],
    has_more: false,
  };
  const calls = fakeFetch(() => json(200, body));

  const result = await client().suggestAddresses("calle mayor 5", { limit: 3 });

  assert.deepEqual(result, body);
  assert.equal(calls[0].url.pathname, "/v1/addresses");
  assert.deepEqual(Object.fromEntries(calls[0].url.searchParams), { q: "calle mayor 5", limit: "3" });
});

test("suggestAddresses without limit lets the API choose", async () => {
  const calls = fakeFetch(() => json(200, { object: "list", data: [], has_more: false }));

  await client().suggestAddresses("hermos");

  assert.deepEqual(Object.fromEntries(calls[0].url.searchParams), { q: "hermos" });
});

test("a 429 of the organization limit on /v1 says its group", async () => {
  fakeFetch(() =>
    json(
      429,
      {
        type: "https://docs.normatia.com/api-reference/errores/#rate_limit_exceeded",
        title: "Demasiadas peticiones",
        status: 429,
        detail: "Tu organización ha superado las 300 peticiones por minuto, sumando todas sus claves. Vuelve a intentarlo en 12 s.",
        code: "rate_limit_exceeded",
        group: "organization",
        limit_rpm: 300,
        current: 301,
      },
      { "Content-Type": "application/problem+json", "Retry-After": "12" },
    ),
  );

  await assert.rejects(client().suggestAddresses("calle mayor"), (error) => {
    assert.ok(error instanceof RateLimitError);
    assert.equal(error.code, "rate_limit_exceeded");
    assert.equal(error.group, "organization");
    assert.equal(error.retryAfter, 12);
    return true;
  });
});

test("a 429 on the /api routes reads its group from detail", async () => {
  fakeFetch(() =>
    json(
      429,
      { detail: { error: "rate_limit_exceeded", message: "Has superado las 60 peticiones por minuto.", group: "data" } },
      { "Retry-After": "30" },
    ),
  );

  await assert.rejects(client().searchCodes({ q: "ahorro" }), (error) => {
    assert.ok(error instanceof RateLimitError);
    assert.equal(error.group, "data");
    assert.equal(error.retryAfter, 30);
    return true;
  });
});

test("quota_exceeded has no group", async () => {
  fakeFetch(() =>
    json(429, { detail: { error: "quota_exceeded", message: "Sin cupo.", remaining: 0, reset_at: null } }),
  );

  await assert.rejects(client().askV2({ query: "¿Altura libre mínima?" }), (error) => {
    assert.ok(error instanceof RateLimitError);
    assert.equal(error.code, "quota_exceeded");
    assert.equal(error.group, undefined);
    return true;
  });
});

test("a 402 on /v1 is an InsufficientCreditsError with available and required from the root", async () => {
  const problem = {
    type: "https://docs.normatia.com/api-reference/errores/#insufficient_credits",
    title: "Sin créditos",
    status: 402,
    detail: "No quedan créditos para esta llamada: recarga en normatia.com.",
    code: "insufficient_credits",
    available: 0.05,
    required: 1,
    request_id: "req_402",
  };
  fakeFetch(() => json(402, problem, { "Content-Type": "application/problem+json", "X-Request-Id": "req_402" }));

  await assert.rejects(client().getParcel("9872023VH5797S", { include: ["constraints"] }), (error) => {
    assert.ok(error instanceof InsufficientCreditsError);
    assert.ok(error instanceof NormatiaError);
    assert.equal(error.statusCode, 402);
    assert.equal(error.code, "insufficient_credits");
    assert.equal(error.available, 0.05);
    assert.equal(error.required, 1);
    assert.equal(error.requestId, "req_402");
    assert.equal(error.message, problem.detail);
    assert.deepEqual(error.body, problem);
    return true;
  });
});

test("a 402 on /api/v2/ask reads its fields from detail", async () => {
  fakeFetch(() =>
    json(402, {
      detail: {
        error: "insufficient_credits",
        message: "No quedan créditos para esta consulta: recarga en normatia.com.",
        available: 3,
        required: 5,
      },
    }),
  );

  await assert.rejects(client().askV2({ query: "¿Altura libre mínima?" }), (error) => {
    assert.ok(error instanceof InsufficientCreditsError);
    assert.equal(error.available, 3);
    assert.equal(error.required, 5);
    assert.equal(error.limit, undefined);
    return true;
  });
});

test("member_limit_reached is a 402 with limit and spent", async () => {
  fakeFetch(() =>
    json(402, {
      detail: {
        error: "member_limit_reached",
        message: "Has llegado a tu límite mensual de créditos en esta organización.",
        limit: 100,
        spent: 98,
      },
    }),
  );

  await assert.rejects(client().askV2({ query: "¿Altura libre mínima?" }), (error) => {
    assert.ok(error instanceof InsufficientCreditsError);
    assert.equal(error.code, "member_limit_reached");
    assert.equal(error.limit, 100);
    assert.equal(error.spent, 98);
    return true;
  });
});

test("the retired verify and ask throw RetiredEndpointError", async () => {
  const calls = fakeFetch(() =>
    json(410, {
      detail: {
        error: "endpoint_retired",
        message: "Esta ruta se ha retirado. Para preguntar, usa POST /api/v2/ask o la herramienta ask del MCP.",
        docs: "https://docs.normatia.com",
      },
    }),
  );

  await assert.rejects(
    client().verify({ element: "ventana", parameter: "U", value: 2.3, unit: "W/m2K", geo_id: "ES-41091" }),
    (error) => {
      assert.ok(error instanceof RetiredEndpointError);
      assert.ok(error instanceof NormatiaError);
      assert.equal(error.statusCode, 410);
      assert.equal(error.code, "endpoint_retired");
      return true;
    },
  );
  await assert.rejects(client().ask({ query: "¿Altura libre mínima?" }), RetiredEndpointError);
  assert.deepEqual(
    calls.map(({ url }) => url.pathname),
    ["/api/v1/verify", "/api/v1/ask"],
  );
});

test("every API error keeps the whole body", async () => {
  const body = { detail: { error: "project_not_found", message: "No existe ese proyecto." } };
  fakeFetch(() => json(404, body));

  await assert.rejects(client().getProjectInfo("3f8c1a90-5b2e-4d77-9d21-0e5f4a6c8b13"), (error) => {
    assert.equal(error.code, "project_not_found");
    assert.deepEqual(error.detail, body.detail);
    assert.deepEqual(error.body, body);
    return true;
  });
});

test("getUsage returns the balance and decimal credits", async () => {
  const usage = {
    scope: "organization",
    organization_id: "org",
    from: "2026-11-01",
    to: "2026-11-22",
    totals: { calls: 12, credits: 6.1, errors: 0 },
    by_endpoint: [],
    by_day: [],
    this_key: { calls: 12, credits: 6.1, errors: 0 },
    quota: { unlimited: true, remaining: null, resets_at: null },
    balance: {
      credits: 93.9,
      plan_credits: 43.9,
      purchased_credits: 50,
      reserved: 0,
      available: 93.9,
      mode: "standard",
      plan_credits_expire_at: "2026-12-21T00:00:00Z",
    },
  };
  fakeFetch(() => json(200, usage));

  const result = await client().getUsage();

  assert.equal(result.totals.credits, 6.1);
  assert.equal(result.balance?.available, 93.9);
});
