const { logger } = require('../config/logger.config');
const { Prisma } = require('@prisma/client');
const {
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  BadRequestError
} = require('./errors.http');

class ErrorHandler {
  static asyncHandler(fn) {
    return async (req, res, next) => {
      try {
        await fn(req, res, next);
      } catch (error) {
        next(error);
      }
    };
  }

  static notFoundHandler(req, res, next) {
    const error = new NotFoundError(`Route tidak ditemukan: ${req.originalUrl}`);
    next(error);
  }

  static errorHandler(error, req, res, next) {
    logger.error(`Error processing ${req.method} ${req.originalUrl}:`, error);

    // Handle specific error types
    if (error instanceof UnauthorizedError) {
      return res.status(401).json({
        success: false,
        message: error.message || 'Unauthorized access',
        errors: error.data || null
      });
    }

    if (error instanceof ForbiddenError) {
      return res.status(403).json({
        success: false,
        message: error.message || 'Access forbidden',
        errors: error.data || null
      });
    }

    if (error instanceof NotFoundError) {
      return res.status(404).json({
        success: false,
        message: error.message || 'Resource not found',
        errors: error.data || null
      });
    }

    if (error instanceof ConflictError) {
      return res.status(409).json({
        success: false,
        message: error.message || 'Resource conflict',
        errors: error.data || null
      });
    }

    if (error instanceof BadRequestError) {
      return res.status(400).json({
        success: false,
        message: error.message || 'Bad request',
        errors: error.data || null
      });
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      return res.status(400).json({
        success: false,
        message: 'Database operation failed',
        errors: [{
          code: error.code,
          message: this.getPrismaErrorMessage(error)
        }]
      });
    }

    if (error instanceof Prisma.PrismaClientValidationError) {
      return res.status(400).json({
        success: false,
        message: 'Invalid data provided',
        errors: [{
          message: error.message
        }]
      });
    }

    // Handle validation errors from Joi
    if (error.isJoi) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: error.details.map(detail => ({
          field: detail.path[0],
          message: detail.message
        }))
      });
    }

    // Handle multer errors
    if (error && error.name === 'MulterError') {
      return res.status(400).json({
        success: false,
        message: 'File upload error',
        errors: [{
          field: error.field,
          message: error.message
        }]
      });
    }

    // Handle unknown errors
    logger.error('Unhandled error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      errors: process.env.NODE_ENV === 'development' ? [{ message: error.message }] : null
    });
  }

  static getPrismaErrorMessage(error) {
    switch (error.code) {
      case 'P2002':
        return `Data dengan ${error.meta?.target?.join(', ')} sudah ada`;
      case 'P2014':
        return 'ID yang diberikan tidak valid';
      case 'P2003':
        return 'Data terkait tidak ditemukan';
      case 'P2025':
        return 'Data tidak ditemukan';
      default:
        return 'Terjadi kesalahan pada database';
    }
  }
}

module.exports = ErrorHandler;