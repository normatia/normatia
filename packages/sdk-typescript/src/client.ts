import {
  AuthenticationError,
  ForbiddenError,
  NormatiaError,
  NotFoundError,
  RateLimitError,
  ValidationError,
} from "./errors";
import type {
  AskRequest,
  AskResponse,
  AskV2Request,
  AskV2Response,
  CodeDetail,
  CodeResult,
  CodeSearchParams,
  CodeVersionDetail,
  DocumentVersion,
  LocationDetail,
  LocationResult,
  LocationSearchParams,
  NormatiaConfig,
  PaginatedResponse,
  ProjectInfoResponse,
  ProjectListResponse,
  VerifyRequest,
  VerifyResponse,
} from "./types";

/**
 * A turn of the agentic engine is capped server-side at 120 s. The client waits
 * longer on purpose: aborting early does not stop the turn, it just spends the
 * credit and throws the answer away.
 */
const ASK_V2_TIMEOUT_MS = 150_000;

type QueryValue = string | number | boolean | undefined | null;
type QueryParams = Record<string, QueryValue>;

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

  async getLocation(geoId: string): Promise<LocationDetail> {
    const normalizedGeoId = this.requireNonEmptyString(geoId, "geoId");

    return this._request<LocationDetail>(`/api/v1/location/${encodeURIComponent(normalizedGeoId)}`);
  }

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

  async getCode(slug: string): Promise<CodeDetail> {
    const normalizedSlug = this.requireNonEmptyString(slug, "slug");

    return this._request<CodeDetail>(`/api/v1/codes/${encodeURIComponent(normalizedSlug)}`);
  }

  async getCodeVersions(slug: string): Promise<PaginatedResponse<DocumentVersion>> {
    const normalizedSlug = this.requireNonEmptyString(slug, "slug");

    return this._request<PaginatedResponse<DocumentVersion>>(
      `/api/v1/codes/${encodeURIComponent(normalizedSlug)}/versions`,
    );
  }

  async getCodeVersion(slug: string, version: string): Promise<CodeVersionDetail> {
    const normalizedSlug = this.requireNonEmptyString(slug, "slug");
    const normalizedVersion = this.requireNonEmptyString(version, "version");

    return this._request<CodeVersionDetail>(
      `/api/v1/codes/${encodeURIComponent(normalizedSlug)}/versions/${encodeURIComponent(normalizedVersion)}`,
    );
  }

  /**
   * @deprecated Calls the frozen `POST /api/v1/ask` — a single semantic search
   * over the active project, with no tools, project memory or calculations.
   * Kept for existing integrations; it will be removed in a future release.
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
   * Consumes 1 credit per call, however many searches the agent runs.
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
   * which one is active. Free — does not consume quota.
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
   * Omit `projectId` to describe the user's active project. Free — does not
   * consume quota.
   */
  async getProjectInfo(projectId?: string): Promise<ProjectInfoResponse> {
    return this._request<ProjectInfoResponse>("/api/v1/project/info", {
      method: "GET",
      query: { project_id: projectId },
    });
  }

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

  private async _request<T>(
    path: string,
    options: {
      method?: "GET" | "POST";
      query?: QueryParams;
      body?: unknown;
      headers?: HeadersInit;
      timeoutMs?: number;
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
      throw this.mapError(response.status, payload);
    }

    if (payload === undefined) {
      throw new NormatiaError("API returned an empty response body.", response.status);
    }

    return payload as T;
  }

  private mapError(statusCode: number, payload: unknown): NormatiaError {
    const detail = this.extractDetail(payload);
    const message =
      this.extractMessage(payload) ??
      (statusCode > 0
        ? `Normatia API request failed with status ${statusCode}.`
        : "Normatia API request failed.");

    switch (statusCode) {
      case 401:
        return new AuthenticationError(message, detail);
      case 403:
        return new ForbiddenError(message, detail);
      case 404:
        return new NotFoundError(message, detail);
      case 422:
        return new ValidationError(message, detail);
      case 429:
        return new RateLimitError(message, detail);
      default:
        return new NormatiaError(message, statusCode, detail);
    }
  }

  private extractMessage(payload: unknown): string | undefined {
    if (!this.isRecord(payload)) {
      return undefined;
    }

    if (typeof payload.message === "string") {
      return payload.message;
    }

    const nestedError = payload.error;
    if (this.isRecord(nestedError) && typeof nestedError.message === "string") {
      return nestedError.message;
    }

    return undefined;
  }

  private extractDetail(payload: unknown): unknown {
    if (!this.isRecord(payload)) {
      return payload;
    }

    if ("detail" in payload) {
      return payload.detail;
    }

    const nestedError = payload.error;
    if (this.isRecord(nestedError) && "details" in nestedError) {
      return nestedError.details;
    }

    return payload;
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
