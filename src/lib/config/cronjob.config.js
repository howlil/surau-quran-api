const cron = require('node-cron');
const { logger } = require('../lib/config/logger.config');

class CronJobs {
  static init() {
    logger.info('Initializing cron jobs...');

    this.runSppGenerationNow();

    logger.info('All cron jobs have been scheduled');
  }


  static async runSppGenerationNow() {
    logger.info('Running manual SPP generation...');
    
    try {
      logger.info('Manual SPP generation completed:', result);
      return result;
    } catch (error) {
      logger.error('Manual SPP generation failed:', error);
      throw error;
    }
  }


}

module.exports = CronJobs;