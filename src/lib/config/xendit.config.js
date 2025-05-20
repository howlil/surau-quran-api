const { Xendit } = require('xendit-node');
const { logger } = require('./logger.config');

class XenditConfig {
  #secretKey;
  #callbackToken;
  #xenditClient;
  static #instance;

  constructor() {
    this.#secretKey = process.env.XENDIT_SECRET_KEY;
    this.#callbackToken = process.env.XENDIT_CALLBACK_TOKEN;

    if (!this.#secretKey) {
      logger.error('XENDIT_SECRET_KEY is not set! Xendit integration will not work properly');
      throw new Error('XENDIT_SECRET_KEY environment variable is required');
    }

    if (!this.#callbackToken) {
      logger.error('XENDIT_CALLBACK_TOKEN is not set! Webhook callbacks will not be validated');
      throw new Error('XENDIT_CALLBACK_TOKEN environment variable is required');
    }

    // Initialize the Xendit client
    try {
      logger.info('Initializing Xendit with secret key...');

      // Create with specific options
      this.#xenditClient = new Xendit({
        secretKey: this.#secretKey,
        xenditApiVersion: '2019-02-04',
        xenditRegion: 'ID'
      });

      // Test if the client is initialized correctly
      if (!this.#xenditClient) {
        throw new Error('Xendit client initialization failed');
      }

      // Verify necessary API methods are available
      if (!this.#xenditClient.Invoice) {
        throw new Error('Xendit Invoice API not available');
      }

      logger.info('Xendit client initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Xendit client:', error);
      throw new Error(`Failed to initialize Xendit client: ${error.message}`);
    }
  }

  getCallbackToken() {
    return this.#callbackToken;
  }

  validateCallbackToken(token) {
    return token === this.#callbackToken;
  }

  getXenditClient() {
    if (!this.#xenditClient) {
      throw new Error('Xendit client not initialized');
    }
    return this.#xenditClient;
  }

  static getInstance() {
    if (!XenditConfig.#instance) {
      try {
        XenditConfig.#instance = new XenditConfig();
      } catch (error) {
        logger.error('Error creating Xendit config instance:', error);
        throw error;
      }
    }
    return XenditConfig.#instance;
  }
}

// Pre-validate the instance
try {
  const config = XenditConfig.getInstance();
  logger.info('Xendit configuration loaded successfully');
} catch (error) {
  logger.error('Failed to initialize Xendit configuration:', error);
  // Do not throw here, let the application handle the error when it tries to use Xendit
}

module.exports = {
  xenditConfig: XenditConfig.getInstance(),
  xendit: XenditConfig.getInstance().getXenditClient()
};