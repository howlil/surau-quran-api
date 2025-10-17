const ErrorHttp = require("../http/error.http");

class ErrorFactory {

    static badRequest(message) {
        return new ErrorHttp(400, message, "Bad Request");
    }

    static unauthorized(message) {
        return new ErrorHttp(401, message, "Unauthorized");
    }

    static forbidden(message) {
        return new ErrorHttp(403, message, "Forbidden");
    }

    static notFound(message) {
        return new ErrorHttp(404, message, "Not Found");
    }

    static internalServerError(message) {
        return new ErrorHttp(500, message, "Internal Server Error");
    }

    static validationError(message) {
        return new ErrorHttp(422, message, "Validation Error");
    }
}

module.exports = ErrorFactory;