const { prisma } = require('../../lib/config/prisma.config');
const { logger } = require('../../lib/config/logger.config');
const { NotFoundError, ConflictError, BadRequestError } = require('../../lib/http/errors.http');

class ProgramService {
  async create(data) {
    try {
      // Check if program with same name already exists
      const existing = await prisma.program.findFirst({
        where: { namaProgram: data.namaProgram }
      });

      if (existing) {
        throw new ConflictError(`Program dengan nama ${data.namaProgram} sudah ada`);
      }

      const program = await prisma.program.create({
        data
      });

      logger.info(`Created program with ID: ${program.id}`);
      return program;
    } catch (error) {
      logger.error('Error creating program:', error);
      throw error;
    }
  }

  async update(id, data) {
    try {
      // Check if program exists
      const program = await prisma.program.findUnique({
        where: { id }
      });

      if (!program) {
        throw new NotFoundError(`Program dengan ID ${id} tidak ditemukan`);
      }

      // Check if name is being changed and if it already exists
      if (data.namaProgram && data.namaProgram !== program.namaProgram) {
        const existing = await prisma.program.findFirst({
          where: {
            namaProgram: data.namaProgram,
            id: { not: id }
          }
        });

        if (existing) {
          throw new ConflictError(`Program dengan nama ${data.namaProgram} sudah ada`);
        }
      }

      const updated = await prisma.program.update({
        where: { id },
        data
      });

      logger.info(`Updated program with ID: ${id}`);
      return updated;
    } catch (error) {
      logger.error(`Error updating program with ID ${id}:`, error);
      throw error;
    }
  }

  async delete(id) {
    try {
      // Check if program exists
      const program = await prisma.program.findUnique({
        where: { id }
      });

      if (!program) {
        throw new NotFoundError(`Program dengan ID ${id} tidak ditemukan`);
      }

      // Check if program is being used in KelasProgram or ProgramSiswa
      const kelasProgram = await prisma.kelasProgram.findFirst({
        where: { programId: id }
      });

      if (kelasProgram) {
        throw new ConflictError('Program sedang digunakan dalam kelas program dan tidak dapat dihapus');
      }

      const programSiswa = await prisma.programSiswa.findFirst({
        where: { programId: id }
      });

      if (programSiswa) {
        throw new ConflictError('Program sedang digunakan oleh siswa dan tidak dapat dihapus');
      }

      await prisma.program.delete({
        where: { id }
      });

      logger.info(`Deleted program with ID: ${id}`);
      return { id };
    } catch (error) {
      logger.error(`Error deleting program with ID ${id}:`, error);
      throw error;
    }
  }

  async getAll() {
    try {
      const programList = await prisma.program.findMany({
        select: {
          id: true,
          namaProgram: true
        },
        orderBy: { namaProgram: 'asc' }
      });

      return programList;
    } catch (error) {
      logger.error('Error getting all programs:', error);
      throw error;
    }

  }

  async getAllPublic() {
    try {
      const programList = await prisma.program.findMany({
        select: {
          id: true,
          namaProgram: true,
          deskripsi: true,
          cover: true
        },
        orderBy: { namaProgram: 'asc' }
      });

      return programList;
    } catch (error) {
      logger.error('Error getting all public programs:', error);
      throw error;
    }
  }

  async getProgramStudents(programId) {
    try {

      const programSiswaList = await prisma.programSiswa.findMany({
        where: {
          kelasProgramId: null,
          status: 'AKTIF',
          programId: programId
        },
        include: {
          siswa: true
        }
      });

      // 3. Mapping ke response
      const result = programSiswaList.map(ps => ({
        programSiswaId: ps.id,
        siswaId: ps.siswa.id,
        namaSiswa: ps.siswa.namaMurid,
        NIS: ps.siswa.nis
      }));

      return result;

    } catch (error) {
      logger.error('Error getting program students:', error);
      throw error;
    }
  }

