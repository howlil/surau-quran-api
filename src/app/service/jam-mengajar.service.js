const { prisma } = require('../../lib/config/prisma.config');
const { logger } = require('../../lib/config/logger.config');
const { NotFoundError, ConflictError } = require('../../lib/http/errors.http');
const PrismaUtils = require('../../lib/utils/prisma.utils');

class JamMengajarService {
  async create(data) {
    try {
      // Check if teaching time with same hours already exists
      const existing = await prisma.jamMengajar.findFirst({
        where: { 
          jamMulai: data.jamMulai,
          jamSelesai: data.jamSelesai
        }
      });

      if (existing) {
        throw new ConflictError(`Jam mengajar dengan waktu ${data.jamMulai} - ${data.jamSelesai} sudah ada`);
      }

      const jamMengajar = await prisma.jamMengajar.create({
        data
      });

      logger.info(`Created jamMengajar with ID: ${jamMengajar.id}`);
      return jamMengajar;
    } catch (error) {
      logger.error('Error creating jamMengajar:', error);
      throw error;
    }
  }

  async update(id, data) {
    try {
      // Check if jamMengajar exists
      const jamMengajar = await prisma.jamMengajar.findUnique({
        where: { id }
      });

      if (!jamMengajar) {
        throw new NotFoundError(`Jam mengajar dengan ID ${id} tidak ditemukan`);
      }

      // Check if time is being changed and if it already exists
      if ((data.jamMulai && data.jamMulai !== jamMengajar.jamMulai) || 
          (data.jamSelesai && data.jamSelesai !== jamMengajar.jamSelesai)) {
        const existing = await prisma.jamMengajar.findFirst({
          where: { 
            jamMulai: data.jamMulai || jamMengajar.jamMulai,
            jamSelesai: data.jamSelesai || jamMengajar.jamSelesai,
            id: { not: id }
          }
        });

        if (existing) {
          throw new ConflictError(`Jam mengajar dengan waktu ${data.jamMulai || jamMengajar.jamMulai} - ${data.jamSelesai || jamMengajar.jamSelesai} sudah ada`);
        }
      }

      const updated = await prisma.jamMengajar.update({
        where: { id },
        data
      });

      logger.info(`Updated jamMengajar with ID: ${id}`);
      return updated;
    } catch (error) {
      logger.error(`Error updating jamMengajar with ID ${id}:`, error);
      throw error;
    }
  }

  async delete(id) {
    try {
      // Check if jamMengajar exists
      const jamMengajar = await prisma.jamMengajar.findUnique({
        where: { id }
      });

      if (!jamMengajar) {
        throw new NotFoundError(`Jam mengajar dengan ID ${id} tidak ditemukan`);
      }

      // Check if jamMengajar is being used in KelasProgram
      const kelasProgram = await prisma.kelasProgram.findFirst({
        where: { jamMengajarId: id }
      });

      if (kelasProgram) {
        throw new ConflictError('Jam mengajar sedang digunakan dalam program kelas dan tidak dapat dihapus');
      }

      await prisma.jamMengajar.delete({
        where: { id }
      });

      logger.info(`Deleted jamMengajar with ID: ${id}`);
      return { id };
    } catch (error) {
      logger.error(`Error deleting jamMengajar with ID ${id}:`, error);
      throw error;
    }
  }

  

  async getAll(filters = {}) {
    try {
      const { page = 1, limit = 10, jamMulai, jamSelesai } = filters;
      
      const where = {};
      if (jamMulai) {
        where.jamMulai = { contains: jamMulai };
      }
      if (jamSelesai) {
        where.jamSelesai = { contains: jamSelesai };
      }

      return await PrismaUtils.paginate(prisma.jamMengajar, {
        page,
        limit,
        where,
        orderBy: { jamMulai: 'asc' }
      });
    } catch (error) {
      logger.error('Error getting all jamMengajar:', error);
      throw error;
    }
  }
}

module.exports = new JamMengajarService();