const cors = require('cors');
const logger = require('../../lib/config/logger.config');
require('dotenv').config();

class SecurityMiddleware {
  
  static get cors() {
    return cors({
      origin: '*',
      credentials: true,
    });
  }

  static setup(app) {
    
    app.use(this.cors);
    app.use(this.preventParameterPollution);
    
  }
}

module.exports = SecurityMiddleware;