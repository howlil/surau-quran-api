const { Xendit } = require('xendit-node');
const { logger } = require('./logger.config');
require('dotenv').config();


let xenditClient;

try {
  const secretKey = process.env.XENDIT_SECRET_KEY;
  const callbackToken = process.env.XENDIT_CALLBACK_TOKEN;

  if (!secretKey) {
    throw new Error('XENDIT_SECRET_KEY environment variable is required');
  }

  if (!callbackToken) {
    logger.warn('XENDIT_CALLBACK_TOKEN is not set! Webhook callbacks will not be validated');
  }

  logger.info('Initializing Xendit client...');

  xenditClient = new Xendit({
    secretKey: secretKey
  });

  if (!xenditClient) {
    throw new Error('Failed to initialize Xendit client');
  }

  if (!xenditClient.Invoice) {
    throw new Error('Xendit Invoice API not available');
  }

  logger.info('Xendit client initialized successfully');

  const availableAPIs = Object.keys(xenditClient).filter(key =>
    typeof xenditClient[key] === 'object' || typeof xenditClient[key] === 'function'
  );
  logger.info('Available Xendit APIs:', availableAPIs);

} catch (error) {
  logger.error('Failed to initialize Xendit:', error);

  xenditClient = null;
}

module.exports = {
  xendit: xenditClient,
  xenditConfig: {
    getCallbackToken: () => process.env.XENDIT_CALLBACK_TOKEN,
    validateCallbackToken: (token) => token === process.env.XENDIT_CALLBACK_TOKEN
  }
};