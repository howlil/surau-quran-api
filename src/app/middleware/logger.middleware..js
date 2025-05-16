const morgan = require('morgan');
const { stream } = require('@config/logger.config');


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