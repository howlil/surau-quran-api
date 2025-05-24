const morgan = require('morgan');
const { stream } = require('../../lib/config/logger.config');
require('dotenv').config();
class HttpLoggerMiddleware {

  static getFormat() {
    return process.env.NODE_ENV === 'production'
      ? 'combined'  
      : 'dev';      
  }


  static getMiddleware() {
    return morgan(this.getFormat(), { stream });
  }
}

module.exports = HttpLoggerMiddleware.getMiddleware();