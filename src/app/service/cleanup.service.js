const { prisma } = require('../../lib/config/prisma.config');
const { logger } = require('../../lib/config/logger.config');
const paymentService = require('../service/payment.service');

class CleanupService {
  async cleanupExpiredPayments() {
    try {
      const now = new Date();
      
      const expiredPayments = await prisma.pembayaran.findMany({
        where: {
          statusPembayaran: 'PENDING',
          xenditPayment: {
            xenditExpireDate: {
              lt: now.toISOString()
            }
          }
        },
        include: {
          xenditPayment: true,
          pendaftaran: true,
          periodeSpp: true
        }
      });

      let cleanedCount = 0;
      let errors = [];

      for (const payment of expiredPayments) {
        try {
          await paymentService.expirePayment(payment.id);
          cleanedCount++;
          
          logger.info(`Expired payment ${payment.id} cleaned up`);
        } catch (error) {
          errors.push({
            paymentId: payment.id,
            error: error.message
          });
          logger.error(`Failed to expire payment ${payment.id}:`, error);
        }
      }

      logger.info(`Cleanup completed: ${cleanedCount} payments expired, ${errors.length} errors`);

      return {
        success: true,
        cleanedCount,
        errors,
        totalProcessed: expiredPayments.length
      };
    } catch (error) {
      logger.error('Error during payment cleanup:', error);
      throw error;
    }
  }

  async cleanupExpiredPendaftaran() {
    try {
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      const expiredPendaftaran = await prisma.pendaftaranTemp.findMany({
        where: {
          createdAt: {
            lt: oneDayAgo
          },
          pembayaran: {
            statusPembayaran: {
              in: ['PENDING', 'EXPIRED']
            }
          }
        },
        include: {
          pembayaran: {
            include: {
              xenditPayment: true
            }
          }
        }
      });

      let cleanedCount = 0;
      let errors = [];

      for (const pendaftaran of expiredPendaftaran) {
        try {
          if (pendaftaran.pembayaran?.id) {
            await paymentService.expirePayment(pendaftaran.pembayaran.id);
          }

          await prisma.pendaftaranTemp.delete({
            where: { id: pendaftaran.id }
          });

          cleanedCount++;
          logger.info(`Expired pendaftaran ${pendaftaran.id} cleaned up`);
        } catch (error) {
          errors.push({
            pendaftaranId: pendaftaran.id,
            error: error.message
          });
          logger.error(`Failed to clean up pendaftaran ${pendaftaran.id}:`, error);
        }
      }

      logger.info(`Pendaftaran cleanup completed: ${cleanedCount} registrations cleaned, ${errors.length} errors`);

      return {
        success: true,
        cleanedCount,
        errors,
        totalProcessed: expiredPendaftaran.length
      };
    } catch (error) {
      logger.error('Error during pendaftaran cleanup:', error);
      throw error;
    }
  }

  async cleanupOldTokens() {
    try {
      const now = new Date();
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      const deletedTokens = await prisma.token.deleteMany({
        where: {
          createdAt: {
            lt: oneWeekAgo
          }
        }
      });

      logger.info(`Cleaned up ${deletedTokens.count} old tokens`);

      return {
        success: true,
        cleanedCount: deletedTokens.count
      };
    } catch (error) {
      logger.error('Error during token cleanup:', error);
      throw error;
    }
  }

  async generateSppForActiveStudents() {
    try {
      const currentDate = new Date();
      const currentMonth = currentDate.toLocaleDateString('id-ID', { month: 'long' });
      const currentYear = currentDate.getFullYear();

      const activeStudents = await prisma.programSiswa.findMany({
        where: {
          status: 'AKTIF'
        },
        include: {
          siswa: true,
          program: true,
          periodeSpp: {
            where: {
              bulan: currentMonth,
              tahun: currentYear
            }
          }
        }
      });

      let createdCount = 0;
      let errors = [];

      for (const programSiswa of activeStudents) {
        try {
          if (programSiswa.periodeSpp.length === 0) {
            const sppAmount = 250000; // Default SPP amount, bisa dari config

            await prisma.periodeSpp.create({
              data: {
                programSiswaId: programSiswa.id,
                bulan: currentMonth,
                tahun: currentYear,
                tanggalTagihan: `${currentYear}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-01`,
                jumlahTagihan: sppAmount,
                totalTagihan: sppAmount
              }
            });

            createdCount++;
            logger.info(`Created SPP for student ${programSiswa.siswa.namaMurid} - ${currentMonth} ${currentYear}`);
          }
        } catch (error) {
          errors.push({
            studentId: programSiswa.siswa.id,
            studentName: programSiswa.siswa.namaMurid,
            error: error.message
          });
          logger.error(`Failed to create SPP for student ${programSiswa.siswa.namaMurid}:`, error);
        }
      }

      logger.info(`SPP generation completed: ${createdCount} SPP created, ${errors.length} errors`);

      return {
        success: true,
        createdCount,
        errors,
        totalProcessed: activeStudents.length,
        period: `${currentMonth} ${currentYear}`
      };
    } catch (error) {
      logger.error('Error during SPP generation:', error);
      throw error;
    }
  }

  async runDailyCleanup() {
    try {
      logger.info('Starting daily cleanup process...');

      const results = await Promise.allSettled([
        this.cleanupExpiredPayments(),
        this.cleanupExpiredPendaftaran(),
        this.cleanupOldTokens()
      ]);

      const summary = {
        timestamp: new Date().toISOString(),
        paymentCleanup: results[0].status === 'fulfilled' ? results[0].value : { error: results[0].reason?.message },
        pendaftaranCleanup: results[1].status === 'fulfilled' ? results[1].value : { error: results[1].reason?.message },
        tokenCleanup: results[2].status === 'fulfilled' ? results[2].value : { error: results[2].reason?.message }
      };

      logger.info('Daily cleanup completed:', summary);

      return summary;
    } catch (error) {
      logger.error('Error during daily cleanup:', error);
      throw error;
    }
  }

  async runMonthlyTasks() {
    try {
      logger.info('Starting monthly tasks...');

      const sppGeneration = await this.generateSppForActiveStudents();

      const summary = {
        timestamp: new Date().toISOString(),
        sppGeneration
      };

      logger.info('Monthly tasks completed:', summary);

      return summary;
    } catch (error) {
      logger.error('Error during monthly tasks:', error);
      throw error;
    }
  }

  async getCleanupStats() {
    try {
      const stats = await Promise.all([
        prisma.pembayaran.count({
          where: {
            statusPembayaran: 'PENDING',
            xenditPayment: {
              xenditExpireDate: {
                lt: new Date().toISOString()
              }
            }
          }
        }),
        prisma.pendaftaranTemp.count({
          where: {
            createdAt: {
              lt: new Date(Date.now() - 24 * 60 * 60 * 1000)
            }
          }
        }),
        prisma.token.count({
          where: {
            createdAt: {
              lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
            }
          }
        })
      ]);

      return {
        expiredPayments: stats[0],
        expiredPendaftaran: stats[1],
        oldTokens: stats[2],
        lastCheck: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Error getting cleanup stats:', error);
      throw error;
    }
  }
}

module.exports = new CleanupService();