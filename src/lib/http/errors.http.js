class HttpError extends Error {

  constructor(message, statusCode, data = null) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.data = data;
    Error.captureStackTrace(this, this.constructor);
  }
}

class BadRequestError extends HttpError {
  constructor(message = 'Bad Request', data = null) {
    super(message, 400, data);
  }
}

class UnauthorizedError extends HttpError {
  constructor(message = 'Unauthorized', data = null) {
    super(message, 401, data);
  }
}


class ForbiddenError extends HttpError {
  constructor(message = 'Forbidden', data = null) {
    super(message, 403, data);
  }
}


class NotFoundError extends HttpError {
  constructor(message = 'Resource not found', data = null) {
    super(message, 404, data);
  }
}


class MethodNotAllowedError extends HttpError {
  constructor(message = 'Method not allowed', data = null) {
    super(message, 405, data);
  }
}

class ConflictError extends HttpError {
  constructor(message = 'Conflict with current state', data = null) {
    super(message, 409, data);
  }
}

class ValidationError extends HttpError {
  constructor(message = 'Validation failed', data = null) {
    super(message, 422, data);
  }
}


class ServerError extends HttpError {
  constructor(message = 'Internal server error', data = null) {
    super(message, 500, data);
  }
}


class ServiceUnavailableError extends HttpError {
  constructor(message = 'Service unavailable', data = null) {
    super(message, 503, data);
  }
}

module.exports = {
  HttpError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  MethodNotAllowedError,
  ConflictError,
  ValidationError,
  ServerError,
  ServiceUnavailableError
};