const HttpRequest = require('./request.http');
const HttpResponse = require('./response.http');
const HttpErrors = require('./errors.http');
const ErrorHandler = require('./error.handler.htttp');


class Http {

  static get Request() {
    return HttpRequest;
  }

  static get Response() {
    return HttpResponse;
  }

  static get Errors() {
    return HttpErrors;
  }

  static get ErrorHandler() {
    return ErrorHandler;
  }


  static setupErrorHandling(app) {
    // Handle 404 errors for undefined routes
    app.use(ErrorHandler.notFoundHandler);

    // Handle all other errors
    app.use(ErrorHandler.errorHandler);
  }
}

module.exports = Http;