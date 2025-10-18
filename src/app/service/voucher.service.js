const prisma  = require('../../lib/config/prisma.config');
const ErrorFactory = require('../../lib/factories/error.factory');
const PrismaUtils = require('../../lib/utils/prisma.utils');
const logger = require('../../lib/config/logger.config');

class VoucherService {
  async create(options) {
    try {
      const { data } = options;
      
      const existing = await prisma.voucher.findUnique({
        where: { kodeVoucher: data.kodeVoucher }
      });

      if (existing) {
        throw ErrorFactory.badRequest(`Voucher dengan kode ${data.kodeVoucher} sudah ada`);
      }

      const voucher = await prisma.voucher.create({
        data
      });

      return voucher;
    } catch (error) {
      throw error
    }
  }

  async update(options) {
    try {
      const { data, where } = options;
      const { id } = where;
      
      const voucher = await prisma.voucher.findUnique({
        where: { id }
      });

      if (!voucher) {
        throw ErrorFactory.notFound(`Voucher dengan ID ${id} tidak ditemukan`);
      }

      if (data.kodeVoucher && data.kodeVoucher !== voucher.kodeVoucher) {
        const existing = await prisma.voucher.findFirst({
          where: {
            kodeVoucher: data.kodeVoucher,
            id: { not: id }
          }
        });

        if (existing) {
          throw ErrorFactory.badRequest(`Voucher dengan kode ${data.kodeVoucher} sudah ada`);
        }
      }

      const updated = await prisma.voucher.update({
        where: { id },
        data
      });

      return updated;
    } catch (error) {
      throw error
    }
  }

  async delete(options) {
    try {
      const { where } = options;
      const { id } = where;
      
      const voucher = await prisma.voucher.findUnique({
        where: { id },
        include: {
          Pendaftaran: true,
          PeriodeSpp: true
        }
      });

      if (!voucher) {
        throw ErrorFactory.notFound(`Voucher dengan ID ${id} tidak ditemukan`);
      }

      if (voucher.Pendaftaran.length > 0 || voucher.PeriodeSpp.length > 0) {
        throw ErrorFactory.badRequest('Voucher sedang digunakan dan tidak dapat dihapus');
      }

      await prisma.voucher.delete({
        where: { id }
      });

      return { message: 'Voucher berhasil dihapus' };
    } catch (error) {
      throw error
    }
  }

  async getAll(options = {}) {
    const { data: filters = {}, where: additionalWhere = {} } = options;
    const { page = 1, limit = 10, nama } = filters;
    try {
      const where = { ...additionalWhere };

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
      throw error
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
        throw ErrorFactory.notFound(`Voucher dengan kode ${kodeVoucher} tidak ditemukan`);
      }

      return voucher;
    } catch (error) {
      throw error
    }
  }



}

module.exports = new VoucherService();