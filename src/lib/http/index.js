const HttpRequest = require('./HttpRequest');
const HttpResponse = require('./HttpResponse');
const HttpErrors = require('./HttpErrors');
const ErrorHandler = require('./ErrorHandler');


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