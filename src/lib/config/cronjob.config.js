const cron = require('node-cron');
const { logger } = require('./logger.config');
const PayrollCronService = require('../../app/service/payroll-cron.service');
const AbsensiCronService = require('../../app/service/absensi-cron.service');
const SppCronService = require('../../app/service/spp-cron.service');

class CronJobs {
  static init() {
    logger.info('=== CRONJOB INITIALIZATION STARTED ===');
    logger.info('Environment:', process.env.NODE_ENV || 'development');
    logger.info('Timezone:', 'Asia/Jakarta');

    this.schedulePayrollGeneration();
    this.scheduleDailyAbsensiGuru();
    this.scheduleMonthlySppCreation();

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

  static scheduleDailyAbsensiGuru() {
    const schedule = '1 * * * *';
    logger.info('Setting up Daily Guru Attendance Cron Job:');
    logger.info('- Schedule:', schedule);
    logger.info('- Description: Create daily attendance records every minute');

    cron.schedule(schedule, async () => {
      const startTime = new Date();
      logger.info('=== DAILY GURU ATTENDANCE CRON STARTED ===');
      logger.info('Start Time:', startTime.toISOString());

      try {
        const result = await AbsensiCronService.createDailyAbsensiGuru();
        const endTime = new Date();
        const duration = (endTime - startTime) / 1000;

        logger.info('Attendance Creation Result:', result);
        logger.info('End Time:', endTime.toISOString());
        logger.info('Duration:', `${duration} seconds`);
        logger.info('=== DAILY GURU ATTENDANCE CRON COMPLETED ===');
      } catch (error) {
        logger.error('=== DAILY GURU ATTENDANCE CRON FAILED ===');
        logger.error('Error:', error.message);
        logger.error('Stack:', error.stack);
        logger.error('Failed at:', new Date().toISOString());
      }
    }, {
      timezone: 'Asia/Jakarta'
    });
  }

  static scheduleMonthlySppCreation() {
    const schedule = '2 0 * * *';
    logger.info('Setting up Monthly SPP Creation Cron Job:');
    logger.info('- Schedule:', schedule);
    logger.info('- Description: Create monthly SPP records every day at 00:02');

    cron.schedule(schedule, async () => {
      const startTime = new Date();
      logger.info('=== MONTHLY SPP CREATION CRON STARTED ===');
      logger.info('Start Time:', startTime.toISOString());

      try {
        const result = await SppCronService.createMonthlySpp();
        const endTime = new Date();
        const duration = (endTime - startTime) / 1000;

        logger.info('SPP Creation Result:', result);
        logger.info('End Time:', endTime.toISOString());
        logger.info('Duration:', `${duration} seconds`);
        logger.info('=== MONTHLY SPP CREATION CRON COMPLETED ===');
      } catch (error) {
        logger.error('=== MONTHLY SPP CREATION CRON FAILED ===');
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