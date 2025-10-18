const cron = require('node-cron');
const logger  = require('./logger.config');
const PayrollCronService = require('../../app/service/payroll-cron.service');
const SppReminderCronService = require('../../app/service/spp-reminder-cron.service');

class CronJobs {
  static init() {
    this.schedulePayrollGeneration();
    this.scheduleSppReminder();
  }

  static schedulePayrollGeneration() {
    const schedule = '*/3 * * * *';

    cron.schedule(schedule, async () => {
      try {
        await PayrollCronService.generateMonthlyPayroll();
        logger.info('Payroll generation completed');
      } catch (error) {
        logger.error('Payroll generation failed:', error?.message || error);
      }
    }, {
      timezone: 'Asia/Jakarta'
    });
  }

  static scheduleSppReminder() {
    const schedule = '0 9 25 * *';

    cron.schedule(schedule, async () => {
      try {
        await SppReminderCronService.sendSppReminders();
        logger.info('SPP reminder sent');
      } catch (error) {
        logger.error('SPP reminder failed:', error?.message || error);
      }
    }, {
      timezone: 'Asia/Jakarta'
    });
  }
}

module.exports = CronJobs;