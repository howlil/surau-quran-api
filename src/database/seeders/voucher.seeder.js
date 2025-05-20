const { logger } = require('../../lib/config/logger.config');
const voucherFactory = require('../factories/voucher.factory');
const { prisma } = require('../../lib/config/prisma.config');

class VoucherSeeder {
  static async seed() {
    try {
      logger.info('Seeding vouchers...');
      
      // Create vouchers individually to handle potential unique constraint conflicts
      const vouchers = [];
      
      // Create 5 percentage vouchers
      logger.info('Creating percentage vouchers...');
      for (let i = 0; i < 5; i++) {
        try {
          const voucher = await voucherFactory.with({
            tipe: 'PERSENTASE',
            nominal: 20, // 20% discount
            isActive: true,
            jumlahPenggunaan: 50
          }).createOne();
          
          vouchers.push(voucher);
        } catch (error) {
          if (error.code === 'P2002' && error.meta?.target?.includes('kodeVoucher')) {
            logger.warn('Duplicate voucher code generated, retrying...');
            i--; // Retry this iteration
          } else {
            throw error;
          }
        }
      }
      
      // Create 5 nominal vouchers
      logger.info('Creating nominal vouchers...');
      for (let i = 0; i < 5; i++) {
        try {
          const voucher = await voucherFactory.with({
            tipe: 'NOMINAL',
            nominal: 50000, // Rp 50.000 discount
            isActive: true,
            jumlahPenggunaan: 30
          }).createOne();
          
          vouchers.push(voucher);
        } catch (error) {
          if (error.code === 'P2002' && error.meta?.target?.includes('kodeVoucher')) {
            logger.warn('Duplicate voucher code generated, retrying...');
            i--; // Retry this iteration
          } else {
            throw error;
          }
        }
      }
      
      logger.info(`Created ${vouchers.length} voucher records`);
      
      return vouchers;
    } catch (error) {
      logger.error('Error seeding vouchers:', error);
      throw error;
    }
  }
}

module.exports = VoucherSeeder;