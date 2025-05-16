const HttpResponse = require('./response.http');


class ErrorHandler {

  static notFound(req, res, next) {
    const error = new Error(`Route not found: ${req.originalUrl}`);
    error.statusCode = 404;
    next(error);
  }


  static handleError(err, req, res, next) {
    let message = err.message || 'Something went wrong';
    let statusCode = err.statusCode || 500;
    let errorData = err.data || null;

    console.error(`[ERROR] ${statusCode} - ${message}`);
    if (process.env.NODE_ENV !== 'production') {
      console.error(err.stack);
    }

    switch (statusCode) {
      case 400:
        return HttpResponse.badRequest(res, message, errorData);
      case 401:
        return HttpResponse.unauthorized(res, message);
      case 403:
        return HttpResponse.forbidden(res, message);
      case 404:
        return HttpResponse.notFound(res, message);
      case 405:
        return HttpResponse.methodNotAllowed(res, message);
      case 409:
        return HttpResponse.conflict(res, message);
      case 422:
        return HttpResponse.validationError(res, message, errorData);
      case 503:
        return HttpResponse.serviceUnavailable(res, message);
      default:
        return HttpResponse.serverError(res, message, process.env.NODE_ENV !== 'production' ? err : null);
    }
  }

  static asyncHandler(fn) {
    return (req, res, next) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };
  }
}

module.exports = ErrorHandler;