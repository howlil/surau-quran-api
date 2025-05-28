const { Prisma } = require('@prisma/client');
const { logger } = require('../config/logger.config');

class HttpError extends Error {
    constructor(message, statusCode) {
        super(message);
        this.statusCode = statusCode;
    }
}

class BadRequestError extends HttpError {
    constructor(message = 'Bad Request') {
        super(message, 400);
    }
}

class UnauthorizedError extends HttpError {
    constructor(message = 'Unauthorized') {
        super(message, 401);
    }
}

class ForbiddenError extends HttpError {
    constructor(message = 'Forbidden') {
        super(message, 403);
    }
}

class NotFoundError extends HttpError {
    constructor(message = 'Not Found') {
        super(message, 404);
    }
}

class ConflictError extends HttpError {
    constructor(message = 'Conflict') {
        super(message, 409);
    }
}

const handlePrismaError = (error) => {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
        switch (error.code) {
            case 'P2002': return new ConflictError('Data sudah ada dalam sistem');
            case 'P2014': return new BadRequestError('ID tidak valid');
            case 'P2003': return new BadRequestError('Data terkait tidak ditemukan');
            case 'P2025': return new NotFoundError('Data tidak ditemukan');
            default: return new BadRequestError('Terjadi kesalahan pada database');
        }
    }

    if (error instanceof Prisma.PrismaClientValidationError) {
        return new BadRequestError('Data yang diberikan tidak valid');
    }

    if (error instanceof Prisma.PrismaClientInitializationError) {
        logger.error('Database initialization error:', error);
        return new HttpError('Terjadi kesalahan pada koneksi database', 500);
    }

    return error;
};

const errorHandler = (err, req, res, next) => {
    logger.error(`Error processing ${req.method} ${req.path}:`, err);

    let error = err;

    // Handle Prisma Errors
    if (err instanceof Prisma.PrismaClientError) {
        error = handlePrismaError(err);
    }

    // Handle known HTTP errors
    if (error instanceof HttpError) {
        return res.status(error.statusCode).json({
            success: false,
            message: error.message
        });
    }

    // Handle unknown errors
    return res.status(500).json({
        success: false,
        message: 'Internal Server Error'
    });
};

module.exports = {
    errorHandler,
    handlePrismaError,
    HttpError,
    BadRequestError,
    UnauthorizedError,
    ForbiddenError,
    NotFoundError,
    ConflictError
}; 