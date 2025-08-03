const { prisma } = require('../../lib/config/prisma.config');
const { logger } = require('../../lib/config/logger.config');
const { NotFoundError, ConflictError, BadRequestError } = require('../../lib/http/errors.http');
const PrismaUtils = require('../../lib/utils/prisma.utils');
const { Prisma } = require('@prisma/client');

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
          Pendaftaran: true,
          PeriodeSpp: true
        }
      });

      if (!voucher) {
        throw new NotFoundError(`Voucher dengan ID ${id} tidak ditemukan`);
      }

      if (voucher.Pendaftaran.length > 0 || voucher.PeriodeSpp.length > 0) {
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
    const { page = 1, limit = 10, nama } = filters;
    try {
      const where = {};
      
      if (nama) {
        where.OR = [
          { namaVoucher: { contains: nama } },
          { kodeVoucher: { contains: nama } }
        ];
      }

      const voucherList = await PrismaUtils.paginate(prisma.voucher, {
        page,
        limit,
        where,
        select: {
          id: true,
          kodeVoucher: true,
          namaVoucher: true,
          tipe: true,
          nominal: true,
          isActive: true
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      return voucherList;
    } catch (error) {
      logger.error('Error getting all vouchers:', error);
      if (error instanceof Prisma.PrismaClientValidationError) {
        throw new BadRequestError('Invalid field selection in voucher query');
      }
      throw error;
    }
  }


  async getVoucherByKode(kodeVoucher) {
    try {
      const voucher = await prisma.voucher.findUnique({
        where: { kodeVoucher },
        select: {
          id: true,
          kodeVoucher: true,
          tipe: true,
          nominal: true,
        }
      });

      if (!voucher) {
        throw new NotFoundError(`Voucher dengan kode ${kodeVoucher} tidak ditemukan`);
      }

      return voucher;
    } catch (error) {
      logger.error(`Error getting voucher by kode ${kodeVoucher}:`, error);
      throw error;
    }
  }
  
  

}

module.exports = new VoucherService();