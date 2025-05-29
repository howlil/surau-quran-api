const cron = require('node-cron');
const { logger } = require('./logger.config');
const PayrollCronService = require('../../app/service/payroll-cron.service');

class CronJobs {
  static init() {
    logger.info('Initializing cron jobs...');

    this.schedulePayrollGeneration();

    logger.info('All cron jobs have been scheduled');
  }

  static schedulePayrollGeneration() {
    cron.schedule('0 0 25 * *', async () => {
      logger.info('Running scheduled monthly payroll generation...');
      try {
        await PayrollCronService.generateMonthlyPayroll();
        logger.info('Scheduled monthly payroll generation completed successfully');
      } catch (error) {
        logger.error('Scheduled monthly payroll generation failed:', error);
      }
    }, {
      timezone: 'Asia/Jakarta'
    });

    logger.info('Payroll generation cron job scheduled for 25th of every month at 00:00');
  }

  static async runManualPayrollGeneration(bulan, tahun) {
    logger.info(`Running manual SPP generation for ${bulan} ${tahun}...`);

    try {
      const result = await PayrollCronService.runManualPayrollGeneration(bulan, tahun);
      logger.info('Manual payroll generation completed:', result);
      return result;
    } catch (error) {
      logger.error('Manual payroll generation failed:', error);
      throw error;
    }
  }
}

module.exports = CronJobs;