import {
  AuthenticationError,
  ForbiddenError,
  InsufficientCreditsError,
  NormatiaError,
  NotFoundError,
  RateLimitError,
  RetiredEndpointError,
  ValidationError,
} from "./errors";
import type {
  AddressSuggestions,
  AskRequest,
  AskResponse,
  AskV2Request,
  AskV2Response,
  CodeDetail,
  CodeResult,
  CodeSearchParams,
  LocationDetail,
  LocationResult,
  LocationSearchParams,
  KeyListItem,
  MeResponse,
  NormatiaConfig,
  Parcel,
  ParcelInclude,
  ParcelsAtAddress,
  ParcelsAtPoint,
  Coverage,
  Layer,
  Place,
  PlaceDetail,
  PlaceSearchParams,
  SandboxInfo,
  RegulationContents,
  RegulationDetail,
  RegulationList,
  RegulationListParams,
  RegulationSection,
  PaginatedResponse,
  ProjectInfoResponse,
  ProjectListResponse,
  UsageParams,
  UsageResponse,
  VerifyRequest,
  VerifyResponse,
} from "./types";

/**
 * A turn of the agentic engine is capped server-side at 120 s. The client waits
 * longer on purpose: aborting early does not stop the turn, it just spends the
 * credits and throws the answer away.
 */
const ASK_V2_TIMEOUT_MS = 150_000;

type QueryValue = string | number | boolean | undefined | null;
type QueryParams = Record<string, QueryValue>;

/**
 * The Normatia API client.
 *
 * Calls are paid with the credits of the key's organization, and only the ones that succeed: `askV2` costs 5 credits
 * (nothing if it fails), a parcel with `constraints` or `zoning` 1, and every other data call 0.1. The account, the
 * keys, the layers, the coverage, the sandbox and the projects are free. A test key (`sk-normatia-test-`) spends
 * nothing, and the Team plan deducts nothing. Without enough credits the API answers 402 and the client throws
 * {@link InsufficientCreditsError}. The balance is in `getUsage()` and `getMe()`, under `balance`.
 */
export class NormatiaClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: NormatiaConfig) {
    if (!config || typeof config.apiKey !== "string" || config.apiKey.trim().length === 0) {
      throw new TypeError("NormatiaClient requires a non-empty apiKey.");
    }

