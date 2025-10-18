const prisma  = require('../../lib/config/prisma.config');
const ErrorFactory = require('../../lib/factories/error.factory');
const PrismaUtils = require('../../lib/utils/prisma.utils');
const FileUtils = require('../../lib/utils/file.utils');
const logger = require('../../lib/config/logger.config');

class ProgramService {
  async create(options) {
    try {
      const { data } = options;
      
      const existing = await prisma.program.findFirst({
        where: { namaProgram: data.namaProgram }
      });

      if (existing) {
        throw ErrorFactory.badRequest(`Program dengan nama ${data.namaProgram} sudah ada`);
      }

      const program = await prisma.program.create({
        data
      });

      const transformedResult = FileUtils.transformProgramFiles(program);

      return {
        programId: transformedResult.id,
        namaProgram: transformedResult.namaProgram,
        deskripsi: transformedResult.deskripsi,
        cover: transformedResult.cover
      };
    } catch (error) {
      logger.error(error);
      throw error;
    }
  }

  async update(options) {
    try {
      const { data, where } = options;
      const { id } = where;
      
      // Check if program exists
      const program = await prisma.program.findUnique({
        where: { id }
      });

      if (!program) {
        throw ErrorFactory.notFound(`Program dengan ID ${id} tidak ditemukan`);
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
          throw ErrorFactory.badRequest(`Program dengan nama ${data.namaProgram} sudah ada`);
        }
      }

      const updated = await prisma.program.update({
        where: { id },
        data
      });

      const transformedResult = FileUtils.transformProgramFiles(updated);

      return {
        programId: transformedResult.id,
        namaProgram: transformedResult.namaProgram,
        deskripsi: transformedResult.deskripsi,
        cover: transformedResult.cover
      };
    } catch (error) {
      logger.error(error);
      throw error;
    }
  }

  async delete(options) {
    try {
      const { where } = options;
      const { id } = where;
      
      // Check if program exists
      const program = await prisma.program.findUnique({
        where: { id }
      });

      if (!program) {
        throw ErrorFactory.notFound(`Program dengan ID ${id} tidak ditemukan`);
      }

      // Check if program is being used in KelasProgram or ProgramSiswa
      const kelasProgram = await prisma.kelasProgram.findFirst({
        where: { programId: id }
      });

      if (kelasProgram) {
        throw ErrorFactory.badRequest('Program sedang digunakan dalam kelas program dan tidak dapat dihapus');
      }

      const programSiswa = await prisma.programSiswa.findFirst({
        where: { programId: id }
      });

      if (programSiswa) {
        throw ErrorFactory.badRequest('Program sedang digunakan oleh siswa dan tidak dapat dihapus');
      }

      await prisma.program.delete({
        where: { id }
      });

      return { id };
    } catch (error) {
      logger.error(error);
      throw error;
    }
  }

  async getAll(options = {}) {
    try {
      const { data: filters = {}, where: additionalWhere = {} } = options;
      const { page, limit, namaProgram } = filters;

      const where = { ...additionalWhere };

      if (namaProgram) {
        where.namaProgram = {
          contains: namaProgram
        };
      }

      return await PrismaUtils.paginate(prisma.program, {
        page,
        limit,
        where,
        select: {
          id: true,
          namaProgram: true,
          deskripsi: true,
          tipeProgram: true,
          cover: true,
          biayaSpp: true,
          createdAt: true,
          updatedAt: true
        },
        orderBy: { namaProgram: 'asc' }
      });
    } catch (error) {
      logger.error(error);
      throw error;
    }
  }

  async getAllNoPagination(options = {}) {
    try {
      const { filters = {} } = options;
      const { namaProgram } = filters;
      const where = {};
      
      if (namaProgram) {
        where.namaProgram = {
          contains: namaProgram
        };
      }
      
      const programs = await prisma.program.findMany({
        where,
        select: {
          id: true,
          namaProgram: true,
          deskripsi: true,
          tipeProgram: true,
          cover: true,
          biayaSpp: true,
          createdAt: true,
          updatedAt: true
        },
        orderBy: { namaProgram: 'asc' }
      });

      return programs.map(program => ({
        programId: program.id,
        namaProgram: program.namaProgram,
        deskripsi: program.deskripsi,
        cover: program.cover ? FileUtils.getImageUrl(program.cover) : null,
        tipeProgram: program.tipeProgram,
        biayaSpp: Number(program.biayaSpp),
        createdAt: program.createdAt,
        updatedAt: program.updatedAt
      }));
    } catch (error) {
      logger.error(error);
      throw error;
    }
  }

  async getAllPublic(options = {}) {
    try {
      const programList = await prisma.program.findMany({
        select: {
          id: true,
          namaProgram: true,
          deskripsi: true,
          tipeProgram: true,
          cover: true
        },
        orderBy: { namaProgram: 'asc' }
      });

      const transformedResult = FileUtils.transformProgramListFiles(programList);
      return transformedResult.map(program => ({
        programId: program.id,
        namaProgram: program.namaProgram,
        deskripsi: program.deskripsi,
        tipeProgram: program.tipeProgram,
        cover: program.cover
      }));
    } catch (error) {
      logger.error(error);
      throw error;
    }
  }

  async getProgramStudents(options) {
    try {
      const { data, filters = {} } = options;
      const { programId } = data;
      const { page = 1, limit = 10 } = filters;

      // Ambil informasi program untuk menentukan tipe dan nama
      const program = await prisma.program.findUnique({
        where: { id: programId },
        select: {
          id: true,
          namaProgram: true,
          tipeProgram: true
        }
      });

      if (!program) {
        throw new Error('Program tidak ditemukan');
      }

      // Tentukan subtipe private berdasarkan nama program
      const getPrivateSubType = (programName) => {
        if (programName.toLowerCase().includes('mandiri')) return 'MANDIRI';
        if (programName.toLowerCase().includes('sharing')) return 'SHARING';
        if (programName.toLowerCase().includes('bersaudara')) return 'BERSAUDARA';
        return null;
      };

      if (program.tipeProgram === 'PRIVATE') {
        const subType = getPrivateSubType(program.namaProgram);
        
        if (subType === 'SHARING' || subType === 'BERSAUDARA') {
          // Case 1: Private sharing/bersaudara
          const whereClause = {
            kelasProgramId: null,
            status: 'AKTIF',
            programId: programId
          };

          // Ambil semua data dulu untuk mencari ketua (siswa yang tidak punya keluargaId atau yang pertama)
          const allProgramSiswaList = await prisma.programSiswa.findMany({
            where: whereClause,
            include: {
              siswa: true
            },
            orderBy: { createdAt: 'asc' } // Urutkan berdasarkan yang pertama mendaftar
          });

          const result = [];
          const processedKeluargaIds = new Set();

          for (const ps of allProgramSiswaList) {
            // Cari ketua: siswa yang tidak punya keluargaId (keluargaId = null)
            if (!ps.siswa.keluargaId && !processedKeluargaIds.has(ps.siswa.id)) {
              processedKeluargaIds.add(ps.siswa.id);

              // Cari semua anggota keluarga yang memiliki keluargaId = id_siswa_ketua
              const anggotaKeluarga = await prisma.siswa.findMany({
                where: {
                  keluargaId: ps.siswa.id // keluargaId = id ketua
                },
                select: {
                  id: true,
                  namaMurid: true
                }
              });

              // Hanya anggota keluarga (bukan ketua)
              const anggotaKeluargaFormatted = anggotaKeluarga.map(ak => ({
                siswaId: ak.id,
                namaSiswa: ak.namaMurid
              }));

              result.push({
                siswaId: ps.siswa.id,
                namaSiswa: ps.siswa.namaMurid,
                anggota: anggotaKeluargaFormatted
              });
            }
          }

          // Apply pagination pada hasil yang sudah difilter
          const total = result.length;
          const startIndex = (page - 1) * limit;
          const endIndex = startIndex + limit;
          const paginatedResult = result.slice(startIndex, endIndex);

          return {
            data: paginatedResult,
            meta: {
              total,
              limit,
              page,
              totalPages: Math.ceil(total / limit)
            }
          };

        } else if (subType === 'MANDIRI') {
          // Case 2: Private mandiri
          const whereClause = {
            kelasProgramId: null,
            status: 'AKTIF',
            programId: programId
          };

          const [total, programSiswaList] = await prisma.$transaction([
            prisma.programSiswa.count({ where: whereClause }),
            prisma.programSiswa.findMany({
              where: whereClause,
              include: {
                siswa: true
              },
              skip: (page - 1) * limit,
              take: limit,
              orderBy: { createdAt: 'desc' }
            })
          ]);

          const result = programSiswaList.map(ps => ({
            siswaId: ps.siswa.id,
            namaSiswa: ps.siswa.namaMurid
          }));

          return {
            data: result,
            meta: {
              total,
              limit,
              page,
              totalPages: Math.ceil(total / limit)
            }
          };
        }
      }

      // Case 3: Program GROUP
      const whereClause = {
        kelasProgramId: null,
        status: 'AKTIF',
        programId: programId
      };

      const [total, programSiswaList] = await prisma.$transaction([
        prisma.programSiswa.count({ where: whereClause }),
        prisma.programSiswa.findMany({
          where: whereClause,
          include: {
            siswa: true
          },
          skip: (page - 1) * limit,
          take: limit,
          orderBy: { createdAt: 'desc' }
        })
      ]);

      const result = programSiswaList.map(ps => ({
        siswaId: ps.siswa.id,
        namaSiswa: ps.siswa.namaMurid
      }));

      return {
        data: result,
        pagination: {
          total,
          limit,
          page,
          totalPages: Math.ceil(total / limit)
        }
      };

    } catch (error) {
      logger.error(error);
      throw error;
    }
  }


}

module.exports = new ProgramService();