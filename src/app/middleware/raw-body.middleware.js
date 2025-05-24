const { logger } = require('../../lib/config/logger.config');

class RawBodyMiddleware {
  static captureRawBody(req, res, next) {
    if (req.get('content-type') === 'application/json') {
      let data = '';
      
      req.on('data', chunk => {
        data += chunk;
      });
      
      req.on('end', () => {
        try {
          req.rawBody = data;
          req.body = data ? JSON.parse(data) : {};
          next();
        } catch (error) {
          logger.error('Error parsing JSON body:', error);
          return res.status(400).json({
            success: false,
            message: 'Invalid JSON format'
          });
        }
      });
      
      req.on('error', error => {
        logger.error('Error reading request body:', error);
        return res.status(400).json({
          success: false,
          message: 'Error reading request body'
        });
      });
    } else {
      next();
    }
  }

  static preserveRawBody() {
    return (req, res, next) => {
      if (req.url.includes('/xendit/callback')) {
        return this.captureRawBody(req, res, next);
      }
      next();
    };
  }
}

module.exports = RawBodyMiddleware;