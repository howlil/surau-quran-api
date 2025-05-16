class HttpResponse {

  static success(res, data = null, message = 'Success', statusCode = 200) {
    return res.status(statusCode).json({
      success: true,
      message,
      data,
    });
  }


  static created(res, data, message = 'Resource created successfully') {
    return this.success(res, data, message, 201);
  }


  static noContent(res, message = 'No content') {
    return this.success(res, null, message, 204);
  }


  static badRequest(res, message = 'Bad request', errors = null) {
    return res.status(400).json({
      success: false,
      message,
      errors,
    });
  }


  static unauthorized(res, message = 'Unauthorized') {
    return res.status(401).json({
      success: false,
      message,
    });
  }


  static forbidden(res, message = 'Forbidden') {
    return res.status(403).json({
      success: false,
      message,
    });
  }


  static notFound(res, message = 'Resource not found') {
    return res.status(404).json({
      success: false,
      message,
    });
  }


  static methodNotAllowed(res, message = 'Method not allowed') {
    return res.status(405).json({
      success: false,
      message,
    });
  }


  static conflict(res, message = 'Conflict with current state') {
    return res.status(409).json({
      success: false,
      message,
    });
  }


  static validationError(res, message = 'Validation failed', errors = null) {
    return res.status(422).json({
      success: false,
      message,
      errors,
    });
  }


  static serverError(res, message = 'Internal server error', error = null) {
    if (error) {
      console.error('Server Error:', error);
    }

    return res.status(500).json({
      success: false,
      message,
    });
  }


  static serviceUnavailable(res, message = 'Service unavailable') {
    return res.status(503).json({
      success: false,
      message,
    });
  }
}

module.exports = HttpResponse;