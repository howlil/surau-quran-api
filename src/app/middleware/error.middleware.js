const PrismaErrorMiddleware = require('./prisma-error.middleware');
const ErrorHttp = require('../../lib/http/error.http');
const logger = require('../../lib/config/logger.config');

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

            if (err.message && err.message.includes('Midtrans')) {
                const cleanMessage = this.extractMidtransErrorMessage(err.message);
                return this.createErrorResponse(res, 400, "Payment Error", {
                    message: cleanMessage,
                    type: "payment_error"
                });
            }

            if (err.name === 'TypeError' && err.message.includes('Cannot destructure property')) {
                return this.createErrorResponse(res, 400, "Invalid Request Data", {
                    message: "Required data is missing or invalid",
                    details: err.message,
                    type: "validation_error"
                });
            }

            if (err.name === 'ValidationError') {
                return this.createErrorResponse(res, 400, "Validation Error", {
                    message: err.message,
                    type: "validation_error"
                });
            }

            logger.error('Unhandled error:', err);
            return this.createErrorResponse(res, 500, "Internal Server Error", {
                message: this.cleanErrorMessage(err.message),
                type: "internal_error",
                ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
            });

        } catch (error) {
            logger.error('Error in error handler:', error);
            return this.createErrorResponse(res, 500, "Internal Server Error", {
                message: error.message,
                type: "error_handler_failure"
            });
        }
    }

    extractMidtransErrorMessage(message) {
        try {
            const match = message.match(/API response: ({.*})/);
            if (match) {
                const apiResponse = JSON.parse(match[1]);
                if (apiResponse.error_messages && Array.isArray(apiResponse.error_messages)) {
                    return apiResponse.error_messages.join(', ');
                }
            }
            
            return this.cleanErrorMessage(message);
        } catch (e) {
            return this.cleanErrorMessage(message);
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
        const response = {
            success: false,
            message,
            statusCode
        };

        // Always include error details for better debugging
        if (error && typeof error === 'object') {
            response.error = error;
        } else if (error) {
            response.error = {
                message: error,
                type: "unknown_error"
            };
        }

        return res.status(statusCode).json(response);
    }
}

module.exports = new ErrorMiddleware();