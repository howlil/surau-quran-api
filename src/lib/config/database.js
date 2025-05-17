const { Sequelize } = require('sequelize');
const config = require('./sequelize.config');
const { logger } = require('./logger.config');

const env = process.env.NODE_ENV || 'development';
const dbConfig = config[env];

const sequelize = new Sequelize(
  dbConfig.database,
  dbConfig.username,
  dbConfig.password,
  {
    host: dbConfig.host,
    port: dbConfig.port,
    dialect: dbConfig.dialect,
    logging: msg => dbConfig.logging ? logger.debug(msg) : false,
    timezone: dbConfig.timezone,
    define: dbConfig.define,
    dialectOptions: dbConfig.dialectOptions,
    pool: dbConfig.pool
  }
);

module.exports = {
  sequelize,
  Sequelize,
  
  connect: async () => {
    try {
      await sequelize.authenticate();
      logger.info('Database connection has been established successfully.');
      return sequelize;
    } catch (error) {
      logger.error('Unable to connect to the database:', error);
      throw error;
    }
  },
  
  disconnect: async () => {
    try {
      await sequelize.close();
      logger.info('Database connection closed successfully');
    } catch (error) {
      logger.error('Error closing database connection:', error);
      throw error;
    }
  },
  
  sync: async (options = {}) => {
    try {
      await sequelize.sync(options);
      logger.info(`Database synced${options.force ? ' (tables dropped and recreated)' : options.alter ? ' (with alterations)' : ''}`);
    } catch (error) {
      logger.error('Error syncing database:', error);
      throw error;
    }
  },
  
  transaction: async (callback) => {
    return sequelize.transaction(callback);
  }
};