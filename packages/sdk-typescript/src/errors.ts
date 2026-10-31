/**
 * Base error for every failure the SDK reports.
 *
 * The API sends its errors as `{"detail": {"error": "<code>", "message": "..."}}`.
 * `code` holds `detail.error` (for example `quota_exceeded` or `project_not_found`),
 * which is the field to branch on; `message` is human-readable and may be in
 * English or Spanish. `detail` keeps the raw `detail` value of the body, so extra
 * fields such as `remaining` or `reset_at` stay available.
 */
export class NormatiaError extends Error {
  public readonly statusCode: number;
  public readonly code?: string;
  public readonly detail?: unknown;

  constructor(message: string, statusCode: number, detail?: unknown, code?: string) {
    super(message);
    this.name = new.target.name;
    this.statusCode = statusCode;
    this.detail = detail;
    this.code = code;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** 401: missing, malformed, unknown or revoked API key. */
export class AuthenticationError extends NormatiaError {
  constructor(message = "Authentication failed. Check your API key.", detail?: unknown, code?: string) {
    super(message, 401, detail, code);
  }
}

/** 403: for example `plan_required`, when no organization of the user is on a paid plan. */
export class ForbiddenError extends NormatiaError {
  constructor(message = "Access forbidden for this API key.", detail?: unknown, code?: string) {
    super(message, 403, detail, code);
  }
}

/** 404: the geo_id, code, version or project does not exist (or is not accessible). */
export class NotFoundError extends NormatiaError {
  constructor(message = "Requested resource was not found.", detail?: unknown, code?: string) {
    super(message, 404, detail, code);
  }
}

/** 429: `rate_limit_exceeded` (per-minute limit) or `quota_exceeded` (credits used up). */
export class RateLimitError extends NormatiaError {
  constructor(message = "Rate limit exceeded. Please retry later.", detail?: unknown, code?: string) {
    super(message, 429, detail, code);
  }
}

/** 422 from the API, or a request the SDK rejects before sending it. */
export class ValidationError extends NormatiaError {
  constructor(message = "Request validation failed.", detail?: unknown, code?: string) {
    super(message, 422, detail, code);
  }
}
