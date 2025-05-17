const helmet = require('helmet');
const cors = require('cors');
const { rateLimit } = require('express-rate-limit');
const { logger } = require('../../lib/config/logger.config');
const CONSTANT = require('../../lib/constants');

class SecurityMiddleware {
  static get helmet() {
    return helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: CONSTANT.SECURITY.HELMET.CONTENT_SECURITY_POLICY.directives.defaultSrc,
          scriptSrc: CONSTANT.SECURITY.HELMET.CONTENT_SECURITY_POLICY.directives.scriptSrc,
          styleSrc: CONSTANT.SECURITY.HELMET.CONTENT_SECURITY_POLICY.directives.styleSrc,
          imgSrc: CONSTANT.SECURITY.HELMET.CONTENT_SECURITY_POLICY.directives.imgSrc,
          connectSrc: CONSTANT.SECURITY.HELMET.CONTENT_SECURITY_POLICY.directives.connectSrc,
          fontSrc: CONSTANT.SECURITY.HELMET.CONTENT_SECURITY_POLICY.directives.fontSrc,
          objectSrc: CONSTANT.SECURITY.HELMET.CONTENT_SECURITY_POLICY.directives.objectSrc,
          mediaSrc: CONSTANT.SECURITY.HELMET.CONTENT_SECURITY_POLICY.directives.mediaSrc,
          frameSrc: CONSTANT.SECURITY.HELMET.CONTENT_SECURITY_POLICY.directives.frameSrc,
        },
      },
      xssFilter: true,
      noSniff: true,
      referrerPolicy: { policy: 'same-origin' },
      hsts: {
        maxAge: CONSTANT.SECURITY.HELMET.HSTS.maxAge, // 180 days in seconds
        includeSubDomains: CONSTANT.SECURITY.HELMET.HSTS.includeSubDomains,
        preload: CONSTANT.SECURITY.HELMET.HSTS.preload,
      },
      frameguard: {
        action: 'deny',
      },
    });
  }

  static get cors() {
    return cors({
      origin: process.env.CORS_ORIGIN || '*',
      methods: CONSTANT.SECURITY.CORS.ALLOWED_METHODS,
      allowedHeaders: CONSTANT.SECURITY.CORS.ALLOWED_HEADERS,
      exposedHeaders: CONSTANT.SECURITY.CORS.EXPOSED_HEADERS,
      credentials: true,
      maxAge: CONSTANT.SECURITY.CORS.MAX_AGE,
    });
  }

  static get rateLimit() {
    return rateLimit({
      windowMs: CONSTANT.SECURITY.RATE_LIMIT.WINDOW_MS,
      max: CONSTANT.SECURITY.RATE_LIMIT.MAX_REQUESTS,
      standardHeaders: true,
      legacyHeaders: false,
      message: 'Terlalu banyak permintaan, silakan coba lagi nanti',
      handler: (req, res, next, options) => {
        logger.warn(`Rate limit exceeded: ${req.ip}`);
        res.status(options.statusCode).json({
          success: false,
          message: options.message,
        });
      },
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
    app.use(this.helmet);
    
    app.use(this.cors);
    
    app.use(this.rateLimit);
    
    
    // Prevent parameter pollution
    app.use(this.preventParameterPollution);
    
    // Sanitize request body
    app.use(this.sanitizeRequestBody);
    
    logger.info('Security middleware configured');
  }
}

module.exports = SecurityMiddleware;