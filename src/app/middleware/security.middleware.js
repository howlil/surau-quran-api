const cors = require('cors');
const { logger } = require('../../lib/config/logger.config');
const CONSTANT = require('../../lib/constants');
require('dotenv').config();


class SecurityMiddleware {
  
  static get cors() {
    return cors({
      origin: '*',
      methods: CONSTANT.SECURITY.CORS.ALLOWED_METHODS,
      allowedHeaders: CONSTANT.SECURITY.CORS.ALLOWED_HEADERS,
      credentials: true,
    });
  }


  static get preventParameterPollution() {
    return (req, res, next) => {
      // Convert arrays to last value for query params
      if (req.query) {
        for (const [key, value] of Object.entries(req.query)) {
          if (Array.isArray(value)) {
            req.query[key] = value[value.length - 1];
          }
        }
      }
      next();
    };
  }

  static get sanitizeRequestBody() {
    return (req, res, next) => {
      if (req.body) {
        this.#sanitizeObject(req.body);
      }
      next();
    };
  }

  static #sanitizeObject(obj) {
    const recursivelyUpdate = (data) => {
      if (!data || typeof data !== 'object') return;
      
      Object.keys(data).forEach(key => {
        if (typeof data[key] === 'string') {
          // Basic XSS protection by escaping HTML
          data[key] = data[key]
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#x27;')
            .replace(/\//g, '&#x2F;');
        } else if (typeof data[key] === 'object') {
          recursivelyUpdate(data[key]);
        }
      });
    };
    
    recursivelyUpdate(obj);
  }

  static setup(app) {
    
    app.use(this.cors);
    
    app.use(this.preventParameterPollution);
    
    app.use(this.sanitizeRequestBody);
    
    logger.info('Security middleware configured');
  }
}

module.exports = SecurityMiddleware;