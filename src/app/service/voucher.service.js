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

  async getById(id) {
    try {
      const voucher = await prisma.voucher.findUnique({
        where: { id },
        include: {
          _count: {
            select: {
              pendaftaran: true,
              periodeSpp: true
            }
          }
        }
      });

      if (!voucher) {
        throw new NotFoundError(`Voucher dengan ID ${id} tidak ditemukan`);
      }

      return voucher;
    } catch (error) {
      logger.error(`Error getting voucher with ID ${id}:`, error);
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

  async getByCode(kodeVoucher) {
    try {
      const voucher = await prisma.voucher.findUnique({
        where: { kodeVoucher },
        include: {
          _count: {
            select: {
              pendaftaran: true,
              periodeSpp: true
            }
          }
        }
      });

      if (!voucher) {
        throw new NotFoundError(`Voucher dengan kode ${kodeVoucher} tidak ditemukan`);
      }

      if (!voucher.isActive) {
        throw new ConflictError('Voucher tidak aktif');
      }

      const totalUsage = voucher._count.pendaftaran + voucher._count.periodeSpp;
      if (totalUsage >= voucher.jumlahPenggunaan) {
        throw new ConflictError('Voucher sudah habis digunakan');
      }

      return voucher;
    } catch (error) {
      logger.error(`Error getting voucher with code ${kodeVoucher}:`, error);
      throw error;
    }
  }

  async toggleStatus(id) {
    try {
      const voucher = await prisma.voucher.findUnique({
        where: { id }
      });

      if (!voucher) {
        throw new NotFoundError(`Voucher dengan ID ${id} tidak ditemukan`);
      }

      const updated = await prisma.voucher.update({
        where: { id },
        data: { isActive: !voucher.isActive }
      });

      logger.info(`Toggled voucher status with ID: ${id} to ${updated.isActive}`);
      return updated;
    } catch (error) {
      logger.error(`Error toggling voucher status with ID ${id}:`, error);
      throw error;
    }
  }

  async getUsageReport(id) {
    try {
      const voucher = await prisma.voucher.findUnique({
        where: { id },
        include: {
          pendaftaran: {
            include: {
              siswa: {
                select: {
                  id: true,
                  namaMurid: true
                }
              }
            }
          },
          periodeSpp: {
            include: {
              programSiswa: {
                include: {
                  siswa: {
                    select: {
                      id: true,
                      namaMurid: true
                    }
                  }
                }
              }
            }
          }
        }
      });

      if (!voucher) {
        throw new NotFoundError(`Voucher dengan ID ${id} tidak ditemukan`);
      }

      const usage = {
        pendaftaran: voucher.pendaftaran.map(p => ({
          id: p.id,
          siswa: p.siswa.namaMurid,
          tanggal: p.tanggalDaftar,
          diskon: p.diskon
        })),
        periodeSpp: voucher.periodeSpp.map(p => ({
          id: p.id,
          siswa: p.programSiswa.siswa.namaMurid,
          bulan: p.bulan,
          tahun: p.tahun,
          diskon: p.diskon
        }))
      };

      const totalUsage = voucher.pendaftaran.length + voucher.periodeSpp.length;

      return {
        voucher: {
          id: voucher.id,
          kodeVoucher: voucher.kodeVoucher,
          tipe: voucher.tipe,
          nominal: voucher.nominal,
          jumlahPenggunaan: voucher.jumlahPenggunaan,
          totalPenggunaan: totalUsage,
          sisaPenggunaan: voucher.jumlahPenggunaan - totalUsage,
          isActive: voucher.isActive
        },
        penggunaan: usage
      };
    } catch (error) {
      logger.error(`Error getting usage report for voucher ${id}:`, error);
      throw error;
    }
  }
}

module.exports = new VoucherService();