    this.apiKey = config.apiKey.trim();
    this.baseUrl = (config.baseUrl ?? "https://api.normatia.com").replace(/\/+$/, "");
  }

  /** Countries, regions, provinces and municipalities by name (case- and accent-insensitive). 0.1 credits. */
  async searchLocations(params: LocationSearchParams): Promise<{ results: LocationResult[] }> {
    const q = this.requireNonEmptyString(params.q, "q");

    return this._request<{ results: LocationResult[] }>("/api/v1/location/search", {
      method: "GET",
      query: {
        q,
        level: params.level,
        ancestor_id: params.ancestor_id,
      },
    });
  }

  /** A location with its ancestors, its tech data and the regulations that apply to it. 0.1 credits. */
  async getLocation(geoId: string): Promise<LocationDetail> {
    const normalizedGeoId = this.requireNonEmptyString(geoId, "geoId");

    return this._request<LocationDetail>(`/api/v1/location/${encodeURIComponent(normalizedGeoId)}`);
  }

  /** The regulation catalog by title, scope or tag, paginated. 0.1 credits. */
  async searchCodes(params: CodeSearchParams = {}): Promise<PaginatedResponse<CodeResult>> {
    if (params.page !== undefined && (!Number.isInteger(params.page) || params.page < 1)) {
      throw new ValidationError("page must be an integer greater than or equal to 1.", {
        field: "page",
        value: params.page,
      });
    }

    if (
      params.page_size !== undefined &&
      (!Number.isInteger(params.page_size) || params.page_size < 1 || params.page_size > 50)
    ) {
      throw new ValidationError("page_size must be an integer between 1 and 50.", {
        field: "page_size",
        value: params.page_size,
      });
    }

    return this._request<PaginatedResponse<CodeResult>>("/api/v1/codes/search", {
      method: "GET",
      query: {
        q: params.q,
        normative_scope: params.normative_scope,
        tag: params.tag,
        page: params.page,
        page_size: params.page_size,
      },
    });
  }

  /** A regulation with all its versions, those in force first. 0.1 credits. */
  async getCode(slug: string): Promise<CodeDetail> {
    const normalizedSlug = this.requireNonEmptyString(slug, "slug");

    return this._request<CodeDetail>(`/api/v1/codes/${encodeURIComponent(normalizedSlug)}`);
  }

  /**
   * @deprecated Retired. `POST /api/v1/ask` was retired on 21 November 2026 and
   * answers 410 `endpoint_retired`, so this method throws
   * {@link RetiredEndpointError}. It stays so that existing code still compiles.
   * Use {@link NormatiaClient.askV2} instead.
   */
  async ask(request: AskRequest): Promise<AskResponse> {
    this.requireNonEmptyString(request.query, "query");

    return this._request<AskResponse>("/api/v1/ask", {
      method: "POST",
      body: request,
    });
  }

  /**
   * Ask a regulatory question through Normatia's agentic engine.
   *
   * Runs the same agent loop as the chat on normatia.com: it chains several
   * searches, reads the project's recorded facts and saved calculations,
   * consults uploaded documents and cites every source with `[N]` markers that
   * match `sources[].index`.
   *
   * The scope comes from the project, so there is no geography or code filter.
   * Omit `project_id` to use the user's active project; pass one from
   * {@link NormatiaClient.listProjects} to query any other, without changing
   * what the user sees on the website.
   *
   * Costs 5 credits, however many searches the agent runs, and nothing if it
   * fails or does not answer. Without enough credits it throws
   * {@link InsufficientCreditsError} (402) before running.
   */
  async askV2(request: AskV2Request): Promise<AskV2Response> {
    this.requireNonEmptyString(request.query, "query");

    return this._request<AskV2Response>("/api/v2/ask", {
      method: "POST",
      body: request,
      timeoutMs: ASK_V2_TIMEOUT_MS,
    });
  }

  /**
   * List the projects this key can query, with their `project_id`, location and
   * which one is active. Free.
   */
  async listProjects(): Promise<ProjectListResponse> {
    return this._request<ProjectListResponse>("/api/v1/projects");
  }

  /**
   * Full context of a project: location and territory tech data, applicable
   * regulations with their current edition, regulations available but not
   * selected, uploaded and generated documents, recorded facts and saved
   * calculations.
   *
   * Omit `projectId` to describe the user's active project. Free.
   */
  async getProjectInfo(projectId?: string): Promise<ProjectInfoResponse> {
    return this._request<ProjectInfoResponse>("/api/v1/project/info", {
      method: "GET",
      query: { project_id: projectId },
    });
  }

  /**
   * @deprecated Retired. `POST /api/v1/verify` was retired on 21 November 2026
   * and answers 410 `endpoint_retired`, so this method throws
   * {@link RetiredEndpointError}. It stays so that existing code still compiles.
   * To check a value, ask the question with {@link NormatiaClient.askV2}.
   */
  async verify(request: VerifyRequest): Promise<VerifyResponse> {
    this.requireNonEmptyString(request.element, "element");
    this.requireNonEmptyString(request.parameter, "parameter");
    this.requireNonEmptyString(request.unit, "unit");
    this.requireNonEmptyString(request.geo_id, "geo_id");

    if (!Number.isFinite(request.value)) {
      throw new ValidationError("value must be a finite number.", {
        field: "value",
        value: request.value,
      });
    }

    return this._request<VerifyResponse>("/api/v1/verify", {
      method: "POST",
      body: request,
    });
  }

  /**
   * The key, its organization, what it has turned on (API and MCP), its
   * per-minute limits and the organization's credit balance (`balance`). The
   * first call to make when integrating: if it answers, the key works. Free.
   */
  async getMe(): Promise<MeResponse> {
    return this._request<MeResponse>("/v1/me");
  }

  /**
   * Calls and credits of the key's organization between two dates (UTC, both
   * included; YYYY-MM-DD), by endpoint and by day, with this key's share, and
   * the organization's credit balance (`balance`). Defaults to the current
   * month; at most 92 days per call. Free.
   */
  async getUsage(params: UsageParams = {}): Promise<UsageResponse> {
    return this._request<UsageResponse>("/v1/usage", {
      method: "GET",
      query: { from: params.from, to: params.to },
    });
  }

  /** The user's keys in the key's organization, active and revoked. Free. */
  async listKeys(): Promise<{ keys: KeyListItem[] }> {
    return this._request<{ keys: KeyListItem[] }>("/v1/keys");
  }

  /**
   * Revoke one of the user's keys, also the one making the call. It stops
   * working in under a minute on every route and on the MCP server, and it
   * cannot be undone. A test key or one with limited scopes can only revoke
   * itself.
   */
  async revokeKey(keyId: string): Promise<void> {
    const id = this.requireNonEmptyString(keyId, "keyId");
    await this._request<void>(`/v1/keys/${encodeURIComponent(id)}`, { method: "DELETE", emptyBody: true });
  }

  /**
   * A parcel by its cadastral reference (14 characters, or the 20 of a unit),
   * from Normatia's territorial database. Ask for more blocks in the same call
   * with `include`: constraints, zoning, buildings, geometry. A layer without
   * data comes back with `affected: null`, never as "not affected". Costs 1
   * credit with `constraints` or `zoning`, 0.1 without them.
   */
  async getParcel(ref: string, options: { include?: ParcelInclude[] } = {}): Promise<Parcel> {
    const normalizedRef = this.requireNonEmptyString(ref, "ref").replace(/\s+/g, "").toUpperCase();

    return this._request<Parcel>(`/v1/parcels/${encodeURIComponent(normalizedRef)}`, {
      method: "GET",
      query: { include: options.include?.length ? options.include.join(",") : undefined },
    });
  }

  /**
   * The parcel containing a point (WGS84 latitude and longitude) or, if it
   * falls in none, those within 50 m, nearest first. An empty list means no
   * parcel nearby (the sea, a large square) or a territory not in the base.
   * 0.1 credits.
   */
  async findParcelsAtPoint(lat: number, lon: number): Promise<ParcelsAtPoint> {
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      throw new ValidationError("lat and lon must be finite numbers.", { lat, lon });
    }

    return this._request<ParcelsAtPoint>("/v1/parcels", { method: "GET", query: { lat, lon } });
  }

  /**
   * The parcels of a written address ("Calle Mayor 5, Madrid", or "Polígono 3 Parcela 12, Arahal" for a rustic
   * parcel), from the entrances of the Cadastre and CartoCiudad. `exact` tells whether it leads to one parcel without
   * doubt; if not, `reason` says why and `data` holds the candidates. Without the municipality in the text it is
   * never exact. `province` (`ES-28` or its name) narrows the search when the text does not say it; an unknown
   * province answers `422 invalid_place`. 0.1 credits.
   */
  async findParcelsByAddress(address: string, options: { province?: string } = {}): Promise<ParcelsAtAddress> {
    return this._request<ParcelsAtAddress>("/v1/parcels", {
      method: "GET",
      query: {
        address: this.requireNonEmptyString(address, "address"),
        province: options.province?.trim() || undefined,
      },
    });
  }

  /**
   * Address autocomplete, while the user types (3 characters or more): the streets that start that way and, once the
   * text has a number, the entrances with the reference of their parcel. `limit` goes from 1 to 10 (6 by default).
   * 0.1 credits.
   */
  async suggestAddresses(q: string, options: { limit?: number } = {}): Promise<AddressSuggestions> {
    return this._request<AddressSuggestions>("/v1/addresses", {
      method: "GET",
      query: { q: this.requireNonEmptyString(q, "q"), limit: options.limit },
    });
  }

  /** Every constraint layer with its name, theme, mode and sources (license, attribution). Free. */
  async listLayers(): Promise<{ object: "list"; data: Layer[]; has_more: boolean }> {
    return this._request("/v1/layers");
  }

  /** What is loaded for a municipality (`ES-41091` or `41091`): cadastre, planning and each layer. Free. */
  async getCoverage(place: string): Promise<Coverage> {
    return this._request<Coverage>("/v1/coverage", {
      method: "GET",
      query: { place: this.requireNonEmptyString(place, "place") },
    });
  }

  /** The sandbox parcels (what a `sk-normatia-test-` key answers with), with the case each one covers. Free. */
  async getSandbox(): Promise<SandboxInfo> {
    return this._request<SandboxInfo>("/v1/sandbox");
  }

  /** Municipalities, provinces and regions by name (accent-insensitive) or INE code. 0.1 credits. */
  async findPlaces(params: PlaceSearchParams): Promise<{ object: "list"; data: Place[]; has_more: boolean }> {
    return this._request("/v1/places", {
      method: "GET",
      query: { q: this.requireNonEmptyString(params.q, "q"), level: params.level, within: params.within, limit: params.limit },
    });
  }

  /**
   * A place (`ES-41091` or `41091`); for a municipality, its location and technical data with their sources.
   * 0.1 credits.
   */
  async getPlace(place: string): Promise<PlaceDetail> {
    return this._request<PlaceDetail>(`/v1/places/${encodeURIComponent(this.requireNonEmptyString(place, "place"))}`);
  }

  /**
   * The regulation catalog with each current version, filtered by text, scope, tag or place. Cursor-paginated.
   * 0.1 credits.
   */
  async listRegulations(params: RegulationListParams = {}): Promise<RegulationList> {
    return this._request<RegulationList>("/v1/regulations", {
      method: "GET",
      query: { q: params.q, scope: params.scope, tag: params.tag, place: params.place, curated: params.curated, limit: params.limit, cursor: params.cursor },
    });
  }

  /** A regulation, its versions (with `has_text`) and its related documents (comments, guides). 0.1 credits. */
  async getRegulation(slug: string): Promise<RegulationDetail> {
    return this._request<RegulationDetail>(`/v1/regulations/${encodeURIComponent(this.requireNonEmptyString(slug, "slug"))}`);
  }

  /** The table of contents of a version (the current one if `version` is omitted). 0.1 credits. */
  async getRegulationContents(slug: string, options: { version?: string } = {}): Promise<RegulationContents> {
    return this._request<RegulationContents>(
      `/v1/regulations/${encodeURIComponent(this.requireNonEmptyString(slug, "slug"))}/contents`,
      { method: "GET", query: { version: options.version } },
    );
  }

  /** The text of one section, block by block, with stable slugs. `format: "html"` adds the formatted text. 0.1 credits. */
  async getRegulationSection(
    slug: string,
    section: string,
    options: { version?: string; format?: "text" | "html" } = {},
  ): Promise<RegulationSection> {
    const base = `/v1/regulations/${encodeURIComponent(this.requireNonEmptyString(slug, "slug"))}`;
    return this._request<RegulationSection>(
      `${base}/sections/${encodeURIComponent(this.requireNonEmptyString(section, "section"))}`,
      { method: "GET", query: { version: options.version, format: options.format } },
    );
  }

  private async _request<T>(
    path: string,
    options: {
      method?: "GET" | "POST" | "DELETE";
      query?: QueryParams;
      body?: unknown;
      headers?: HeadersInit;
      timeoutMs?: number;
      /** The route answers 204 with no body (DELETE /v1/keys/{id}). */
      emptyBody?: boolean;
    } = {},
  ): Promise<T> {
    const url = new URL(path, `${this.baseUrl}/`);

    if (options.query) {
      for (const [key, value] of Object.entries(options.query)) {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value));
        }
      }
    }

    const headers = new Headers(options.headers);
    headers.set("Accept", "application/json");
    headers.set("Authorization", `Bearer ${this.apiKey}`);

    let requestBody: string | undefined;
    if (options.body !== undefined) {
      headers.set("Content-Type", "application/json");
      requestBody = JSON.stringify(options.body);
    }

    let response: Response;
    try {
      response = await fetch(url.toString(), {
        method: options.method ?? "GET",
        headers,
        body: requestBody,
        signal:
          options.timeoutMs === undefined ? undefined : AbortSignal.timeout(options.timeoutMs),
      });
    } catch (error: unknown) {
      throw new NormatiaError("Network request failed.", 0, error);
    }

    const text = await response.text();
    let payload: unknown = undefined;

    if (text.length > 0) {
      try {
        payload = JSON.parse(text) as unknown;
      } catch {
        if (response.ok) {
          throw new NormatiaError("API response was not valid JSON.", response.status, text);
        }

        payload = { message: text };
      }
    }

    if (!response.ok) {
      throw this.mapError(response.status, response.statusText, payload, response.headers);
    }

    if (payload === undefined) {
      if (options.emptyBody) {
        return undefined as T;
      }
      throw new NormatiaError("API returned an empty response body.", response.status);
    }

    return payload as T;
  }

  /**
   * Build a typed error from an API error response.
   *
   * The `/api/v1` and `/api/v2` routes wrap their errors in `detail`:
   * `{"detail": {"error": "<code>", "message": "...", ...}}`. Validation errors
   * send `detail` as a list, an unknown route sends `{"detail": "Not Found"}`,
   * and the MCP gateway puts `error`/`message` at the root. The `/v1` routes
   * answer RFC 9457 problems: `{"code": "<code>", "detail": "<message>", ...}`,
   * with their extra fields at the root. The message falls back in that order
   * and ends at the HTTP status text. Every error keeps the whole body in
   * `body`.
   */
  private mapError(statusCode: number, statusText: string, payload: unknown, headers?: Headers): NormatiaError {
    const body = this.isRecord(payload) ? payload : undefined;
    const detail = body && "detail" in body ? body.detail : payload;
    const nested = this.isRecord(detail) && !Array.isArray(detail) ? detail : undefined;

    const code = this.asString(nested?.error) ?? this.asString(body?.error) ?? this.asString(body?.code);
    const requestId =
      headers?.get("x-request-id") ?? this.asString(nested?.request_id) ?? this.asString(body?.request_id);
    const retryAfterHeader = Number.parseInt(headers?.get("retry-after") ?? "", 10);
    const retryAfter = Number.isFinite(retryAfterHeader) ? retryAfterHeader : undefined;
    const status = `${statusCode}${statusText ? ` ${statusText}` : ""}`;
    const message =
      this.asString(nested?.message) ??
      this.asString(body?.message) ??
      this.asString(detail) ??
      this.validationMessage(detail) ??
      (code ? `${code} (${status})` : undefined) ??
      (statusCode > 0
        ? `Normatia API request failed with status ${status}.`
        : "Normatia API request failed.");

    switch (statusCode) {
      case 401:
        return new AuthenticationError(message, detail, code, requestId, payload);
      case 402:
        // `available` and `required` (or `limit` and `spent`): in `detail` on the /api routes, at the root on /v1.
        return new InsufficientCreditsError(message, detail, code, requestId, payload);
      case 403:
        return new ForbiddenError(message, detail, code, requestId, payload);
      case 404:
        return new NotFoundError(message, detail, code, requestId, payload);
      case 410:
        return new RetiredEndpointError(message, detail, code, requestId, payload);
      case 422:
        return new ValidationError(message, detail, code, requestId, payload);
      case 429:
        // In `detail` on the /api routes, at the root of the problem on /v1.
        return new RateLimitError(
          message,
          detail,
          code,
          requestId,
          retryAfter,
          this.asString(nested?.group) ?? this.asString(body?.group),
          payload,
        );
      default:
        return new NormatiaError(message, statusCode, detail, code, requestId, payload);
    }
  }

  /** Summarise a FastAPI validation error list: `body.query: Field required`. */
  private validationMessage(detail: unknown): string | undefined {
    if (!Array.isArray(detail) || detail.length === 0) {
      return undefined;
    }

    const parts = detail.slice(0, 3).map((item) => {
      if (!this.isRecord(item)) {
        return String(item);
      }
      const loc = Array.isArray(item.loc) ? item.loc.join(".") : undefined;
      const msg = this.asString(item.msg) ?? "invalid value";
      return loc ? `${loc}: ${msg}` : msg;
    });

    return parts.join("; ");
  }

  private asString(value: unknown): string | undefined {
    return typeof value === "string" && value.trim().length > 0 ? value : undefined;
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
  }

  private requireNonEmptyString(value: string, fieldName: string): string {
    if (typeof value !== "string" || value.trim().length === 0) {
      throw new ValidationError(`${fieldName} is required and must be a non-empty string.`, {
        field: fieldName,
      });
    }

    return value.trim();
  }
}
