const { PrismaClient } = require('../../generated/prisma');
const { logger } = require('./logger.config');
require('dotenv').config();


class PrismaConfig {
  #client;
  #isConnected = false;
  static #instance;

  constructor() {
    this.#client = new PrismaClient({
      log: [
        { level: 'query', emit: 'event' },
        { level: 'error', emit: 'event' },
        { level: 'info', emit: 'event' },
        { level: 'warn', emit: 'event' }
      ],
      errorFormat: process.env.NODE_ENV === 'production' ? 'minimal' : 'pretty'
    });

    this.#setupLogging();
  }

  #setupLogging() {
    this.#client.$on('query', e => {
      logger.debug(`Query: ${e.query}`);
      logger.debug(`Duration: ${e.duration}ms`);
    });

    this.#client.$on('error', e => {
      logger.error('Prisma Client error:', e);
    });

    this.#client.$on('info', e => {
      logger.info('Prisma info:', e);
    });

    this.#client.$on('warn', e => {
      logger.warn('Prisma warning:', e);
    });
  }

  async connect() {
    if (!this.#isConnected) {
      try {
        await this.#client.$connect();
        this.#isConnected = true;
        logger.info('Successfully connected to the database');
      } catch (error) {
        logger.error('Failed to connect to the database:', error);
        throw error;
      }
    }
    return this.#client;
  }

  async disconnect() {
    if (this.#isConnected) {
      try {
        await this.#client.$disconnect();
        this.#isConnected = false;
        logger.info('Successfully disconnected from the database');
      } catch (error) {
        logger.error('Failed to disconnect from the database:', error);
        throw error;
      }
    }
  }

  getClient() {
    if (!this.#isConnected) {
      logger.warn('Attempting to use Prisma client before connecting');
    }
    return this.#client;
  }

  static getInstance() {
    if (!PrismaConfig.#instance) {
      PrismaConfig.#instance = new PrismaConfig();
    }
    return PrismaConfig.#instance;
  }
}

module.exports = {
  prisma: PrismaConfig.getInstance().getClient(),
  prismaConfig: PrismaConfig.getInstance()
};