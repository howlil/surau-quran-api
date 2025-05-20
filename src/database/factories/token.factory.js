const BaseFactory = require('./base.factory');
const jwt = require('jsonwebtoken');

class TokenFactory extends BaseFactory {
  constructor() {
    super('token');
  }

  definition() {
    // Create a mock JWT token
    const token = jwt.sign(
      { userId: this.faker.string.uuid() },
      'secret_key_for_testing',
      { expiresIn: '24h' }
    );
    
    return {
      userId: null, // This needs to be specified
      token,
    };
  }
}

module.exports = new TokenFactory();