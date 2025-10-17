const { prisma } = require('../../lib/config/prisma.config');
const ErrorFactory = require('../../lib/factories/error.factory');

class JamMengajarService {
  async create(data) {
    try {
      const existing = await prisma.jamMengajar.findFirst({
        where: {
          jamMulai: data.jamMulai,
          jamSelesai: data.jamSelesai
        }
      });

      if (existing) {
        throw ErrorFactory.badRequest(`Jam mengajar dengan waktu ${data.jamMulai} - ${data.jamSelesai} sudah ada`);
      }

      const jamMengajar = await prisma.jamMengajar.create({
        data
      });

      return jamMengajar;
    } catch (error) {
      throw error
    }
  }

  async update(id, data) {
    try {
      const jamMengajar = await prisma.jamMengajar.findUnique({
        where: { id }
      });

      if (!jamMengajar) {
        throw ErrorFactory.notFound(`Jam mengajar dengan ID ${id} tidak ditemukan`);
      }

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
          throw ErrorFactory.badRequest(`Jam mengajar dengan waktu ${data.jamMulai || jamMengajar.jamMulai} - ${data.jamSelesai || jamMengajar.jamSelesai} sudah ada`);
        }
      }

      const updated = await prisma.jamMengajar.update({
        where: { id },
        data
      });

      return updated;
    } catch (error) {
      throw error
    }
  }

  async delete(id) {
    try {
      const jamMengajar = await prisma.jamMengajar.findUnique({
        where: { id }
      });

      if (!jamMengajar) {
        throw ErrorFactory.notFound(`Jam mengajar dengan ID ${id} tidak ditemukan`);
      }

      const kelasProgram = await prisma.kelasProgram.findFirst({
        where: { jamMengajarId: id }
      });

      if (kelasProgram) {
        throw ErrorFactory.badRequest('Jam mengajar sedang digunakan dalam program kelas dan tidak dapat dihapus');
      }

      await prisma.jamMengajar.delete({
        where: { id }
      });

      return { id };
    } catch (error) {
      throw error
    }
  }

  async getAll() {
    try {
      const jamMengajarList = await prisma.jamMengajar.findMany({
        select: {
          id: true,
          jamMulai: true,
          jamSelesai: true
        },
        orderBy: { jamMulai: 'asc' }
      });

      return jamMengajarList;
    } catch (error) {
      throw error
    }
  }
}

module.exports = new JamMengajarService();