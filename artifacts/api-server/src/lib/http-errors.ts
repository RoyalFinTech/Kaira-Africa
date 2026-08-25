export class HttpError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export class UnauthorizedError extends HttpError {
  constructor(message = "Authentication required") {
    super(401, "unauthorized", message);
  }
}

export class ForbiddenError extends HttpError {
  constructor(message = "You do not have access to this resource") {
    super(403, "forbidden", message);
  }
}

export class NotFoundError extends HttpError {
  constructor(message = "Resource not found") {
    super(404, "not_found", message);
  }
}

export class ConflictError extends HttpError {
  constructor(message = "Resource already exists") {
    super(409, "conflict", message);
  }
}

export class BadRequestError extends HttpError {
  constructor(message = "Invalid request") {
    super(400, "bad_request", message);
  }
}
