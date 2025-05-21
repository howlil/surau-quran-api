const { prisma } = require('../../lib/config/prisma.config');
const { logger } = require('../../lib/config/logger.config');
const { NotFoundError, ConflictError } = require('../../lib/http/errors.http');
const PrismaUtils = require('../../lib/utils/prisma.utils');

class VoucherService {
  async create(data) {
    try {
      const existing = await prisma.voucher.findUnique({
        where: { kodeVoucher: data.kodeVoucher }
      });

      if (existing) {
        throw new ConflictError(`Voucher dengan kode ${data.kodeVoucher} sudah ada`);
      }

      const voucher = await prisma.voucher.create({
        data
      });

      logger.info(`Created voucher with ID: ${voucher.id}`);
      return voucher;
    } catch (error) {
      logger.error('Error creating voucher:', error);
      throw error;
    }
  }

  async update(id, data) {
    try {
      const voucher = await prisma.voucher.findUnique({
        where: { id }
      });

      if (!voucher) {
        throw new NotFoundError(`Voucher dengan ID ${id} tidak ditemukan`);
      }

      if (data.kodeVoucher && data.kodeVoucher !== voucher.kodeVoucher) {
        const existing = await prisma.voucher.findFirst({
          where: {
            kodeVoucher: data.kodeVoucher,
            id: { not: id }
          }
        });

        if (existing) {
          throw new ConflictError(`Voucher dengan kode ${data.kodeVoucher} sudah ada`);
        }
      }

      const updated = await prisma.voucher.update({
        where: { id },
        data
      });

      logger.info(`Updated voucher with ID: ${id}`);
      return updated;
    } catch (error) {
      logger.error(`Error updating voucher with ID ${id}:`, error);
      throw error;
    }
  }

  async delete(id) {
    try {
      const voucher = await prisma.voucher.findUnique({
        where: { id },
        include: {
          pendaftaran: true,
          periodeSpp: true
        }
      });

      if (!voucher) {
        throw new NotFoundError(`Voucher dengan ID ${id} tidak ditemukan`);
      }

      if (voucher.pendaftaran.length > 0 || voucher.periodeSpp.length > 0) {
        throw new ConflictError('Voucher sedang digunakan dan tidak dapat dihapus');
      }

      await prisma.voucher.delete({
        where: { id }
      });

      logger.info(`Deleted voucher with ID: ${id}`);
      return { message: 'Voucher berhasil dihapus' };
    } catch (error) {
      logger.error(`Error deleting voucher with ID ${id}:`, error);
      throw error;
    }
  }


  async getAll(filters = {}) {
    try {
      const { page = 1, limit = 10, kodeVoucher, tipe, isActive } = filters;
      
      const where = {};
      if (kodeVoucher) {
        where.kodeVoucher = { contains: kodeVoucher, mode: 'insensitive' };
      }
      if (tipe) {
        where.tipe = tipe;
      }
      if (isActive !== undefined) {
        where.isActive = isActive === 'true';
      }

      return await PrismaUtils.paginate(prisma.voucher, {
        page,
        limit,
        where,
        include: {
          _count: {
            select: {
              pendaftaran: true,
              periodeSpp: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });
    } catch (error) {
      logger.error('Error getting all vouchers:', error);
      throw error;
    }
  }

 

 
}

module.exports = new VoucherService();