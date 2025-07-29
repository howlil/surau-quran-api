const cron = require('node-cron');
const { logger } = require('./logger.config');
const PayrollCronService = require('../../app/service/payroll-cron.service');
const SppReminderCronService = require('../../app/service/spp-reminder-cron.service');


class CronJobs {
  static init() {
    logger.info('=== CRONJOB INITIALIZATION STARTED ===');
    logger.info('Environment:', process.env.NODE_ENV || 'development');
    logger.info('Timezone:', 'Asia/Jakarta');

    this.schedulePayrollGeneration();
    this.scheduleSppReminder();

    logger.info('=== CRONJOB INITIALIZATION COMPLETED ===');
  }

  static schedulePayrollGeneration() {
    const schedule = '0 0 25 * *';
    logger.info('Setting up Payroll Generation Cron Job:');
    logger.info('- Schedule:', schedule);
    logger.info('- Description: Generate monthly payroll on 25th of every month at 00:00');

    cron.schedule(schedule, async () => {
      const startTime = new Date();
      logger.info('=== PAYROLL GENERATION CRON STARTED ===');
      logger.info('Start Time:', startTime.toISOString());

      try {
        const result = await PayrollCronService.generateMonthlyPayroll();
        const endTime = new Date();
        const duration = (endTime - startTime) / 1000;

        logger.info('Payroll Generation Result:', result);
        logger.info('End Time:', endTime.toISOString());
        logger.info('Duration:', `${duration} seconds`);
        logger.info('=== PAYROLL GENERATION CRON COMPLETED ===');
      } catch (error) {
        logger.error('=== PAYROLL GENERATION CRON FAILED ===');
        logger.error('Error:', error.message);
        logger.error('Stack:', error.stack);
        logger.error('Failed at:', new Date().toISOString());
      }
    }, {
      timezone: 'Asia/Jakarta'
    });
  }


  static scheduleSppReminder() {
    const schedule = '0 9 25 * *';
    logger.info('Setting up SPP Reminder Cron Job:');
    logger.info('- Schedule:', schedule);
    logger.info('- Description: Send SPP payment reminders on 25th of every month at 9:00 AM');

    cron.schedule(schedule, async () => {
      const startTime = new Date();
      logger.info('=== SPP REMINDER CRON STARTED ===');
      logger.info('Start Time:', startTime.toISOString());

      try {
        const result = await SppReminderCronService.sendSppReminders();
        const endTime = new Date();
        const duration = (endTime - startTime) / 1000;

        logger.info('SPP Reminder Result:', result);
        logger.info('End Time:', endTime.toISOString());
        logger.info('Duration:', `${duration} seconds`);
        logger.info('=== SPP REMINDER CRON COMPLETED ===');
      } catch (error) {
        logger.error('=== SPP REMINDER CRON FAILED ===');
        logger.error('Error:', error.message);
        logger.error('Stack:', error.stack);
        logger.error('Failed at:', new Date().toISOString());
      }
    }, {
      timezone: 'Asia/Jakarta'
    });
  }


}

module.exports = CronJobs;