const { BadRequestError } = require('../../lib/http/errors.http');

class ValidationMiddleware {

  static validateBody(schema) {
    return (req, res, next) => {
      try {
        const { error, value } = schema.validate(req.body);
        if (error) {
          const errors = error.details.map(detail => ({
            field: detail.path[0],
            message: detail.message
          }));
          throw new BadRequestError('Validation failed', errors);
        }
        req.validatedBody = value;
        next();
      } catch (err) {
        next(err);
      }
    };
  }

  static validateQuery(schema) {
    return (req, res, next) => {
      try {
        const { error, value } = schema.validate(req.query);
        if (error) {
          const errors = error.details.map(detail => ({
            field: detail.path[0],
            message: detail.message
          }));
          throw new BadRequestError('Validation failed', errors);
        }
        req.validatedQuery = value;
        next();
      } catch (err) {
        next(err);
      }
    };
  }

  static validateParams(schema) {
    return (req, res, next) => {
      try {
        const { error, value } = schema.validate(req.params);
        if (error) {
          const errors = error.details.map(detail => ({
            field: detail.path[0],
            message: detail.message
          }));
          throw new BadRequestError('Validation failed', errors);
        }
        req.validatedParams = value;
        next();
      } catch (err) {
        next(err);
      }
    };
  }

  static validate(validators = {}) {
    return (req, res, next) => {
      try {
        const errors = [];

        if (validators.body) {
          const { error, value } = validators.body.validate(req.body);
          if (error) {
            errors.push(...error.details.map(detail => ({
              field: detail.path[0],
              message: detail.message
            })));
          } else {
            req.validatedBody = value;
          }
        }

        if (validators.query) {
          const { error, value } = validators.query.validate(req.query);
          if (error) {
            errors.push(...error.details.map(detail => ({
              field: detail.path[0],
              message: detail.message
            })));
          } else {
            req.validatedQuery = value;
          }
        }

        if (validators.params) {
          const { error, value } = validators.params.validate(req.params);
          if (error) {
            errors.push(...error.details.map(detail => ({
              field: detail.path[0],
              message: detail.message
            })));
          } else {
            req.validatedParams = value;
          }
        }

        if (errors.length > 0) {
          throw new BadRequestError('Validation failed', errors);
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