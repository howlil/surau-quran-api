const { BadRequestError, ValidationError } = require('../../lib/http/errors.http');

class ValidationMiddleware {

  static validateBody(schema) {
    return (req, res, next) => {
      try {
        if (!schema || typeof schema.validate !== 'function') {
          throw new ValidationError('Invalid validation schema');
        }

        const result = schema.validate(req.body);
        if (!result || result.error) {
          const error = result?.error;
          if (error) {
            const errors = error.details.map(detail => ({
              field: detail.path[0],
              message: detail.message
            }));
            throw new BadRequestError('Validation failed', errors);
          } else {
            throw new ValidationError('Validation failed - invalid schema result');
          }
        }
        req.validatedBody = result.value;
        next();
      } catch (err) {
        next(err);
      }
    };
  }

  static validateQuery(schema) {
    return (req, res, next) => {
      try {
        if (!schema || typeof schema.validate !== 'function') {
          throw new ValidationError('Invalid validation schema');
        }

        const result = schema.validate(req.query);
        if (!result || result.error) {
          const error = result?.error;
          if (error) {
            const errors = error.details.map(detail => ({
              field: detail.path[0],
              message: detail.message
            }));
            throw new BadRequestError('Validation failed', errors);
          } else {
            throw new ValidationError('Validation failed - invalid schema result');
          }
        }
        req.validatedQuery = result.value;
        next();
      } catch (err) {
        next(err);
      }
    };
  }

  static validateParams(schema) {
    return (req, res, next) => {
      try {
        if (!schema || typeof schema.validate !== 'function') {
          throw new ValidationError('Invalid validation schema');
        }

        const result = schema.validate(req.params);
        if (!result || result.error) {
          const error = result?.error;
          if (error) {
            const errors = error.details.map(detail => ({
              field: detail.path[0],
              message: detail.message
            }));
            throw new BadRequestError('Validation failed', errors);
          } else {
            throw new ValidationError('Validation failed - invalid schema result');
          }
        }
        req.validatedParams = result.value;
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
          if (typeof validators.body.validate !== 'function') {
            throw new ValidationError('Invalid body validation schema');
          }
          const result = validators.body.validate(req.body);
          if (!result || result.error) {
            const error = result?.error;
            if (error) {
              errors.push(...error.details.map(detail => ({
                field: detail.path[0],
                message: detail.message
              })));
            }
          } else {
            req.validatedBody = result.value;
          }
        }

        if (validators.query) {
          if (typeof validators.query.validate !== 'function') {
            throw new ValidationError('Invalid query validation schema');
          }
          const result = validators.query.validate(req.query);
          if (!result || result.error) {
            const error = result?.error;
            if (error) {
              errors.push(...error.details.map(detail => ({
                field: detail.path[0],
                message: detail.message
              })));
            }
          } else {
            req.validatedQuery = result.value;
          }
        }

        if (validators.params) {
          if (typeof validators.params.validate !== 'function') {
            throw new ValidationError('Invalid params validation schema');
          }
          const result = validators.params.validate(req.params);
          if (!result || result.error) {
            const error = result?.error;
            if (error) {
              errors.push(...error.details.map(detail => ({
                field: detail.path[0],
                message: detail.message
              })));
            }
          } else {
            req.validatedParams = result.value;
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
      try {
        if (!schema || typeof schema.validate !== 'function') {
          throw new ValidationError('Invalid validation schema');
        }

        const result = schema.validate(req[property], { abortEarly: false });

        if (!result || result.error) {
          const error = result?.error;
          if (error) {
            const errorDetails = error.details.map(detail => ({
              message: detail.message,
              path: detail.path
            }));

            throw new ValidationError('Validation error', errorDetails);
          } else {
            throw new ValidationError('Validation failed - invalid schema result');
          }
        }

        req[property] = result.value;
        next();
      } catch (err) {
        next(err);
      }
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