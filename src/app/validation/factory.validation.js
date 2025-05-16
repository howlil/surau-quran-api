

const ValidationBase = require('./base.validation');
const Joi = require('joi');


class ValidatorFactory {

  static create(schema) {
    if (schema instanceof Joi.constructor) {
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
      page: Joi.number().integer().min(1).default(1)
        .messages({
          'number.base': 'page should be a number',
          'number.integer': 'page should be an integer',
          'number.min': 'page should be 1 or greater'
        }),
      limit: Joi.number().integer().min(1).max(100).default(10)
        .messages({
          'number.base': 'limit should be a number',
          'number.integer': 'limit should be an integer',
          'number.min': 'limit should be 1 or greater',
          'number.max': 'limit should be 100 or less'
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
}

module.exports = ValidatorFactory;