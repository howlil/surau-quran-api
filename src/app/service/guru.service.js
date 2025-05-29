const { prisma } = require('../../lib/config/prisma.config');
const { logger } = require('../../lib/config/logger.config');
const { NotFoundError, ConflictError } = require('../../lib/http/errors.http');
const PrismaUtils = require('../../lib/utils/prisma.utils');
const PasswordUtils = require('../../lib/utils/password.utils');
const { id } = require('../validation/factory.validation');

class GuruService {

  //create guru 
  async create(data) {
    try {
      const { email, baseUrl, ...guruData } = data;

      return await PrismaUtils.transaction(async (tx) => {
        const existingUser = await tx.user.findUnique({
          where: { email }
        });

        if (existingUser) {
          throw new ConflictError(`User dengan email ${email} sudah ada`);
        }

        const NIP = Math.floor(Math.random() * 1000000);
        const hashedPassword = await PasswordUtils.hash("@Test123");

        const user = await tx.user.create({
          data: {
            email,
            password: hashedPassword,
            role: 'GURU'
          }
        });

        const guru = await tx.guru.create({
          data: {
            ...guruData,
            userId: user.id,
            nip: NIP.toString().padStart(6, '0'),
          },
          include: {
            user: {
              select: {
                id: true,
                email: true,
                role: true
              }
            }
          }
        });

        logger.info(`Created guru with ID: ${guru.id}`);
        return guru;
      });
    } catch (error) {
      logger.error('Error creating guru:', error);
      throw error;
    }
  }

  //admin update guru
  async update(id, data) {
    try {
      const guru = await prisma.guru.findUnique({
        where: { id },
        include: {
          user: true
        }
      });

      if (!guru) {
        throw new NotFoundError(`Guru dengan ID ${id} tidak ditemukan`);
      }

      const { email, password, baseUrl, ...guruData } = data;

      return await PrismaUtils.transaction(async (tx) => {
        if (email && email !== guru.user.email) {
          const existingUser = await tx.user.findFirst({
            where: {
              email,
              id: { not: guru.userId }
            }
          });

          if (existingUser) {
            throw new ConflictError(`User dengan email ${email} sudah ada`);
          }

          await tx.user.update({
            where: { id: guru.userId },
            data: { email }
          });
        }

        if (password) {
          const hashedPassword = await PasswordUtils.hash(password);
          await tx.user.update({
            where: { id: guru.userId },
            data: { password: hashedPassword }
          });
        }

        const updated = await tx.guru.update({
          where: { id },
          data: guruData,
          include: {
            user: {
              select: {
                id: true,
                email: true,
                role: true
              }
            }
          }
        });

        logger.info(`Updated guru with ID: ${id}`);
        return updated;
      });
    } catch (error) {
      logger.error(`Error updating guru with ID ${id}:`, error);
      throw error;
    }
  }

  //admin delete guru
  async delete(id) {
    try {
      const guru = await prisma.guru.findUnique({
        where: { id },
        include: {
          kelasProgram: true,
          payroll: true
        }
      });

      if (!guru) {
        throw new NotFoundError(`Guru dengan ID ${id} tidak ditemukan`);
      }

      if (guru.kelasProgram.length > 0) {
        throw new ConflictError('Guru sedang mengajar di kelas program dan tidak dapat dihapus');
      }

      if (guru.payroll.length > 0) {
        throw new ConflictError('Guru memiliki data payroll dan tidak dapat dihapus');
      }

      await PrismaUtils.transaction(async (tx) => {
        await tx.guru.delete({
          where: { id }
        });

        await tx.user.delete({
          where: { id: guru.userId }
        });
      });

      logger.info(`Deleted guru with ID: ${id}`);
      return { id };
    } catch (error) {
      logger.error(`Error deleting guru with ID ${id}:`, error);
      throw error;
    }
  }

  async getAll(filters = {}) {
    try {
      const { page = 1, limit = 10 } = filters;


      return await PrismaUtils.paginate(prisma.guru, {
        page,
        limit,
        select: {
          id: true,
          nama: true,
          nip: true,
          noWhatsapp: true,
          alamat: true,
          jenisKelamin: true,
          fotoProfile: true,
          keahlian: true,
          pendidikanTerakhir: true,
          noRekening: true,
          namaBank: true,
          user: {
            select: {
              email: true,
            }
          }
        },

        orderBy: { nama: 'asc' }
      });
    } catch (error) {
      logger.error('Error getting all gurus:', error);
      throw error;
    }
  }

  async getAllGuruWithSchedules(filters = {}) {
    try {
      const { page = 1, limit = 10 } = filters;

      const paginatedResult = await PrismaUtils.paginate(prisma.guru, {
        page,
        limit,
        select: {
          id: true,
          nama: true,
          keahlian: true,
          fotoProfile: true,
          pendidikanTerakhir: true,
          kelasProgram: {
            select: {
              id: true,
              hari: true,
              jamMengajarId: true,
              kelasId: true,
              programId: true,
              tipeKelas: true
            }
          }
        },
        orderBy: { nama: 'asc' }
      });

      return {
        ...paginatedResult,
        data: paginatedResult.data.map(guru => ({
          id: guru.id,
          nama: guru.nama,
          keahlian: guru.keahlian,
          fotoProfile: guru.fotoProfile,
          pendidikanTerakhir: guru.pendidikanTerakhir,
          jadwalGuru: guru.kelasProgram.map(kp => ({
            kelasProgramId: kp.id,
            kelasId: kp.kelasId,
            programId: kp.programId,
            hari: kp.hari,
            jamMengajarId: kp.jamMengajarId,
            tipeKelas: kp.tipeKelas
          }))
        }))
      };
    } catch (error) {
      logger.error('Error getting simplified guru list:', error);
      throw error;
    }
  }

  async getKelasProgramWithStudents(guruId) {
    try {
      const kelasPrograms = await prisma.kelasProgram.findMany({
        where: { guruId: guruId },
        select: {
          id: true,
          tipeKelas: true,
          kelas: {
            select: {
              id: true,
              namaKelas: true
            }
          },
          program: {
            select: {
              id: true,
              namaProgram: true
            }
          },
          hari: true,
          jamMengajar: {
            select: {
              id: true,
              jamMulai: true,
              jamSelesai: true
            }
          },
          programSiswa: {
            select: {
              siswa: {
                select: {
                  namaMurid: true,
                  nis: true
                }
              }
            }
          }
        }
      });

      return kelasPrograms.map(kp => ({
        kelasProgramId: kp.id,
        tipeKelas: kp.tipeKelas,
        kelas: {
          id: kp.kelas.id,
          namaKelas: kp.kelas.namaKelas
        },
        program: {
          id: kp.program.id,
          namaProgram: kp.program.namaProgram
        },
        hari: kp.hari,
        jamMengajar: {
          id: kp.jamMengajar.id,
          jamMulai: kp.jamMengajar.jamMulai,
          jamSelesai: kp.jamMengajar.jamSelesai
        },
        siswa: kp.programSiswa.map(ps => ({
          namaSiswa: ps.siswa.namaMurid,
          NIS: ps.siswa.nis
        }))
      }));
    } catch (error) {
      logger.error('Error getting kelas programs with students:', error);
      throw error;
    }
  }


}

module.exports = new GuruService();