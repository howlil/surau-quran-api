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
    app.use(ErrorHandler.notFound);
    app.use(ErrorHandler.handleError);
  }
}

module.exports = Http;