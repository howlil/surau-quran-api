const PrismaErrorMiddleware = require('./prisma-error.middleware');
const ErrorHttp = require('../../lib/http/error.http');

class ErrorMiddleware {

    constructor() {
        this.createErrorResponse = ErrorMiddleware.createErrorResponse;
        this.expressErrorHandler = this.expressErrorHandler.bind(this);
    }

    expressErrorHandler(err, req, res, next) {
        try {
            if (err instanceof ErrorHttp) {
                return this.createErrorResponse(res, err.statusCode, err.message, err.error);
            }

            if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
                return this.createErrorResponse(res, 400, "Invalid JSON", {
                    message: "Request body contains invalid JSON",
                    details: err.message,
                    position: err.message.match(/position (\d+)/)?.[1] || 'unknown'
                });
            }

            const prismaError = PrismaErrorMiddleware.handlePrismaError(err);
            if (prismaError) {
                return this.createErrorResponse(res, prismaError.statusCode, prismaError.message, prismaError.error);
            }

            return this.createErrorResponse(res, 500, "Internal Server Error", this.cleanErrorMessage(err.message));

        } catch (error) {
            return this.createErrorResponse(res, 500, "Internal Server Error", error.message);
        }
    }

    cleanErrorMessage(message) {
        if (typeof message !== 'string') return message;

        return message
            .replace(/\u001b\[[0-9;]*m/g, '')
            .replace(/\u001b\[[0-9;]*[a-zA-Z]/g, '')
            .replace(/\u001b\[[0-9;]*[a-zA-Z]/g, '')
            .trim();
    }


    static createErrorResponse(res, statusCode, message, error) {
        return res.status(statusCode).json({
            success: false,
            message,
            error
        });
    }
}

module.exports = new ErrorMiddleware();