  async addKelasPengganti(guruId, data) {
    try {
      const { kelasProgramId, siswaId, tanggal } = data;

      // Validasi bahwa guru berwenang untuk kelas program ini
      const kelasProgram = await prisma.kelasProgram.findFirst({
        where: {
          id: kelasProgramId,
          guruId
        }
      });

      if (!kelasProgram) {
        throw new NotFoundError('Kelas program tidak ditemukan atau guru tidak berwenang');
      }

      // Validasi bahwa siswa ada
      const siswa = await prisma.siswa.findUnique({
        where: { id: siswaId }
      });

      if (!siswa) {
        throw new NotFoundError('Siswa tidak ditemukan');
      }

      // Validasi tanggal tidak boleh di masa lalu
      const today = new Date().toISOString().split('T')[0];
      if (tanggal < today) {
        throw new BadRequestError('Tanggal tidak boleh di masa lalu');
      }

      // Cek apakah sudah ada kelas pengganti untuk siswa ini di tanggal yang sama (termasuk yang soft deleted)
      const existingKelasPengganti = await prisma.kelasPengganti.findFirst({
        where: {
          siswaId,
          tanggal,
          isTemp: true,
          deletedAt: null // Hanya yang belum di soft delete
        }
      });

      if (existingKelasPengganti) {
        throw new ConflictError('Siswa sudah ditambahkan ke kelas pengganti di tanggal yang sama');
      }

      // Cek jumlah kelas pengganti siswa dalam 1 bulan (maksimal 2x)
      const [year, month] = tanggal.split('-');
      const startOfMonth = `${year}-${month}-01`;
      const endOfMonth = new Date(parseInt(year), parseInt(month), 0).toISOString().split('T')[0];

      const monthlyCount = await prisma.kelasPengganti.count({
        where: {
          siswaId,
          tanggal: {
            gte: startOfMonth,
            lte: endOfMonth
          },
          isTemp: true
        }
      });

      if (monthlyCount >= 2) {
        throw new BadRequestError('Siswa sudah mencapai batas maksimal kelas pengganti dalam 1 bulan (2x)');
      }

      // Cek apakah siswa sudah ada di kelas program ini secara permanen
      const existingProgramSiswa = await prisma.programSiswa.findFirst({
        where: {
          siswaId,
          kelasProgramId,
          status: 'AKTIF'
        }
      });

      if (existingProgramSiswa) {
        throw new ConflictError('Siswa sudah terdaftar di kelas program ini secara permanen');
      }

      // Tambahkan siswa ke kelas pengganti
      const kelasPengganti = await prisma.kelasPengganti.create({
        data: {
          kelasProgramId,
          siswaId,
          tanggal,
          isTemp: true,
          count: 1
        },
        include: {
          siswa: {
            select: {
              id: true,
              namaMurid: true,
              nis: true
            }
          },
          kelasProgram: {
            include: {
              program: {
                select: {
                  namaProgram: true
                }
              },
              jamMengajar: {
                select: {
                  jamMulai: true,
                  jamSelesai: true
                }
              }
            }
          }
        }
      });

      logger.info(`Added student ${siswaId} to substitute class ${kelasProgramId} for date ${tanggal}`);

      return {
        id: kelasPengganti.id,
        siswaId: kelasPengganti.siswa.id,
        namaSiswa: kelasPengganti.siswa.namaMurid,
        nis: kelasPengganti.siswa.nis,
        tanggal: kelasPengganti.tanggal,
        namaProgram: kelasPengganti.kelasProgram.program.namaProgram,
        jamMengajar: {
          jamMulai: kelasPengganti.kelasProgram.jamMengajar.jamMulai,
          jamSelesai: kelasPengganti.kelasProgram.jamMengajar.jamSelesai
        }
      };
    } catch (error) {
      logger.error('Error adding student to substitute class:', error);
      throw error;
    }
  }

  async removeKelasPengganti(guruId, kelasProgramId) {
    try {
      // Validasi bahwa guru berwenang untuk kelas program ini
      const kelasProgram = await prisma.kelasProgram.findFirst({
        where: {
          id: kelasProgramId,
          guruId
        }
      });

      if (!kelasProgram) {
        throw new NotFoundError('Kelas program tidak ditemukan atau guru tidak berwenang');
      }

      // Cari semua kelas pengganti yang aktif untuk kelas program ini
      const kelasPenggantiList = await prisma.kelasPengganti.findMany({
        where: {
          kelasProgramId,
          isTemp: true,
          deletedAt: null // Hanya yang belum di soft delete
        },
        include: {
          siswa: {
            select: {
              id: true,
              namaMurid: true,
              nis: true
            }
          }
        }
      });

      if (kelasPenggantiList.length === 0) {
        throw new NotFoundError('Tidak ada siswa dalam kelas pengganti untuk kelas program ini');
      }

      // Soft delete semua kelas pengganti untuk kelas program ini
      const deletedIds = kelasPenggantiList.map(kp => kp.id);

      await prisma.kelasPengganti.updateMany({
        where: {
          id: { in: deletedIds }
        },
        data: {
          deletedAt: new Date(),
          updatedAt: new Date()
        }
      });

      logger.info(`Soft deleted ${kelasPenggantiList.length} students from substitute class ${kelasProgramId}`);

      return {
        message: `${kelasPenggantiList.length} siswa berhasil dihapus dari kelas pengganti`,
        kelasProgramId,
        totalDeleted: kelasPenggantiList.length,
        deletedStudents: kelasPenggantiList.map(kp => ({
          siswaId: kp.siswaId,
          namaSiswa: kp.siswa.namaMurid,
          nis: kp.siswa.nis,
          tanggal: kp.tanggal
        }))
      };
    } catch (error) {
      logger.error('Error removing students from substitute class:', error);
      throw error;
    }
  }

  async getKelasPenggantiByKelasProgram(kelasProgramId, tanggal) {
    try {
      const kelasPengganti = await prisma.kelasPengganti.findMany({
        where: {
          kelasProgramId,
          tanggal,
          isTemp: true,
          deletedAt: null // Hanya yang belum di soft delete
        },
        include: {
          siswa: {
            select: {
              id: true,
              namaMurid: true,
              nis: true
            }
          }
        }
      });

      return kelasPengganti.map(kp => ({
        id: kp.id,
        siswaId: kp.siswa.id,
        namaSiswa: kp.siswa.namaMurid,
        nis: kp.siswa.nis,
        tanggal: kp.tanggal
      }));
    } catch (error) {
      logger.error('Error getting substitute class students:', error);
      throw error;
    }
  }

}

module.exports = new ProgramService();