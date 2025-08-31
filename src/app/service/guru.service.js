const { prisma } = require('../../lib/config/prisma.config');
const { logger } = require('../../lib/config/logger.config');
const { NotFoundError, ConflictError } = require('../../lib/http/errors.http');
const PrismaUtils = require('../../lib/utils/prisma.utils');
const PasswordUtils = require('../../lib/utils/password.utils');
const EmailUtils = require('../../lib/utils/email.utils');

class GuruService {

  //create guru 
  async create(data) {
    try {
      const { email, baseUrl, rfid, ...guruData } = data;

      return await PrismaUtils.transaction(async (tx) => {
        const existingUser = await tx.user.findUnique({
          where: { email }
        });

        if (existingUser) {
          throw new ConflictError(`User dengan email ${email} sudah ada`);
        }

        if (rfid) {
          const existingRfid = await tx.user.findUnique({
            where: { rfid }
          });

          if (existingRfid) {
            throw new ConflictError(`RFID ${rfid} sudah terdaftar untuk user lain`);
          }
        }

        const NIP = Math.floor(Math.random() * 1000000);
        const plainPassword = "@Test123";
        const hashedPassword = await PasswordUtils.hash(plainPassword);

        const user = await tx.user.create({
          data: {
            email,
            password: hashedPassword,
            role: 'GURU',
            rfid: rfid || null
          }
        });

        const guru = await tx.guru.create({
          data: {
            ...guruData,
            userId: user.id,
            nip: NIP.toString().padStart(6, '0')
          },
          include: {
            user: {
              select: {
                id: true,
                email: true,
                role: true,
                rfid: true
              }
            }
          }
        });

        // Kirim email ke guru
        await EmailUtils.sendWelcomeEmail({
          email,
          name: guru.nama,
          password: plainPassword
        });

        const schema = {
          id: guru.id,
          nama: guru.nama,
          nip: guru.nip,
          noWhatsapp: guru.noWhatsapp,
          alamat: guru.alamat,
          jenisKelamin: guru.jenisKelamin,
          tanggalLahir: guru.tanggalLahir,
          fotoProfile: guru.fotoProfile,
          keahlian: guru.keahlian,
          pendidikanTerakhir: guru.pendidikanTerakhir,
          noRekening: guru.noRekening,
          namaBank: guru.namaBank,
          suratKontrak: guru.suratKontrak,
          user: {
            email: guru.user.email,
            rfid: guru.user.rfid,
          }
        }

        logger.info(`Created guru with ID: ${guru.id}`);
        return schema;
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

      const { email, password, rfid, baseUrl, ...guruData } = data;

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

        // Update RFID jika disediakan
        if (rfid !== undefined) {
          // Check if RFID already exists for another user
          if (rfid) {
            const existingRfid = await tx.user.findFirst({
              where: {
                rfid: rfid,
                id: { not: guru.userId }
              }
            });

            if (existingRfid) {
              throw new ConflictError(`RFID ${rfid} sudah terdaftar untuk user lain`);
            }
          }

          await tx.user.update({
            where: { id: guru.userId },
            data: { rfid: rfid }
          });
        }

        // Update all fields that are provided, including null values
        const updateData = {};
        Object.keys(guruData).forEach(key => {
          if (key in guruData) {  // Check if the key exists in the data
            updateData[key] = guruData[key];
          }
        });

        const updated = await tx.guru.update({
          where: { id },
          data: updateData,
          include: {
            user: {
              select: {
                id: true,
                email: true,
                role: true,
                rfid: true
              }
            }
          }
        });

        const schema = {
          id: updated.id,
          nama: updated.nama,
          nip: updated.nip,
          noWhatsapp: updated.noWhatsapp,
          alamat: updated.alamat,
          jenisKelamin: updated.jenisKelamin,
          tanggalLahir: updated.tanggalLahir,
          fotoProfile: updated.fotoProfile,
          keahlian: updated.keahlian,
          pendidikanTerakhir: updated.pendidikanTerakhir,
          noRekening: updated.noRekening,
          namaBank: updated.namaBank,
          suratKontrak: updated.suratKontrak,
          user: {
            email: updated.user.email,
            rfid: updated.user.rfid,
          }
        }

        logger.info(`Updated guru with ID: ${id}`);
        return schema;
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
      const { page = 1, limit = 10, nama } = filters;

      const where = {};

      if (nama) {
        where.nama = {
          contains: nama
        };
      }

      return await PrismaUtils.paginate(prisma.guru, {
        page,
        limit,
        where,
        select: {
          id: true,
          nama: true,
          nip: true,
          noWhatsapp: true,
          alamat: true,
          jenisKelamin: true,
          tanggalLahir: true,
          fotoProfile: true,
          keahlian: true,
          pendidikanTerakhir: true,
          noRekening: true,
          namaBank: true,
          suratKontrak: true,
          user: {
            select: {
              email: true,
              rfid: true,
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });
    } catch (error) {
      logger.error('Error getting all gurus:', error);
      throw error;
    }
  }

  async getAllGuruWithSchedules(filters = {}) {
    try {
      const { page = 1, limit = 10, nama } = filters;

      const where = {};

      if (nama) {
        where.nama = {
          contains: nama
        };
      }

      const paginatedResult = await PrismaUtils.paginate(prisma.guru, {
        page,
        limit,
        where,
        select: {
          id: true,
          nama: true,
          keahlian: true,
          fotoProfile: true,
          pendidikanTerakhir: true,
          tanggalLahir: true,
          suratKontrak: true,
          kelasProgram: {
            select: {
              id: true,
              hari: true,
              jamMengajarId: true,
              kelasId: true,
              programId: true
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
          tanggalLahir: guru.tanggalLahir,
          suratKontrak: guru.suratKontrak,
          jadwalGuru: guru.kelasProgram.map(kp => ({
            kelasProgramId: kp.id,
            kelasId: kp.kelasId,
            programId: kp.programId,
            hari: kp.hari,
            jamMengajarId: kp.jamMengajarId
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
            where: {
              status: 'AKTIF'
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
          },
          kelasPengganti: {
            where: {
              deletedAt: null,
              isTemp: true
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
          }
        }
      });

      return kelasPrograms.map(kp => {
        // Get regular students
        const regularStudents = kp.programSiswa.map(ps => ({
          siswaId: ps.siswa.id,
          namaSiswa: ps.siswa.namaMurid,
          NIS: ps.siswa.nis,
          isTemp: false
        }));

        // Get temporary students (unique by siswaId)
        const tempStudentsMap = new Map();
        kp.kelasPengganti.forEach(kpg => {
          if (!tempStudentsMap.has(kpg.siswa.id)) {
            tempStudentsMap.set(kpg.siswa.id, {
              siswaId: kpg.siswa.id,
              namaSiswa: kpg.siswa.namaMurid,
              NIS: kpg.siswa.nis,
              isTemp: true
            });
          }
        });
        const tempStudents = Array.from(tempStudentsMap.values());

        // Combine all students
        const allStudents = [...regularStudents, ...tempStudents];

        return {
          kelasProgramId: kp.id,
          kelasId: kp.kelasId,
          programId: kp.programId,
          jamMengajarId: kp.jamMengajar.id,
          namaKelas: kp.kelas.namaKelas,
          namaProgram: kp.program.namaProgram,
          hari: kp.hari,
          jamMulai: kp.jamMengajar.jamMulai,
          jamSelesai: kp.jamMengajar.jamSelesai,
          siswa: allStudents
        };
      });
    } catch (error) {
      logger.error('Error getting kelas programs with students:', error);
      throw error;
    }
  }

  async getContractFile(guruId) {
    try {
      const guru = await prisma.guru.findUnique({
        where: { id: guruId },
        select: {
          id: true,
          nama: true,
          suratKontrak: true
        }
      });

      if (!guru) {
        throw new NotFoundError(`Guru dengan ID ${guruId} tidak ditemukan`);
      }

      if (!guru.suratKontrak) {
        throw new NotFoundError('Surat kontrak tidak ditemukan');
      }

      return {
        filePath: guru.suratKontrak,
        fileName: `Surat_Kontrak_${guru.nama.replace(/\s+/g, '_')}.pdf`
      };
    } catch (error) {
      logger.error(`Error getting contract file for guru ${guruId}:`, error);
      throw error;
    }
  }
}

module.exports = new GuruService();