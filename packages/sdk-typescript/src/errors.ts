export class NormatiaError extends Error {
  public readonly statusCode: number;
  public readonly detail?: unknown;

  constructor(message: string, statusCode: number, detail?: unknown) {
    super(message);
    this.name = new.target.name;
    this.statusCode = statusCode;
    this.detail = detail;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class AuthenticationError extends NormatiaError {
  constructor(message = "Authentication failed. Check your API key.", detail?: unknown) {
    super(message, 401, detail);
  }
}

export class ForbiddenError extends NormatiaError {
  constructor(message = "Access forbidden for this API key and country scope.", detail?: unknown) {
    super(message, 403, detail);
  }
}

export class NotFoundError extends NormatiaError {
  constructor(message = "Requested resource was not found.", detail?: unknown) {
    super(message, 404, detail);
  }
}

export class RateLimitError extends NormatiaError {
  constructor(message = "Rate limit exceeded. Please retry later.", detail?: unknown) {
    super(message, 429, detail);
  }
}

export class ValidationError extends NormatiaError {
  constructor(message = "Request validation failed.", detail?: unknown) {
    super(message, 422, detail);
  }
}
