

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
        req.query = validator.validate(req.query);
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
          req.query = validators.query.validate(req.query);
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

module.exports = ValidationMiddleware;