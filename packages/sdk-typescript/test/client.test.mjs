// The client against a fake fetch: requests, errors and the new address routes. No network.
// It tests the built package (dist), so `npm test` builds first.
import assert from "node:assert/strict";
import { afterEach, test } from "node:test";

import { NormatiaClient, RateLimitError, ValidationError } from "../dist/index.mjs";

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
