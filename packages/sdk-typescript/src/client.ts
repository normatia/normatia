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
  VerifyRequest,
  VerifyResponse,
} from "./types";

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

  async ask(request: AskRequest): Promise<AskResponse> {
    this.requireNonEmptyString(request.query, "query");

    return this._request<AskResponse>("/api/v1/ask", {
      method: "POST",
      body: request,
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
