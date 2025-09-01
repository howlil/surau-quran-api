const { prisma } = require('../../lib/config/prisma.config');
const { logger } = require('../../lib/config/logger.config');
const { NotFoundError, ConflictError, BadRequestError } = require('../../lib/http/errors.http');
const PrismaUtils = require('../../lib/utils/prisma.utils');

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

  async getAll(filters = {}) {
    try {
      const { page, limit, namaProgram } = filters;

      const where = {};

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
      logger.error('Error getting all programs:', error);
      throw error;
    }
  }

  async getAllNoPagination(filters = {}) {
    try {
      const { namaProgram } = filters;
      const where = {};
      if (namaProgram) {
        where.namaProgram = {
          contains: namaProgram
        };
      }
      return await prisma.program.findMany({
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
      logger.error('Error getting all programs (no pagination):', error);
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
          tipeProgram: true,
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

  async getProgramStudents(programId, filters = {}) {
    try {
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

          const result = [];
          const processedKeluargaIds = new Set();

          for (const ps of programSiswaList) {
            if (ps.siswa.keluargaId && !processedKeluargaIds.has(ps.siswa.keluargaId)) {
              processedKeluargaIds.add(ps.siswa.keluargaId);

              // Cari semua siswa dengan keluargaId yang sama
              const anggotaKeluarga = await prisma.siswa.findMany({
                where: {
                  keluargaId: ps.siswa.keluargaId,
                  id: { not: ps.siswa.id }
                },
                select: {
                  id: true,
                  namaMurid: true
                }
              });

              result.push({
                programSiswaId: ps.id,
                siswaList: [
                  {
                    siswaId: ps.siswa.id,
                    namaSiswa: ps.siswa.namaMurid,
                    anggotaKeluarga: anggotaKeluarga.map(ak => ({
                      siswaId: ak.id,
                      namaSiswa: ak.namaMurid
                    }))
                  }
                ]
              });
            }
          }

          return {
            data: result,
            pagination: {
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
            programSiswaId: ps.id,
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
        programSiswaId: ps.id,
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
      logger.error('Error getting program students:', error);
      throw error;
    }
  }

  async addKelasPengganti(guruId, data) {
    try {
      const { kelasProgramId, siswaId, tanggal } = data;

      // Validasi bahwa kelas program ada
      const kelasProgram = await prisma.kelasProgram.findUnique({
        where: {
          id: kelasProgramId
        }
      });

      if (!kelasProgram) {
        throw new NotFoundError(`Kelas program dengan ID ${kelasProgramId} tidak ditemukan`);
      }

      // Validasi bahwa guru berwenang untuk kelas program ini
      if (kelasProgram.guruId !== guruId) {
        throw new NotFoundError('Guru tidak berwenang untuk kelas program ini');
      }

      // Validasi bahwa siswa ada
      const siswa = await prisma.siswa.findUnique({
        where: { id: siswaId }
      });

      if (!siswa) {
        throw new NotFoundError('Siswa tidak ditemukan');
      }

      // Validasi bahwa siswa memiliki kelas program aktif
      const activeProgramSiswa = await prisma.programSiswa.findFirst({
        where: {
          siswaId,
          status: 'AKTIF',
          kelasProgramId: { not: null } // Harus sudah terdaftar di kelas program
        },
        include: {
          kelasProgram: {
            include: {
              program: true,
              kelas: true
            }
          }
        }
      });

      if (!activeProgramSiswa) {
        throw new BadRequestError('Siswa belum terdaftar dalam kelas program manapun. Siswa harus memiliki kelas program aktif untuk bisa mengikuti kelas pengganti');
      }


      const [tanggalDay, tanggalMonth, tanggalYear] = tanggal.split('-');
      const formattedDate = `${tanggalYear}-${tanggalMonth}-${tanggalDay}`;
      const today = new Date().toISOString().split('T')[0];
      if (formattedDate < today) {
        throw new BadRequestError('Tanggal tidak boleh di masa lalu');
      }

      // Validasi bahwa tanggal sesuai dengan hari kelas program
      const inputDate = new Date(formattedDate);
      const dayNames = ['MINGGU', 'SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU'];
      const inputDayName = dayNames[inputDate.getDay()];

      if (inputDayName !== kelasProgram.hari) {
        throw new BadRequestError(`Tanggal ${tanggal} adalah hari ${inputDayName}, tidak sesuai dengan jadwal kelas program yang adalah hari ${kelasProgram.hari}`);
      }

      // Cek apakah sudah ada kelas pengganti untuk siswa ini di tanggal yang sama
      const existingKelasPengganti = await prisma.kelasPengganti.findFirst({
        where: {
          kelasProgramId,
          siswaId,
          tanggal
        }
      });

      if (existingKelasPengganti) {
        if (existingKelasPengganti.deletedAt) {
          // Jika sudah ada tapi soft deleted, reaktivasi saja
          const result = await PrismaUtils.transaction(async (tx) => {
            const reactivated = await tx.kelasPengganti.update({
              where: { id: existingKelasPengganti.id },
              data: {
                deletedAt: null,
                isTemp: true,
                count: existingKelasPengganti.count + 1,
                updatedAt: new Date()
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

            // Cek apakah absensi sudah ada
            const existingAbsensi = await tx.absensiSiswa.findFirst({
              where: {
                kelasProgramId,
                siswaId,
                tanggal
              }
            });

            // Buat absensi jika belum ada
            if (!existingAbsensi) {
              await tx.absensiSiswa.create({
                data: {
                  kelasProgramId,
                  siswaId,
                  tanggal,
                  statusKehadiran: 'TIDAK_HADIR' // Status default, guru bisa ubah nanti
                }
              });
              logger.info(`Created attendance record for reactivated temporary student ${siswaId} in class ${kelasProgramId} for date ${tanggal}`);
            }

            return reactivated;
          });

          logger.info(`Reactivated student ${siswaId} to substitute class ${kelasProgramId} for date ${tanggal}`);

          return {
            id: result.id,
            siswaId: result.siswa.id,
            namaSiswa: result.siswa.namaMurid,
            nis: result.siswa.nis,
            tanggal: result.tanggal,
            namaProgram: result.kelasProgram.program.namaProgram,
            jamMengajar: {
              jamMulai: result.kelasProgram.jamMengajar.jamMulai,
              jamSelesai: result.kelasProgram.jamMengajar.jamSelesai
            },
            absensiCreated: true
          };
        } else {
          throw new ConflictError('Siswa sudah ditambahkan ke kelas pengganti ini di tanggal yang sama');
        }
      }

      const [dayPart, monthPart, yearPart] = tanggal.split('-');

      // Count using string pattern matching for DD-MM-YYYY format
      const monthlyCount = await prisma.kelasPengganti.count({
        where: {
          siswaId,
          tanggal: {
            contains: `-${monthPart}-${yearPart}`
          },
          isTemp: true,
          deletedAt: null
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

      // Gunakan transaction untuk memastikan data konsisten
      const result = await PrismaUtils.transaction(async (tx) => {
        // Tambahkan siswa ke kelas pengganti
        const kelasPengganti = await tx.kelasPengganti.create({
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

        // Cek apakah absensi sudah ada
        const existingAbsensi = await tx.absensiSiswa.findFirst({
          where: {
            kelasProgramId,
            siswaId,
            tanggal
          }
        });

        // Buat absensi jika belum ada
        if (!existingAbsensi) {
          await tx.absensiSiswa.create({
            data: {
              kelasProgramId,
              siswaId,
              tanggal,
              statusKehadiran: 'TIDAK_HADIR' // Status default, guru bisa ubah nanti
            }
          });
          logger.info(`Created attendance record for temporary student ${siswaId} in class ${kelasProgramId} for date ${tanggal}`);
        }

        return kelasPengganti;
      });

      logger.info(`Added student ${siswaId} to substitute class ${kelasProgramId} for date ${tanggal}`);

      return {
        id: result.id,
        siswaId: result.siswa.id,
        namaSiswa: result.siswa.namaMurid,
        nis: result.siswa.nis,
        tanggal: result.tanggal,
        namaProgram: result.kelasProgram.program.namaProgram,
        jamMengajar: {
          jamMulai: result.kelasProgram.jamMengajar.jamMulai,
          jamSelesai: result.kelasProgram.jamMengajar.jamSelesai
        },
        absensiCreated: true
      };
    } catch (error) {
      logger.error('Error adding student to substitute class:', error);
      throw error;
    }
  }

  async removeKelasPengganti(guruId, kelasProgramId) {
    try {
      // Validasi bahwa kelas program ada
      const kelasProgram = await prisma.kelasProgram.findUnique({
        where: {
          id: kelasProgramId
        }
      });

      if (!kelasProgram) {
        throw new NotFoundError(`Kelas program dengan ID ${kelasProgramId} tidak ditemukan`);
      }

      // Validasi bahwa guru berwenang untuk kelas program ini
      if (kelasProgram.guruId !== guruId) {
        throw new NotFoundError('Guru tidak berwenang untuk kelas program ini');
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

      // Soft delete semua kelas pengganti untuk kelas program ini dan hapus absensinya
      const deletedIds = kelasPenggantiList.map(kp => kp.id);

      await PrismaUtils.transaction(async (tx) => {
        // Soft delete kelas pengganti
        await tx.kelasPengganti.updateMany({
          where: {
            id: { in: deletedIds }
          },
          data: {
            deletedAt: new Date(),
            updatedAt: new Date()
          }
        });

        // Hapus absensi siswa yang terkait
        for (const kp of kelasPenggantiList) {
          await tx.absensiSiswa.deleteMany({
            where: {
              kelasProgramId,
              siswaId: kp.siswaId,
              tanggal: kp.tanggal
            }
          });
        }
      });

      logger.info(`Soft deleted ${kelasPenggantiList.length} students from substitute class ${kelasProgramId} and removed their attendance`);

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

  async getSiswaKelasPengganti(filters = {}) {
    try {
      const { search, page = 1, limit = 10 } = filters;

      // Filter hanya siswa yang sudah memiliki kelas program aktif
      const whereClause = {
        programSiswa: {
          some: {
            status: 'AKTIF',
            kelasProgramId: { not: null } // Harus sudah terdaftar di kelas program
          }
        }
      };

      if (search) {
        whereClause.namaMurid = {
          contains: search
        };
      }

      const siswa = await PrismaUtils.paginate(prisma.siswa, {
        limit,
        page,
        where: whereClause,
        select: {
          id: true,
          namaMurid: true,
          nis: true,
          programSiswa: {
            where: {
              status: 'AKTIF',
              kelasProgramId: { not: null }
            },
            select: {
              kelasProgram: {
                select: {
                  id: true,
                  kelas: {
                    select: {
                      namaKelas: true
                    }
                  },
                  program: {
                    select: {
                      namaProgram: true
                    }
                  }
                }
              }
            }
          }
        },
        orderBy: [
          { namaMurid: 'asc' }
        ]
      });

      // Transform data untuk menambahkan info kelas program
      const transformedData = {
        ...siswa,
        data: siswa.data.map(s => ({
          siswaId: s.id,
          namaSiswa: s.namaMurid,
          NIS: s.nis,
          kelasProgram: s.programSiswa.map(ps => ({
            kelasProgramId: ps.kelasProgram.id,
            namaKelas: ps.kelasProgram.kelas?.namaKelas || 'Tidak Ada Kelas',
            namaProgram: ps.kelasProgram.program.namaProgram
          }))
        }))
      };

      return transformedData;
    } catch (error) {
      logger.error('Error getting substitute class students:', error);
      throw error;
    }
  }

}

module.exports = new ProgramService();