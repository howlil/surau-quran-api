const { prisma } = require('../../lib/config/prisma.config');
const ErrorFactory = require('../../lib/factories/error.factory');
const PrismaUtils = require('../../lib/utils/prisma.utils');
const PasswordUtils = require('../../lib/utils/password.utils');
const EmailUtils = require('../../lib/utils/email.utils');
const FileUtils = require('../../lib/utils/file.utils');
const CommonServiceUtils = require('../../lib/utils/common.service.utils');

class GuruService {

  //create guru 
  async create(options) {
    try {
      const { data } = options;
      const { email, rfid, ...guruData } = data;

      return await prisma.$transaction(async (tx) => {
        const existingUser = await tx.user.findUnique({
          where: { email }
        });

        if (existingUser) {
          throw ErrorFactory.badRequest(`User dengan email ${email} sudah ada`);
        }

        if (rfid) {
          const existingRfid = await tx.user.findUnique({
            where: { rfid }
          });

          if (existingRfid) {
            throw ErrorFactory.badRequest(`RFID ${rfid} sudah terdaftar untuk user lain`);
          }
        }

        const NIP = CommonServiceUtils.generateRandomNumber(6);
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
            nip: NIP
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

        const transformedResult = FileUtils.transformGuruFiles(guru);
        return transformedResult;
      });
    } catch (error) {
      throw error;
    }
  }

  //admin update guru
  async update(options) {
    try {
      const { data, where } = options;
      const { id } = where;
      
      const guru = await prisma.guru.findUnique({
        where: { id },
        include: {
          user: true
        }
      });

      if (!guru) {
        throw ErrorFactory.notFound(`Guru dengan ID ${id} tidak ditemukan`);
      }

      const { email, password, rfid, ...guruData } = data;

      return await prisma.$transaction(async (tx) => {
        if (email && email !== guru.user.email) {
          const existingUser = await tx.user.findFirst({
            where: {
              email,
              id: { not: guru.userId }
            }
          });

          if (existingUser) {
            throw ErrorFactory.badRequest(`User dengan email ${email} sudah ada`);
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
              throw ErrorFactory.badRequest(`RFID ${rfid} sudah terdaftar untuk user lain`);
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

        const transformedResult = FileUtils.transformGuruFiles(updated);
        return transformedResult;
      });
    } catch (error) {
      throw error;
    }
  }

  //admin delete guru
  async delete(options) {
    try {
      const { where } = options;
      const { id } = where;
      
      const guru = await prisma.guru.findUnique({
        where: { id },
        include: {
          kelasProgram: true,
          payroll: true
        }
      });

      if (!guru) {
        throw ErrorFactory.notFound(`Guru dengan ID ${id} tidak ditemukan`);
      }

      if (guru.kelasProgram.length > 0) {
        throw ErrorFactory.badRequest('Guru sedang mengajar di kelas program dan tidak dapat dihapus');
      }

      if (guru.payroll.length > 0) {
        throw ErrorFactory.badRequest('Guru memiliki data payroll dan tidak dapat dihapus');
      }

      await prisma.$transaction(async (tx) => {
        await tx.guru.delete({
          where: { id }
        });

        await tx.user.delete({
          where: { id: guru.userId }
        });
      });

      return { id };
    } catch (error) {
      throw error;
    }
  }

  async getAll(options = {}) {
    try {
      const { data: filters = {}, where: additionalWhere = {} } = options;
      const { page = 1, limit = 10, nama } = filters;

      const where = { ...additionalWhere };

      if (nama) {
        where.nama = {
          contains: nama
        };
      }

      const result = await PrismaUtils.paginate(prisma.guru, {
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

      const transformedData = {
        ...result,
        data: FileUtils.transformGuruListFiles(result.data)
      };

      return transformedData;
    } catch (error) {
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
          ...guru,
          fotoProfile: FileUtils.getImageUrl(guru.fotoProfile),
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
        throw ErrorFactory.notFound(`Guru dengan ID ${guruId} tidak ditemukan`);
      }

      if (!guru.suratKontrak) {
        throw ErrorFactory.notFound('Surat kontrak tidak ditemukan');
      }

      return {
        filePath: guru.suratKontrak,
        fileName: `Surat_Kontrak_${guru.nama.replace(/\s+/g, '_')}.pdf`
      };
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new GuruService();