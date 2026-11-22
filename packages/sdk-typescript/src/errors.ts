/**
 * Base error for every failure the SDK reports.
 *
 * The API answers errors in two formats. The `/v1` routes send RFC 9457 problems,
 * `{"code": "<code>", "detail": "<message>", ...}`, with any extra field (`available`, `required`, `limit`...) at the
 * root. The `/api/v1` and `/api/v2` routes send `{"detail": {"error": "<code>", "message": "...", ...}}`, with the
 * extra fields inside `detail`. `code` holds the machine-readable code in both cases (for example
 * `insufficient_credits` or `project_not_found`): branch on it, not on the message, which may be in English or
 * Spanish. `detail` keeps the raw `detail` value of the body and `body` the whole decoded body, so the extra fields are
 * always readable.
 */
export class NormatiaError extends Error {
  public readonly statusCode: number;
  public readonly code?: string;
  public readonly detail?: unknown;
  /** The `X-Request-Id` of the response. Include it when you contact support. */
  public readonly requestId?: string;
  /** The whole decoded response body, as the API sent it. Undefined for errors raised before a request. */
  public readonly body?: unknown;

  constructor(
    message: string,
    statusCode: number,
    detail?: unknown,
    code?: string,
    requestId?: string,
    body?: unknown,
  ) {
    super(message);
    this.name = new.target.name;
    this.statusCode = statusCode;
    this.detail = detail;
    this.code = code;
    this.requestId = requestId;
    this.body = body;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** 401: missing, malformed, unknown or revoked API key. */
export class AuthenticationError extends NormatiaError {
  constructor(
    message = "Authentication failed. Check your API key.",
    detail?: unknown,
    code?: string,
    requestId?: string,
    body?: unknown,
  ) {
    super(message, 401, detail, code, requestId, body);
  }
}

/** 403: for example `insufficient_scope`, when the key lacks the scope of the route. */
export class ForbiddenError extends NormatiaError {
  constructor(
    message = "Access forbidden for this API key.",
    detail?: unknown,
    code?: string,
    requestId?: string,
    body?: unknown,
  ) {
    super(message, 403, detail, code, requestId, body);
  }
}

/** 404: the geo_id, code, version or project does not exist (or is not accessible). */
export class NotFoundError extends NormatiaError {
  constructor(
    message = "Requested resource was not found.",
    detail?: unknown,
    code?: string,
    requestId?: string,
    body?: unknown,
  ) {
    super(message, 404, detail, code, requestId, body);
  }
}

/** Read a numeric field from the `detail` object (`/api` routes) or the root of the body (`/v1` problems). */
function numberField(name: string, detail: unknown, body: unknown): number | undefined {
  for (const source of [detail, body]) {
    if (typeof source === "object" && source !== null && !Array.isArray(source)) {
      const value = (source as Record<string, unknown>)[name];
      if (typeof value === "number" && Number.isFinite(value)) {
        return value;
      }
    }
  }
  return undefined;
}

/**
 * 402: the organization's balance does not cover the call (`insufficient_credits`, with `available` and `required`),
 * or the member reached their monthly credit limit in the organization (`member_limit_reached`, with `limit` and
 * `spent`). Nothing was charged. Credits are bought on normatia.com.
 */
export class InsufficientCreditsError extends NormatiaError {
  /** Credits the organization can spend right now, on `insufficient_credits`. */
  public readonly available?: number;
  /** Credits the call needed, on `insufficient_credits`. */
  public readonly required?: number;
  /** The member's monthly credit limit, on `member_limit_reached`. */
  public readonly limit?: number;
  /** Credits the member already spent this month, on `member_limit_reached`. */
  public readonly spent?: number;

  constructor(
    message = "Not enough credits for this call.",
    detail?: unknown,
    code?: string,
    requestId?: string,
    body?: unknown,
  ) {
    super(message, 402, detail, code, requestId, body);
    this.available = numberField("available", detail, body);
    this.required = numberField("required", detail, body);
    this.limit = numberField("limit", detail, body);
    this.spent = numberField("spent", detail, body);
  }
}

/**
 * 410 `endpoint_retired`: the route no longer exists. `POST /api/v1/ask` and `POST /api/v1/verify` were retired on
 * 21 November 2026; ask with `askV2` instead.
 */
export class RetiredEndpointError extends NormatiaError {
  constructor(
    message = "This endpoint has been retired.",
    detail?: unknown,
    code?: string,
    requestId?: string,
    body?: unknown,
  ) {
    super(message, 410, detail, code, requestId, body);
  }
}

/**
 * 429: `rate_limit_exceeded` (a per-minute limit; wait `retryAfter` seconds). `quota_exceeded` belongs to the monthly
 * query allowance of the plans before credits: with credits it is no longer sent, and running out of credits is a 402
 * ({@link InsufficientCreditsError}).
 */
export class RateLimitError extends NormatiaError {
  /** Seconds to wait before retrying, from the `Retry-After` header. */
  public readonly retryAfter?: number;
  /**
   * Which per-minute limit was hit on `rate_limit_exceeded`: the key's own (`data`, `intelligence`, `mcp`) or
   * `organization`, the one shared by every key of the organization (`rate_limits.organization_per_minute` in
   * `getMe`). Undefined on `quota_exceeded`.
   */
  public readonly group?: "data" | "intelligence" | "mcp" | "organization" | string;

  constructor(
    message = "Rate limit exceeded. Please retry later.",
    detail?: unknown,
    code?: string,
    requestId?: string,
    retryAfter?: number,
    group?: string,
    body?: unknown,
  ) {
    super(message, 429, detail, code, requestId, body);
    this.retryAfter = retryAfter;
    this.group = group;
  }
}

/** 422 from the API, or a request the SDK rejects before sending it. */
export class ValidationError extends NormatiaError {
  constructor(
    message = "Request validation failed.",
    detail?: unknown,
    code?: string,
    requestId?: string,
    body?: unknown,
  ) {
    super(message, 422, detail, code, requestId, body);
  }
}
