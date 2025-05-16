const Joi = require('joi');
const { ValidationError } = require('@http/HttpErrors');


class ValidationBase {

  constructor(schema) {
    if (!schema) {
      throw new Error('Schema is required for validator');
    }
    this.schema = schema;
  }


  validate(data, options = {}) {
    const defaultOptions = {
      abortEarly: false, 
      stripUnknown: true,
      ...options
    };

    const { error, value } = this.schema.validate(data, defaultOptions);

    if (error) {
      throw this.formatValidationError(error);
    }

    return value;
  }


  formatValidationError(error) {
    // Format error details dari Joi
    const details = error.details.map(item => ({
      field: item.path.join('.'),
      message: item.message,
      type: item.type
    }));

    const fields = details.map(item => item.field).join(', ');
    const message = `Validation failed for ${fields}`;

    return new ValidationError(message, details);
  }


  middleware(source = 'body') {
    return (req, res, next) => {
      try {
        const value = this.validate(req[source]);
        
        req[source] = value;
        
        next();
      } catch (error) {
        next(error);
      }
    };
  }


  extend(additionalSchema) {
    const newSchema = this.schema.concat(Joi.object(additionalSchema));
    
    return new this.constructor(newSchema);
  }
}

module.exports = ValidationBase;