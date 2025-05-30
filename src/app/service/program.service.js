const { prisma } = require('../../lib/config/prisma.config');
const { logger } = require('../../lib/config/logger.config');
const { NotFoundError, ConflictError } = require('../../lib/http/errors.http');

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

  async getProgramStudents(programId) {
    try {
      // 1.      

      const programSiswaList = await prisma.programSiswa.findMany({
        where: {
          kelasProgramId: null,
          status: 'AKTIF',
          programId: programId,
          isVerified: false,          
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

}

module.exports = new ProgramService();