const ValidationBase = require('./base.validation');
const Joi = require('joi');
const { VALIDATION } = require('../../lib/constants');

class ValidatorFactory {

  static create(schema) {
    if (schema && typeof schema.validate === 'function') {
      return new ValidationBase(schema);
    } else {
      return new ValidationBase(Joi.object(schema));
    }
  }

  static id(fieldName = 'id', options = {}) {
    const schema = {};
    
    schema[fieldName] = Joi.number().integer().positive().required()
      .messages({
        'number.base': `${fieldName} should be a number`,
        'number.integer': `${fieldName} should be an integer`,
        'number.positive': `${fieldName} should be positive`,
        'any.required': `${fieldName} is required`
      });
    
    return this.create(schema);
  }

 
  static pagination() {
    return this.create({
      page: Joi.number().integer().min(1).default(VALIDATION.PAGINATION.DEFAULT_PAGE)
        .messages({
          'number.base': 'page should be a number',
          'number.integer': 'page should be an integer',
          'number.min': 'page should be 1 or greater'
        }),
      limit: Joi.number().integer().min(1).max(VALIDATION.PAGINATION.MAX_LIMIT).default(VALIDATION.PAGINATION.DEFAULT_LIMIT)
        .messages({
          'number.base': 'limit should be a number',
          'number.integer': 'limit should be an integer',
          'number.min': 'limit should be 1 or greater',
          'number.max': `limit should be ${VALIDATION.PAGINATION.MAX_LIMIT} or less`
        }),
      sort: Joi.string().optional(),
      order: Joi.string().valid('asc', 'desc').default('asc')
        .messages({
          'any.only': 'order should be either "asc" or "desc"'
        })
    });
  }


  static date(fieldName, options = {}) {
    const schema = {};
    
    schema[fieldName] = Joi.date()
      .iso()
      .messages({
        'date.base': `${fieldName} should be a valid date`,
        'date.format': `${fieldName} should be in ISO format`
      });
    
    if (options.required) {
      schema[fieldName] = schema[fieldName].required();
    }
    
    return this.create(schema);
  }


  static email(fieldName = 'email', options = {}) {
    const schema = {};
    
    schema[fieldName] = Joi.string()
      .email()
      .messages({
        'string.email': `${fieldName} should be a valid email address`,
        'string.empty': `${fieldName} cannot be empty`
      });
    
    if (options.required) {
      schema[fieldName] = schema[fieldName].required();
    }
    
    return this.create(schema);
  }

  static password(fieldName = 'password', options = {}) {
    const schema = {};
    
    let validator = Joi.string()
      .min(VALIDATION.PASSWORD_MIN_LENGTH);
      
    if (options.requireStrong) {
      validator = validator.pattern(VALIDATION.PASSWORD_REGEX)
        .messages({
          'string.pattern.base': `${fieldName} must contain at least one letter and one number`
        });
    }
    
    if (options.required !== false) {
      validator = validator.required();
    }
    
    schema[fieldName] = validator.messages({
      'string.min': `${fieldName} must be at least ${VALIDATION.PASSWORD_MIN_LENGTH} characters`,
      'any.required': `${fieldName} is required`
    });
    
    return this.create(schema);
  }
}

module.exports = ValidatorFactory;