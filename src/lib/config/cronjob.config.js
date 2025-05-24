const cron = require('node-cron');
const { logger } = require('../lib/config/logger.config');
const cleanupService = require('../app/service/cleanup.service');

class CronJobs {
  static init() {
    logger.info('Initializing cron jobs...');

    this.setupDailyCleanup();
    this.setupMonthlyTasks();
    this.setupHealthCheck();

    logger.info('All cron jobs have been scheduled');
  }

  static setupDailyCleanup() {
    cron.schedule('0 2 * * *', async () => {
      logger.info('Starting daily cleanup job...');
      
      try {
        const result = await cleanupService.runDailyCleanup();
        logger.info('Daily cleanup completed successfully:', result);
      } catch (error) {
        logger.error('Daily cleanup failed:', error);
      }
    }, {
      scheduled: true,
      timezone: 'Asia/Jakarta'
    });

    logger.info('Daily cleanup job scheduled at 02:00 WIB');
  }

  static setupMonthlyTasks() {
    cron.schedule('0 1 1 * *', async () => {
      logger.info('Starting monthly tasks...');
      
      try {
        const result = await cleanupService.runMonthlyTasks();
        logger.info('Monthly tasks completed successfully:', result);
      } catch (error) {
        logger.error('Monthly tasks failed:', error);
      }
    }, {
      scheduled: true,
      timezone: 'Asia/Jakarta'
    });

    logger.info('Monthly tasks scheduled at 01:00 WIB on 1st of each month');
  }

  static setupHealthCheck() {
    cron.schedule('*/30 * * * *', async () => {
      try {
        const stats = await cleanupService.getCleanupStats();
        
        if (stats.expiredPayments > 100 || stats.expiredPendaftaran > 50) {
          logger.warn('High number of items pending cleanup:', stats);
        }
      } catch (error) {
        logger.error('Health check failed:', error);
      }
    }, {
      scheduled: true,
      timezone: 'Asia/Jakarta'
    });

    logger.info('Health check scheduled every 30 minutes');
  }

  static async runCleanupNow() {
    logger.info('Running manual cleanup...');
    
    try {
      const result = await cleanupService.runDailyCleanup();
      logger.info('Manual cleanup completed:', result);
      return result;
    } catch (error) {
      logger.error('Manual cleanup failed:', error);
      throw error;
    }
  }

  static async runSppGenerationNow() {
    logger.info('Running manual SPP generation...');
    
    try {
      const result = await cleanupService.generateSppForActiveStudents();
      logger.info('Manual SPP generation completed:', result);
      return result;
    } catch (error) {
      logger.error('Manual SPP generation failed:', error);
      throw error;
    }
  }

  static getScheduleInfo() {
    return {
      dailyCleanup: '02:00 WIB daily',
      monthlyTasks: '01:00 WIB on 1st of each month',
      healthCheck: 'Every 30 minutes',
      timezone: 'Asia/Jakarta'
    };
  }
}

module.exports = CronJobs;