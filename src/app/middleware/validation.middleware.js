const { ValidationError } = require('../../lib/http/errors.http');

class ValidationMiddleware {

  static validateBody(validator) {
    return (req, res, next) => {
      try {
        req.body = validator.validate(req.body);
        next();
      } catch (error) {
        next(error);
      }
    };
  }

  static validateQuery(validator) {
    return (req, res, next) => {
      try {
        req.validatedQuery = validator.validate(req.query);
        next();
      } catch (error) {
        next(error);
      }
    };
  }

  static validateParams(validator) {
    return (req, res, next) => {
      try {
        req.params = validator.validate(req.params);
        next();
      } catch (error) {
        next(error);
      }
    };
  }

  static validate(validators = {}) {
    return (req, res, next) => {
      try {
        if (validators.body) {
          req.body = validators.body.validate(req.body);
        }

        if (validators.query) {
          req.validatedQuery = validators.query.validate(req.query);
        }

        if (validators.params) {
          req.params = validators.params.validate(req.params);
        }

        next();
      } catch (error) {
        next(error);
      }
    };
  }

  static validateRequest(schema, property = 'body') {
    return (req, res, next) => {
      const { error, value } = schema.validate(req[property], { abortEarly: false });

      if (error) {
        const errorDetails = error.details.map(detail => ({
          message: detail.message,
          path: detail.path
        }));

        return next(new ValidationError('Validation error', errorDetails));
      }

      req[property] = value;
      next();
    };
  }

  static handleErrors(err, req, res, next) {
    if (err instanceof ValidationError) {
      return res.status(422).json({
        success: false,
        message: err.message,
        errors: err.data
      });
    }

    next(err);
  }
}

module.exports = {
  validateBody: ValidationMiddleware.validateBody,
  validateQuery: ValidationMiddleware.validateQuery,
  validateParams: ValidationMiddleware.validateParams,
  validate: ValidationMiddleware.validate,
  validateRequest: ValidationMiddleware.validateRequest,
  handleErrors: ValidationMiddleware.handleErrors
};