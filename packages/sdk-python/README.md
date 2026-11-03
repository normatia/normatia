# normatia

Python client for the [Normatia API](https://docs.normatia.com): Spanish parcels with their constraints and planning,
municipalities with their technical data, and regulations as data, article by article.

```bash
pip install normatia
```

```python
from normatia import Normatia

client = Normatia()  # reads NORMATIA_API_KEY

parcel = client.get_parcel("6963301TG3466N", include=["constraints", "zoning"])
for layer in parcel["constraints"]["layers"]:
    if layer["affected"]:  # None is "no data", never "not affected"
        print(layer["layer"], layer["summary"])

place = client.get_place("ES-41091")
print(place["technical_data"]["climate_zone"])  # {'value': 'B4', 'source': {'citation': 'CTE DB-HE, Anejo B', ...}}

for regulation in client.iter_regulations(place="ES-41091", scope="municipal"):
    print(regulation["slug"], regulation["current_version"]["curated"])
```

Async, with the same methods:

```python
from normatia import AsyncNormatia

async with AsyncNormatia() as client:
    me = await client.get_me()
```

## Addresses

`find_parcels_by_address` gives the parcels of a written address, from the entrances of the Cadastre and CartoCiudad,
with what was understood (`interpreted`). `exact` is true when the address leads to one parcel without doubt; otherwise
`reason` says why (`ambiguous`, `no_candidates`, `not_understood`...) and `data` holds the candidates, each with its
`confidence` and `match`. Without the municipality it is never exact: write it, or pass `province=` (`ES-28` or its
name). `suggest_addresses` is the autocomplete while the user types (3 characters or more): streets and, once the text
has a number, entrances with the reference of their parcel.

```python
found = client.find_parcels_by_address("Calle Mayor 5, Madrid")
if found["exact"]:
    parcel = client.get_parcel(found["data"][0]["ref"], include=["zoning"])
else:
    print(found["reason"], [c["address"] for c in found["data"]], found["suggestions"])

for suggestion in client.suggest_addresses("Hermosilla 4", limit=5)["data"]:
    print(suggestion["type"], suggestion["text"], suggestion["ref"])  # "address" ones carry the parcel's ref
```

## Sandbox keys

A sandbox key (`sk-normatia-test-...`, from Mi cuenta > Claves API > Clave de prueba) works with the same client and
needs no API activation: it answers with about fifty fixed parcels and the public catalog, without quota.
`client.get_sandbox()` lists the parcels; `client.is_sandbox` tells which kind of key the client has.

## Errors

Every error is a `NormatiaError` with `status_code`, `code` (branch on it), `message`, `request_id` (send it to
support) and `retry_after`. By status: `AuthenticationError` (401), `ForbiddenError` (403), `NotFoundError` (404),
`ValidationError` (422), `RateLimitError` (429), `ServiceUnavailableError` (503) and `APIError` (the rest).

```python
from normatia import NotFoundError

try:
    client.get_parcel("4141412VG4444S")
except NotFoundError as e:
    print(e.code, e.request_id)  # parcel_not_found, req_...
```

GET requests are retried twice on 429 `rate_limit_exceeded`, 502, 503, 504 and network errors, waiting `Retry-After`
when the API sends it (`max_retries=` to change it). `ask` and `verify` spend a credit and are never retried.

Besides the limits of each key, the data routes and the MCP server have one for the whole organization, adding up all
its keys (`get_me()["rate_limits"]["organization_per_minute"]`). On a 429 `rate_limit_exceeded`, `RateLimitError.group`
says which one was hit: the key's (`data`, `intelligence`, `mcp`) or `organization`.

## Methods

| Method | Route |
|---|---|
| `get_me()`, `get_usage(from_date=, to_date=)`, `list_keys()`, `revoke_key(id)` | `/v1/me`, `/v1/usage`, `/v1/keys` |
| `get_parcel(ref, include=[...])`, `find_parcels_at_point(lat, lon)`, `get_sandbox()` | `/v1/parcels`, `/v1/sandbox` |
| `find_parcels_by_address(address, province=)`, `suggest_addresses(q, limit=)` | `/v1/parcels?address=`, `/v1/addresses` |
| `list_layers()`, `get_coverage(place)` | `/v1/layers`, `/v1/coverage` |
| `find_places(q, level=, within=)`, `get_place(place)` | `/v1/places` |
| `list_regulations(...)`, `iter_regulations(...)`, `get_regulation(slug)`, `get_regulation_contents(slug)`, `get_regulation_section(slug, section)` | `/v1/regulations` |
| `ask(query, project_id=)`, `verify(element=, parameter=, value=, unit=, geo_id=)` | `/api/v2/ask`, `/api/v1/verify` (one credit each) |

Responses are plain dicts, typed with `TypedDict` for editors (`normatia.types`).

## License

MIT
