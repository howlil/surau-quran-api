const { connect, sync } = require('../lib/config/database');
const { logger } = require('../lib/config/logger.config');

const db = require('./models');

const initialize = async (options = { force: false, alter: false }) => {
  try {
    await connect();
    
    if (process.env.NODE_ENV !== 'production') {
      await sync(options);
      logger.info('Database initialized successfully');
    } else {
      logger.info('Skipping database sync in production. Use migrations instead.');
    }
    
    return db;
  } catch (error) {
    logger.error('Failed to initialize database:', error);
    throw error;
  }
};

module.exports = initialize;