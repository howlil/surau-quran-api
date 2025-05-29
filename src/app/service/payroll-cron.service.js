// File: src/lib/services/payroll-cron.service.js
const cron = require('node-cron');
const { prisma } = require('../../lib/config/prisma.config');
const { logger } = require('../../lib/config/logger.config');

class PayrollCronService {
  static init() {
    logger.info('Initializing payroll cron jobs...');

    this.scheduleMonthlyPayrollGeneration();

    logger.info('Payroll cron jobs scheduled successfully');
  }

  static scheduleMonthlyPayrollGeneration() {
    // Run at 00:00 (midnight) on the 25th of every month
    cron.schedule('0 0 25 * *', async () => {
      logger.info('Starting monthly payroll generation...');
      await this.generateMonthlyPayroll();
    }, {
      timezone: 'Asia/Jakarta'
    });
  }

  static async generateMonthlyPayroll() {
    try {
      const currentDate = new Date();
      const bulan = currentDate.toLocaleString('id-ID', { month: 'long' });
      const tahun = currentDate.getFullYear();
      const periode = `${bulan} ${tahun}`;

      const gurus = await prisma.guru.findMany({
        include: {
          payroll: {
            where: {
              periode,
              tahun
            }
          }
        }
      });

      const results = [];
      const errors = [];

      for (const guru of gurus) {
        try {
          if (guru.payroll.length > 0) {
            logger.info(`Payroll untuk guru ${guru.nama} periode ${periode} sudah ada`);
            continue;
          }

          const absensiData = await prisma.absensiGuru.findMany({
            where: {
              guruId: guru.id,
              tanggal: {
                contains: `${tahun}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`
              },
              statusKehadiran: 'HADIR'
            }
          });

          const totalSKS = absensiData.reduce((sum, absensi) => sum + absensi.sks, 0);
          const gajiPokok = Number(guru.tarifPerJam || 0) * totalSKS;

          const payroll = await prisma.payroll.create({
            data: {
              guruId: guru.id,
              periode,
              bulan,
              tahun,
              gajiPokok,
              insentif: 0,
              potongan: 0,
              totalGaji: gajiPokok,
              status: 'DRAFT'
            }
          });

          results.push({
            guruId: guru.id,
            nama: guru.nama,
            payrollId: payroll.id,
            totalSKS,
            gajiPokok,
            totalGaji: payroll.totalGaji
          });

          logger.info(`Created payroll for guru ${guru.nama} with total gaji: ${payroll.totalGaji}`);
        } catch (error) {
          errors.push({
            guruId: guru.id,
            nama: guru.nama,
            error: error.message
          });
          logger.error(`Error creating payroll for guru ${guru.nama}:`, error);
        }
      }

      logger.info(`Monthly payroll generation completed. Success: ${results.length}, Errors: ${errors.length}`);

      return {
        success: results,
        errors,
        summary: {
          totalProcessed: results.length,
          totalErrors: errors.length,
          periode
        }
      };
    } catch (error) {
      logger.error('Error in monthly payroll generation:', error);
      throw error;
    }
  }

  static async runManualPayrollGeneration(bulan, tahun) {
    logger.info(`Running manual payroll generation for ${bulan} ${tahun}...`);

    try {
      const periode = `${bulan} ${tahun}`;

      const gurus = await prisma.guru.findMany({
        include: {
          payroll: {
            where: {
              periode,
              tahun: Number(tahun)
            }
          }
        }
      });

      const results = [];
      const errors = [];

      for (const guru of gurus) {
        try {
          if (guru.payroll.length > 0) {
            errors.push({
              guruId: guru.id,
              nama: guru.nama,
              error: `Payroll periode ${periode} sudah ada`
            });
            continue;
          }

          const monthNumber = this.getMonthNumber(bulan);
          const absensiData = await prisma.absensiGuru.findMany({
            where: {
              guruId: guru.id,
              tanggal: {
                contains: `${tahun}-${String(monthNumber).padStart(2, '0')}`
              },
              statusKehadiran: 'HADIR'
            }
          });

          const totalSKS = absensiData.reduce((sum, absensi) => sum + absensi.sks, 0);
          const gajiPokok = Number(guru.tarifPerJam || 0) * totalSKS;

          const payroll = await prisma.payroll.create({
            data: {
              guruId: guru.id,
              periode,
              bulan,
              tahun: Number(tahun),
              gajiPokok,
              insentif: 0,
              potongan: 0,
              totalGaji: gajiPokok,
              status: 'DRAFT'
            }
          });

          results.push({
            guruId: guru.id,
            nama: guru.nama,
            payrollId: payroll.id,
            totalSKS,
            gajiPokok,
            totalGaji: payroll.totalGaji
          });
        } catch (error) {
          errors.push({
            guruId: guru.id,
            nama: guru.nama,
            error: error.message
          });
        }
      }

      logger.info(`Manual payroll generation completed for ${periode}. Success: ${results.length}, Errors: ${errors.length}`);

      return {
        success: results,
        errors,
        summary: {
          totalProcessed: results.length,
          totalErrors: errors.length,
          periode
        }
      };
    } catch (error) {
      logger.error('Error in manual payroll generation:', error);
      throw error;
    }
  }

  static getMonthNumber(bulanName) {
    const months = {
      'Januari': 1, 'Februari': 2, 'Maret': 3, 'April': 4,
      'Mei': 5, 'Juni': 6, 'Juli': 7, 'Agustus': 8,
      'September': 9, 'Oktober': 10, 'November': 11, 'Desember': 12
    };
    return months[bulanName] || 1;
  }
}

module.exports = PayrollCronService;