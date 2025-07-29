// File: src/lib/services/payroll-cron.service.js
const cron = require('node-cron');
const { prisma } = require('../../lib/config/prisma.config');
const { logger } = require('../../lib/config/logger.config');
const moment = require('moment');
const { DATE_FORMATS } = require('../../lib/constants');

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
      const bulan = moment().format('MMMM');
      const tahun = moment().year();
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

          // Get attendance data for the current month
          const absensiData = await prisma.absensiGuru.findMany({
            where: {
              guruId: guru.id,
              tanggal: {
                contains: `-${moment().format('MM')}-${tahun}`
              }
            },
            include: {
              kelasProgram: {
                select: {
                  tipeKelas: true
                }
              }
            }
          });

          const HONOR_RATES = {
            GROUP: 35000,
            PRIVATE: 35000,
            SUBSTITUTE: 25000,
            ONLINE: 25000
          };

          let gajiPokok = 0;
          let totalInsentif = 0;
          let totalPotongan = 0;
          let totalSKS = 0;

          // Track daily SKS for incentive calculation
          const dailySKS = {};

          absensiData.forEach(absensi => {
            if (absensi.statusKehadiran === 'HADIR') {
              const tipeKelas = absensi.kelasProgram.tipeKelas;
              const honorPerSKS = HONOR_RATES[tipeKelas];

              // Add to base salary
              gajiPokok += absensi.sks * honorPerSKS;
              totalSKS += absensi.sks;

              // Track daily SKS for incentive
              if (!dailySKS[absensi.tanggal]) {
                dailySKS[absensi.tanggal] = 0;
              }
              dailySKS[absensi.tanggal] += absensi.sks;

              // Add attendance incentive if applicable
              if (absensi.insentifKehadiran) {
                totalInsentif += Number(absensi.insentifKehadiran);
              }
            }

            // Calculate penalties
            if (absensi.potonganTerlambat) {
              totalPotongan += Number(absensi.potonganTerlambat);
            }
            if (absensi.potonganTanpaKabar) {
              totalPotongan += Number(absensi.potonganTanpaKabar);
            }
            if (absensi.potonganTanpaSuratIzin) {
              totalPotongan += Number(absensi.potonganTanpaSuratIzin);
            }
          });

          // Calculate attendance incentive (Rp 10,000 per day with minimum 2 SKS)
          Object.entries(dailySKS).forEach(([date, sks]) => {
            if (sks >= 2) {
              totalInsentif += 10000;
            }
          });

          const totalGaji = gajiPokok + totalInsentif - totalPotongan;

          const payroll = await prisma.payroll.create({
            data: {
              guruId: guru.id,
              periode,
              bulan,
              tahun,
              gajiPokok,
              insentif: totalInsentif,
              potongan: totalPotongan,
              totalGaji,
              status: 'DRAFT',
              tanggalKalkulasi: moment().toDate()
            }
          });

          results.push({
            guruId: guru.id,
            nama: guru.nama,
            payrollId: payroll.id,
            totalSKS,
            gajiPokok,
            insentif: totalInsentif,
            potongan: totalPotongan,
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
              }
            },
            include: {
              kelasProgram: {
                select: {
                  tipeKelas: true
                }
              }
            }
          });

          // Calculate base salary based on SKS and class type
          const HONOR_RATES = {
            GROUP: 35000,
            PRIVATE: 35000,
            SUBSTITUTE: 25000,
            ONLINE: 25000
          };

          let gajiPokok = 0;
          let totalInsentif = 0;
          let totalPotongan = 0;
          let totalSKS = 0;

          // Track daily SKS for incentive calculation
          const dailySKS = {};

          absensiData.forEach(absensi => {
            if (absensi.statusKehadiran === 'HADIR') {
              const tipeKelas = absensi.kelasProgram.tipeKelas;
              const honorPerSKS = HONOR_RATES[tipeKelas];

              // Add to base salary
              gajiPokok += absensi.sks * honorPerSKS;
              totalSKS += absensi.sks;

              // Track daily SKS for incentive
              if (!dailySKS[absensi.tanggal]) {
                dailySKS[absensi.tanggal] = 0;
              }
              dailySKS[absensi.tanggal] += absensi.sks;

              // Add attendance incentive if applicable
              if (absensi.insentifKehadiran) {
                totalInsentif += Number(absensi.insentifKehadiran);
              }
            }

            // Calculate penalties
            if (absensi.potonganTerlambat) {
              totalPotongan += Number(absensi.potonganTerlambat);
            }
            if (absensi.potonganTanpaKabar) {
              totalPotongan += Number(absensi.potonganTanpaKabar);
            }
            if (absensi.potonganTanpaSuratIzin) {
              totalPotongan += Number(absensi.potonganTanpaSuratIzin);
            }
          });

          // Calculate attendance incentive (Rp 10,000 per day with minimum 2 SKS)
          Object.entries(dailySKS).forEach(([date, sks]) => {
            if (sks >= 2) {
              totalInsentif += 10000;
            }
          });

          const totalGaji = gajiPokok + totalInsentif - totalPotongan;

          const payroll = await prisma.payroll.create({
            data: {
              guruId: guru.id,
              periode,
              bulan,
              tahun: Number(tahun),
              gajiPokok,
              insentif: totalInsentif,
              potongan: totalPotongan,
              totalGaji,
              status: 'DRAFT',
              tanggalKalkulasi: moment().toDate()
            }
          });

          results.push({
            guruId: guru.id,
            nama: guru.nama,
            payrollId: payroll.id,
            totalSKS,
            gajiPokok,
            insentif: totalInsentif,
            potongan: totalPotongan,
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