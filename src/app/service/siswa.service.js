const prisma  = require('../../lib/config/prisma.config');
const ErrorFactory = require('../../lib/factories/error.factory');
const PrismaUtils = require('../../lib/utils/prisma.utils');
const SppService = require('./spp.service');
const CommonServiceUtils = require('../../lib/utils/common.service.utils');
const logger = require('../../lib/config/logger.config');

class SiswaService {

  /**
   * Get all siswa dengan program terbaru
   * 
   * Logic pengambilan program:
   * 1. Query mengambil programSiswa dengan orderBy: { createdAt: 'desc' }
   * 2. take: 1 untuk mengambil hanya 1 record terbaru
   * 3. Jika siswa memiliki multiple program (naik kelas/pindah program), 
   *    yang ditampilkan adalah program yang TERBARU
   * 
   * Contoh scenario:
   * - Siswa A: BTA LVL 1 (AKTIF) → BTA LVL 2 (AKTIF) → BTA LVL 2 (CUTI)
   * - Yang ditampilkan: BTA LVL 2 dengan status CUTI
   * 
   * - Siswa B: Tahsin (AKTIF) → Tahfidz (AKTIF) → Tahfidz (TIDAK_AKTIF)
   * - Yang ditampilkan: Tahfidz dengan status TIDAK_AKTIF
   */
  async getAll(options = {}) {
    try {
      const { filters = {} } = options;
      const { nama, programId, page = 1, limit = 10 } = filters;

      const where = {};

      if (nama) {
        where.OR = [
          { namaMurid: { contains: nama } },
          { namaPanggilan: { contains: nama } }
        ];
      }

      if (programId) {
        where.programSiswa = {
          some: {
            programId: programId
          }
        };
      }

      const result = await PrismaUtils.paginate(prisma.siswa, {
        page,
        limit,
        where,
        select: {
          id: true,
          namaMurid: true,
          nis: true,
          namaPanggilan: true,
          jenisKelamin: true,
          tanggalLahir: true,
          noWhatsapp: true,
          alamat: true,
          strataPendidikan: true,
          namaOrangTua: true,
          namaPenjemput: true,
          namaSekolah: true,
          kelasSekolah: true,
          user: {
            select: {
              email: true,
              rfid: true
            }
          },
          programSiswa: {
            // Mengambil semua program siswa untuk diproses
            orderBy: [
              { status: 'asc' }, // AKTIF akan muncul pertama (ascending)
              { updatedAt: 'desc' } // Jika status sama, ambil yang terbaru diupdate
            ],
            select: {
              id: true,
              status: true,
              createdAt: true,
              updatedAt: true,
              program: {
                select: {
                  id: true,
                  namaProgram: true,
                  tipeProgram: true

                }
              },
              JadwalProgramSiswa: {
                select: {
                  id: true,
                  hari: true,
                  urutan: true,
                  jamMengajar: {
                    select: {
                      id: true,
                      jamMulai: true,
                      jamSelesai: true
                    }
                  }
                }
              }
            }
          },
          pendaftaran: {
            select: {
              tanggalDaftar: true,
              pembayaran: {
                select: {
                  evidence: true
                }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      // Transform programSiswa dari array menjadi objek tunggal
      // Logic: Prioritaskan AKTIF -> CUTI -> TIDAK_AKTIF (yang terbaru diupdate)
      const transformedData = result.data.map(siswa => {
        let selectedProgram = null;

        if (siswa.programSiswa.length > 0) {
          // 1. Prioritas pertama: program yang AKTIF
          const activeProgram = siswa.programSiswa.find(ps => ps.status === 'AKTIF');

          if (activeProgram) {
            selectedProgram = activeProgram;
          } else {
            // 2. Prioritas kedua: program yang CUTI (yang terbaru diupdate)
            const cutiProgram = siswa.programSiswa
              .filter(ps => ps.status === 'CUTI')
              .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))[0];

            if (cutiProgram) {
              selectedProgram = cutiProgram;
            } else {
              // 3. Prioritas ketiga: program TIDAK_AKTIF yang terbaru diupdate
              selectedProgram = siswa.programSiswa
                .filter(ps => ps.status === 'TIDAK_AKTIF')
                .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))[0];

              if (selectedProgram) {
              }
            }
          }

          // Debug log untuk semua program siswa (untuk tracking)
          if (siswa.programSiswa.length > 1) {
            siswa.programSiswa.forEach((program, index) => {
            });
          }
        }

        const transformedSiswa = {
          ...siswa,
          programSiswa: selectedProgram ? {
            ...selectedProgram,
            statusProgram: selectedProgram.status, // Menambahkan status program
            isActive: selectedProgram.status === 'AKTIF', // Flag untuk status aktif
            createdAt: selectedProgram.createdAt, // Tambahkan createdAt untuk tracking
            updatedAt: selectedProgram.updatedAt // Tambahkan updatedAt untuk tracking
          } : null
        };

        // Debug log untuk siswa yang statusnya CUTI
        if (selectedProgram && selectedProgram.status === 'CUTI') {
        }

        return transformedSiswa;
      });

      return {
        ...result,
        data: transformedData
      };
    } catch (error) {
      logger.error(error);
      throw error;
    }
  }

  async getProfile(options) {
    try {
      const { data, filters = {} } = options;
      const { userId } = data;
      const { bulan, page = 1, limit = 10 } = filters;

      const siswa = await prisma.siswa.findUnique({
        where: { userId },
        include: {
          user: {
            select: {
              email: true,
              rfid: true
            }
          },
          programSiswa: {
            orderBy: [
              { status: 'asc' }, // AKTIF akan muncul pertama
              { updatedAt: 'desc' } // Jika status sama, ambil yang terbaru diupdate
            ],
            include: {
              program: true,
              JadwalProgramSiswa: {
                include: {
                  jamMengajar: true
                },
                orderBy: {
                  urutan: 'asc'
                }
              }
            }
          }
        }
      });

      if (!siswa) {
        throw ErrorFactory.notFound('Profil siswa tidak ditemukan');
      }

      // Pilih program yang akan ditampilkan (prioritaskan AKTIF -> CUTI -> TIDAK_AKTIF)
      let selectedProgramSiswa = null;
      if (siswa.programSiswa.length > 0) {
        // 1. Prioritas pertama: program yang AKTIF
        const activeProgram = siswa.programSiswa.find(ps => ps.status === 'AKTIF');

        if (activeProgram) {
          selectedProgramSiswa = activeProgram;
        } else {
          // 2. Prioritas kedua: program yang CUTI (yang terbaru diupdate)
          const cutiProgram = siswa.programSiswa
            .filter(ps => ps.status === 'CUTI')
            .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))[0];

          if (cutiProgram) {
            selectedProgramSiswa = cutiProgram;
          } else {
            // 3. Prioritas ketiga: program TIDAK_AKTIF yang terbaru diupdate
            selectedProgramSiswa = siswa.programSiswa
              .filter(ps => ps.status === 'TIDAK_AKTIF')
              .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))[0];

            if (selectedProgramSiswa) {
            }
          }
        }
      }

      // Build absensi query filter
      const absensiWhere = {
        siswaId: siswa.id
      };

      if (bulan) {
        const [month, year] = bulan.split('-');
        if (!month || !year || month.length !== 2 || year.length !== 4) {
          throw ErrorFactory.badRequest('Format bulan harus MM-YYYY');
        }

        // Use pattern matching for DD-MM-YYYY format in database
        absensiWhere.tanggal = {
          contains: `-${month}-${year}`
        };

      }

      // Get the total count of attendance records matching the filter
      const totalAbsensi = await prisma.absensiSiswa.count({
        where: absensiWhere
      });

      // Calculate pagination values
      const skip = (page - 1) * limit;
      const take = parseInt(limit);
      const totalPages = CommonServiceUtils.calculateTotalPages(totalAbsensi, limit);

      // Fetch attendance records with pagination
      const absensi = await prisma.absensiSiswa.findMany({
        where: absensiWhere,
        include: {
          kelasProgram: {
            include: {
              kelas: true,
              program: true
            }
          }
        },
        orderBy: {
          tanggal: 'desc'
        },
        skip,
        take
      });

      // Get all attendance records (without pagination) for calculating counts
      const allAbsensi = await prisma.absensiSiswa.findMany({
        where: absensiWhere,
        select: {
          statusKehadiran: true
        }
      });

      // Calculate attendance counts
      const hadir = allAbsensi.filter(a => a.statusKehadiran === 'HADIR').length;
      const sakit = allAbsensi.filter(a => a.statusKehadiran === 'SAKIT').length;
      const izin = allAbsensi.filter(a => a.statusKehadiran === 'IZIN').length;
      const tidakHadir = allAbsensi.filter(a => a.statusKehadiran === 'TIDAK_HADIR').length;
      const total = allAbsensi.length;

      // Transform data untuk konsistensi dengan getAll
      const transformedSiswa = {
        ...siswa,
        programSiswa: selectedProgramSiswa ? {
          ...selectedProgramSiswa,
          statusProgram: selectedProgramSiswa.status,
          isActive: selectedProgramSiswa.status === 'AKTIF'
        } : null
      };

      return {
        siswa: transformedSiswa,
        absensi: {
          data: absensi,
          meta: {
            total: totalAbsensi,
            limit,
            page,
            totalPages
          }
        },
        statistik: {
          hadir,
          sakit,
          izin,
          tidakHadir,
          total
        }
      };
    } catch (error) {
      logger.error(error);
      throw error;
    }
  }

  getDayFromDate(dateString) {
    const days = ['MINGGU', 'SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU'];
    const date = new Date(dateString);
    return days[date.getDay()];
  }

  async adminUpdateSiswa(options) {
    const { data, where } = options;
    const { id } = where;
    try {
      const siswa = await prisma.siswa.findUnique({
        where: { id },
        include: {
          user: true,
          programSiswa: {
            include: {
              program: true,
              JadwalProgramSiswa: true
            }
          }
        }
      });

      if (!siswa) {
        throw ErrorFactory.notFound(`Siswa dengan ID ${id} tidak ditemukan`);
      }

      // Ekstrak data dasar siswa
      const {
        namaMurid,
        namaPanggilan,
        jenisKelamin,
        tanggalLahir,
        noWhatsapp,
        alamat,
        strataPendidikan,
        namaOrangTua,
        namaPenjemput,
        namaSekolah,
        kelasSekolah,
        email,
        rfid,
        programId,
        programStatus,
        jadwal = []
      } = data;

      // Clean and normalize namaMurid and namaPanggilan before use
      const cleanedNamaMurid = CommonServiceUtils.cleanString(namaMurid);
      const cleanedNamaPanggilan = CommonServiceUtils.cleanString(namaPanggilan);

      return await prisma.$transaction(async (tx) => {
        // Update data siswa dasar
        const siswaUpdateData = {};
        const fields = [
          'namaMurid', 'namaPanggilan', 'jenisKelamin', 'tanggalLahir',
          'noWhatsapp', 'alamat', 'strataPendidikan', 'namaOrangTua',
          'namaPenjemput', 'namaSekolah', 'kelasSekolah'
        ];

        fields.forEach(field => {
          if (field in data) {  // Check if the field exists in the data
            if (field === 'namaMurid') {
              siswaUpdateData[field] = cleanedNamaMurid;
            } else if (field === 'namaPanggilan') {
              siswaUpdateData[field] = cleanedNamaPanggilan;
            } else {
              siswaUpdateData[field] = data[field];
            }
          }
        });

        let updatedSiswa = await tx.siswa.update({
          where: { id },
          data: siswaUpdateData
        });

        // Update email jika disediakan
        if (email && email !== siswa.user.email) {
          const existingUser = await tx.user.findFirst({
            where: {
              email: email,
              id: { not: siswa.userId }
            }
          });

          if (existingUser) {
            throw ErrorFactory.badRequest(`Email ${email} sudah digunakan`);
          }

          await tx.user.update({
            where: { id: siswa.userId },
            data: { email: email }
          });
        }

        // Update RFID jika disediakan
        if (rfid !== undefined) {
          // Check if RFID already exists for another user
          if (rfid) {
            const existingRfid = await tx.user.findFirst({
              where: {
                rfid: rfid,
                id: { not: siswa.userId }
              }
            });

            if (existingRfid) {
              throw ErrorFactory.badRequest(`RFID ${rfid} sudah terdaftar untuk user lain`);
            }
          }

          await tx.user.update({
            where: { id: siswa.userId },
            data: { rfid: rfid }
          });
        }

        // Proses program dan jadwal
        let programSiswaInstance;

        // Handle program update
        if (programId) {
          // Find ALL active programs for this student (to handle multiple active programs)
          const activeProgramSiswas = siswa.programSiswa.filter(ps => ps.status === 'AKTIF');

          if (activeProgramSiswas.length > 0) {
            // Use the first active program and update it
            const currentProgramSiswa = activeProgramSiswas[0];

            // Update the existing program (tidak membuat baru)
            await tx.programSiswa.update({
              where: { id: currentProgramSiswa.id },
              data: {
                programId: programId,
                status: programStatus || 'AKTIF'
              }
            });

            // Deactivate other active programs if any (ensure only one active program)
            if (activeProgramSiswas.length > 1) {
              await tx.programSiswa.updateMany({
                where: {
                  siswaId: siswa.id,
                  status: 'AKTIF',
                  id: { not: currentProgramSiswa.id }
                },
                data: {
                  status: 'TIDAK_AKTIF'
                }
              });

            }

            programSiswaInstance = currentProgramSiswa;
            programSiswaInstance.programId = programId; // Update for subsequent use

          } else {
            // Only create new if no active program exists (edge case)
            programSiswaInstance = await tx.programSiswa.create({
              data: {
                siswaId: siswa.id,
                programId: programId,
                status: programStatus || 'AKTIF',
              }
            });

          }
        } else {
          // If no programId provided, use existing active program
          const activeProgramSiswas = siswa.programSiswa.filter(ps => ps.status === 'AKTIF');
          if (activeProgramSiswas.length > 0) {
            programSiswaInstance = activeProgramSiswas[0];
          }
        }

        // Process jadwal if programSiswaInstance exists and jadwal is provided
        if (programSiswaInstance && jadwal && jadwal.length > 0) {
          const programSiswaId = programSiswaInstance.id;

          // Get current active schedules
          const currentJadwals = await tx.jadwalProgramSiswa.findMany({
            where: {
              programSiswaId
            },
            orderBy: { urutan: 'asc' }
          });


          // Count schedules properly:
          // - Existing schedules that will be updated (with id)
          // - New schedules to be added (without id and not deleted)
          // - Schedules to be deleted (with isDeleted flag)
          const schedulesToUpdate = jadwal.filter(j => j.id && !j.isDeleted);
          const schedulesToAdd = jadwal.filter(j => !j.id && !j.isDeleted);
          const schedulesToDelete = jadwal.filter(j => j.isDeleted && j.id);

          // Calculate final count: current - deleted + added
          const finalScheduleCount = currentJadwals.length - schedulesToDelete.length + schedulesToAdd.length;


          if (finalScheduleCount > 2) {
            throw ErrorFactory.badRequest('Setiap siswa hanya boleh memiliki maksimal 2 jadwal per program.');
          }

          // Sort jadwal by hari to ensure consistent ordering
          const sortedJadwal = [...jadwal].sort((a, b) => {
            const hariOrder = ['SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU', 'MINGGU'];
            return hariOrder.indexOf(a.hari) - hariOrder.indexOf(b.hari);
          });

          // Process each schedule
          let currentUrutan = 1;
          for (const jadwalItem of sortedJadwal) {
            if (jadwalItem.isDeleted) {
              // Delete schedule if it exists
              if (jadwalItem.id) {
                await tx.jadwalProgramSiswa.delete({
                  where: { id: jadwalItem.id }
                });
              }
            } else if (jadwalItem.id) {
              // Update existing schedule
              if (!jadwalItem.hari || !jadwalItem.jamMengajarId) {
                throw ErrorFactory.badRequest('Hari dan Jam Mengajar ID wajib diisi untuk mengubah jadwal');
              }

              // Verify the jamMengajar exists
              const jamMengajar = await tx.jamMengajar.findUnique({
                where: { id: jadwalItem.jamMengajarId }
              });
              if (!jamMengajar) {
                throw ErrorFactory.notFound(`Jam mengajar dengan ID ${jadwalItem.jamMengajarId} tidak ditemukan`);
              }

              await tx.jadwalProgramSiswa.update({
                where: { id: jadwalItem.id },
                data: {
                  hari: jadwalItem.hari,
                  jamMengajarId: jadwalItem.jamMengajarId,
                  urutan: currentUrutan
                }
              });
              currentUrutan++;
            } else {
              // Create new schedule
              if (!jadwalItem.hari || !jadwalItem.jamMengajarId) {
                throw ErrorFactory.badRequest('Hari dan Jam Mengajar ID wajib diisi untuk jadwal baru');
              }

              const jamMengajar = await tx.jamMengajar.findUnique({
                where: { id: jadwalItem.jamMengajarId }
              });
              if (!jamMengajar) {
                throw ErrorFactory.notFound(`Jam mengajar dengan ID ${jadwalItem.jamMengajarId} tidak ditemukan`);
              }

              await tx.jadwalProgramSiswa.create({
                data: {
                  programSiswaId: programSiswaId,
                  hari: jadwalItem.hari,
                  jamMengajarId: jadwalItem.jamMengajarId,
                  urutan: currentUrutan
                }
              });
              currentUrutan++;
            }
          }

          // Reorder remaining schedules if needed
          const remainingSchedules = await tx.jadwalProgramSiswa.findMany({
            where: {
              programSiswaId,
              id: {
                notIn: jadwal
                  .filter(j => j.isDeleted)
                  .map(j => j.id)
                  .filter(id => id) // Filter out undefined/null
              }
            },
            orderBy: { hari: 'asc' }
          });

          // Update urutan for remaining schedules
          for (let i = 0; i < remainingSchedules.length; i++) {
            await tx.jadwalProgramSiswa.update({
              where: { id: remainingSchedules[i].id },
              data: { urutan: i + 1 }
            });
          }
        } else if (jadwal && jadwal.length > 0 && !programSiswaInstance) {
          // If jadwal is provided but no programSiswaInstance, throw error
          throw ErrorFactory.badRequest('Program ID wajib diisi untuk menambah atau mengubah jadwal');
        }


        // Ambil data siswa yang telah diperbarui dengan relasi yang lengkap
        const updatedSiswaWithRelations = await tx.siswa.findUnique({
          where: { id },
          include: {
            user: {
              select: {
                email: true,
                role: true,
                rfid: true
              }
            },
            programSiswa: {
              include: {
                program: true,
                JadwalProgramSiswa: {
                  include: {
                    jamMengajar: true
                  },
                  orderBy: {
                    urutan: 'asc'
                  }
                }
              }
            }
          }
        });

        return updatedSiswaWithRelations;
      });
    } catch (error) {
      logger.error(error);
      throw error;
    }
  }

  async updateStatusSiswa(options) {
    try {
      const { data, where } = options;
      const { programId, siswaId, status } = data;
      
      // Find the program for this student (bisa aktif atau tidak aktif)
      const programSiswa = await prisma.programSiswa.findFirst({
        where: {
          siswaId,
          ...(programId && { programId }) // Only filter by programId if provided
        },
        include: {
          program: {
            select: {
              id: true,
              namaProgram: true,
              tipeProgram: true
            }
          },
          siswa: {
            select: {
              id: true,
              namaMurid: true,
              nis: true,
              keluargaId: true
            }
          }
        }
      });

      if (!programSiswa) {
        throw ErrorFactory.notFound(`Program siswa tidak ditemukan untuk siswa ID ${siswaId}${programId ? ` dan program ID ${programId}` : ''}`);
      }

      const oldStatus = programSiswa.status;

      // Jika status akan diubah menjadi TIDAK_AKTIF dan program PRIVATE (SHARING/BERSAUDARA),
      // dan siswa adalah ketua (keluargaId null), lakukan rotasi ketua
      if (status === 'TIDAK_AKTIF' && programSiswa.program.tipeProgram === 'PRIVATE') {
        const subType = this.getPrivateSubType(programSiswa.program.namaProgram);
        if (subType === 'SHARING' || subType === 'BERSAUDARA') {
          const isKetua = !programSiswa.siswa.keluargaId;
          if (isKetua) {
            const exKetuaId = programSiswa.siswa.id;
            const anggota = await prisma.siswa.findMany({
              where: { keluargaId: exKetuaId },
              select: { id: true }
            });
            if (anggota.length > 0) {
              const randomIndex = CommonServiceUtils.getRandomIndex(anggota.length);
              const ketuaBaru = anggota[randomIndex];
              await prisma.siswa.update({ where: { id: ketuaBaru.id }, data: { keluargaId: null } });
              const otherMemberIds = anggota.filter(a => a.id !== ketuaBaru.id).map(a => a.id);
              if (otherMemberIds.length > 0) {
                await prisma.siswa.updateMany({ where: { id: { in: otherMemberIds } }, data: { keluargaId: ketuaBaru.id } });
              }
            }
          }
        }
      }

      // Update status
      const updatedProgramSiswa = await prisma.programSiswa.update({
        where: { id: programSiswa.id },
        data: { status },
        include: {
          program: {
            select: {
              id: true,
              namaProgram: true
            }
          },
          siswa: {
            select: {
              id: true,
              namaMurid: true,
              nis: true
            }
          }
        }
      });

      // Catat riwayat perubahan status
      await prisma.riwayatStatusSiswa.create({
        data: {
          programSiswaId: updatedProgramSiswa.id,
          statusLama: oldStatus,
          statusBaru: status,
          tanggalPerubahan: CommonServiceUtils.getCurrentDate()
        }
      });


      return {
        message: 'Status program siswa berhasil diperbarui',
        data: {
          siswaId: updatedProgramSiswa.siswa.id,
          siswaNama: updatedProgramSiswa.siswa.namaMurid,
          siswaNis: updatedProgramSiswa.siswa.nis,
          programId: updatedProgramSiswa.programId,
          programNama: updatedProgramSiswa.program.namaProgram,
          statusLama: oldStatus,
          statusBaru: status
        }
      };
    } catch (error) {
      logger.error(error);
      throw error;
    }
  }

  async getSppThisMonthStatus(siswaId) {
    try {
      const currentDate = new Date();
      const currentMonth = currentDate.getMonth() + 1; // 1-12
      const currentYear = currentDate.getFullYear();

      // Get month name in Indonesian
      const monthNames = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
      ];
      const currentMonthName = monthNames[currentMonth - 1];

      // Get active program siswa
      const activeProgramSiswa = await prisma.programSiswa.findFirst({
        where: {
          siswaId: siswaId,
          status: 'AKTIF'
        },
        select: {
          id: true
        }
      });

      if (!activeProgramSiswa) {
        // If no active program, return default values
        return {
          spp: false,
          charge: 0,
          periodeSppId: null
        };
      }

      // Check for SPP this month
      const sppThisMonth = await prisma.periodeSpp.findFirst({
        where: {
          programSiswaId: activeProgramSiswa.id,
          bulan: currentMonthName,
          tahun: currentYear
        },
        include: {
          pembayaran: {
            include: {
              xenditPayment: true
            }
          }
        }
      });

      if (!sppThisMonth) {
        // If no SPP record for this month, return default values
        return {
          spp: false,
          charge: 0,
          periodeSppId: null
        };
      }

      // Check if payment is completed
      const isPaid = sppThisMonth.pembayaran &&
        ['PAID', 'SETTLED'].includes(sppThisMonth.pembayaran.statusPembayaran);

      // Get periodeSppId if payment is not completed
      let periodeSppId = null;
      if (!isPaid) {
        periodeSppId = sppThisMonth.id;
      }

      return {
        spp: !isPaid, // true if not paid, false if paid
        charge: isPaid ? 0 : 250000, // 250.000 if not paid, 0 if paid
        periodeSppId: periodeSppId
      };
    } catch (error) {
      // Return default values on error
      return {
        spp: false,
        charge: 0,
        periodeSppId: null
      };
    }
  }

  async getJadwalSiswa(options) {
    const { data } = options;
    const { rfid } = data;
    try {
      let siswa;

      if (rfid) {
        siswa = await prisma.siswa.findFirst({
          where: {
            user: {
              rfid: rfid
            }
          },
          include: {
            user: {
              select: {
                rfid: true
              }
            },
            programSiswa: {
              where: {
                status: 'AKTIF'
              },
              include: {
                program: {
                  select: {
                    id: true,
                    namaProgram: true
                  }
                },
                kelasProgram: {
                  include: {
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
                    jamMengajar: {
                      select: {
                        id: true,
                        jamMulai: true,
                        jamSelesai: true
                      }
                    }
                  }
                },
                JadwalProgramSiswa: {
                  include: {
                    jamMengajar: {
                      select: {
                        id: true,
                        jamMulai: true,
                        jamSelesai: true
                      }
                    }
                  },
                  orderBy: {
                    urutan: 'asc'
                  }
                }
              }
            }
          }
        });

        if (!siswa) {
          throw ErrorFactory.notFound(`Siswa dengan RFID ${rfid} tidak ditemukan`);
        }
      } else {
        throw ErrorFactory.badRequest('Parameter RFID wajib diisi');
      }

      // Get SPP status for this month
      const sppThisMonth = await this.getSppThisMonthStatus(siswa.id);

      // Format response
      const schedules = [];

      // Process each active program
      for (const programSiswa of siswa.programSiswa) {

        // Group jadwal by kelas program
        const kelasPrograms = new Map();

        // Add from kelasProgram if exists (this is the main schedule)
        if (programSiswa.kelasProgram) {
          const kp = programSiswa.kelasProgram;

          const scheduleEntry = {
            kelasProgramId: kp.id,
            namaKelas: kp.kelas?.namaKelas || 'Tidak Ada Kelas',
            namaProgram: kp.program.namaProgram,
            jamMengajar: []
          };

          // Add jam mengajar from kelas program if exists
          if (kp.jamMengajar) {
            scheduleEntry.jamMengajar.push({
              jamMengajarId: kp.jamMengajar.id,
              Hari: kp.hari, // Get hari from kelas program
              jamMulai: kp.jamMengajar.jamMulai,
              jamSelesai: kp.jamMengajar.jamSelesai
            });
          }

          kelasPrograms.set(kp.id, scheduleEntry);
        }

        // Add from JadwalProgramSiswa (additional schedules) - avoid duplicates

        for (const jadwal of programSiswa.JadwalProgramSiswa) {

          // Find or create kelasProgram entry
          const kelasProgram = await prisma.kelasProgram.findFirst({
            where: {
              programId: programSiswa.programId,
              hari: jadwal.hari,
              jamMengajarId: jadwal.jamMengajarId
            },
            include: {
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
              }
            }
          });

          if (kelasProgram) {

            if (!kelasPrograms.has(kelasProgram.id)) {
              kelasPrograms.set(kelasProgram.id, {
                kelasProgramId: kelasProgram.id,
                namaKelas: kelasProgram.kelas?.namaKelas || 'Tidak Ada Kelas',
                namaProgram: kelasProgram.program.namaProgram,
                jamMengajar: []
              });
            }

            // Check if this jadwal already exists in the kelas program to avoid duplicates
            const existingSchedule = kelasPrograms.get(kelasProgram.id).jamMengajar.find(
              existing => existing.jamMengajarId === jadwal.jamMengajar.id &&
                existing.Hari === jadwal.hari &&
                existing.jamMulai === jadwal.jamMengajar.jamMulai &&
                existing.jamSelesai === jadwal.jamMengajar.jamSelesai
            );

            if (!existingSchedule) {
              // Add jam mengajar only if it doesn't already exist
              kelasPrograms.get(kelasProgram.id).jamMengajar.push({
                jamMengajarId: jadwal.jamMengajar.id,
                Hari: jadwal.hari,
                jamMulai: jadwal.jamMengajar.jamMulai,
                jamSelesai: jadwal.jamMengajar.jamSelesai
              });
            } else {
            }
          } else {
          }
        }

        // If no schedules found from either source, create a basic entry
        if (kelasPrograms.size === 0) {

          // Try to find any kelas program for this program
          const anyKelasProgram = await prisma.kelasProgram.findFirst({
            where: {
              programId: programSiswa.programId
            },
            include: {
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
              jamMengajar: {
                select: {
                  id: true,
                  jamMulai: true,
                  jamSelesai: true
                }
              }
            }
          });

          if (anyKelasProgram) {
            kelasPrograms.set(anyKelasProgram.id, {
              kelasProgramId: anyKelasProgram.id,
              namaKelas: anyKelasProgram.kelas?.namaKelas || 'Tidak Ada Kelas',
              namaProgram: anyKelasProgram.program.namaProgram,
              jamMengajar: anyKelasProgram.jamMengajar ? [{
                jamMengajarId: anyKelasProgram.jamMengajar.id,
                Hari: anyKelasProgram.hari,
                jamMulai: anyKelasProgram.jamMengajar.jamMulai,
                jamSelesai: anyKelasProgram.jamMengajar.jamSelesai
              }] : []
            });
          }
        }

        // Sort jamMengajar by hari and jamMulai for each kelas program
        for (const [kelasProgramId, schedule] of kelasPrograms) {
          schedule.jamMengajar.sort((a, b) => {
            const hariOrder = ['SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU'];
            const hariA = hariOrder.indexOf(a.Hari);
            const hariB = hariOrder.indexOf(b.Hari);

            if (hariA !== hariB) {
              return hariA - hariB;
            }

            // If same day, sort by jamMulai
            return a.jamMulai.localeCompare(b.jamMulai);
          });
        }

        // Add to schedules
        schedules.push(...Array.from(kelasPrograms.values()));
      }

      const result = {
        namaPanggilan: siswa.namaPanggilan || siswa.namaMurid,
        nis: siswa.nis,
        strataPendidikan: siswa.strataPendidikan,
        kelasSekolah: siswa.kelasSekolah,
        schedules: schedules,
        SPPThisMonth: sppThisMonth
      };

      return result;
    } catch (error) {
      logger.error(error);
      throw error;
    }
  }


  async pindahProgram(options) {
    const { data, where } = options;
    const { siswaId } = where;
    try {
      const { programBaruId, jadwal = [] } = data;

      // 1. Validasi siswa
      const siswa = await prisma.siswa.findUnique({
        where: { id: siswaId },
        include: {
          user: true,
          programSiswa: {
            where: { status: 'AKTIF' },
            include: {
              program: true,
              periodeSpp: true
            }
          }
        }
      });

      if (!siswa) {
        throw ErrorFactory.notFound(`Siswa dengan ID ${siswaId} tidak ditemukan`);
      }

      // 2. Validasi program aktif
      if (siswa.programSiswa.length === 0) {
        throw ErrorFactory.badRequest('Siswa tidak memiliki program aktif');
      }

      const programLama = siswa.programSiswa[0];

      // 3. Validasi program baru
      const programBaru = await prisma.program.findUnique({
        where: { id: programBaruId }
      });

      if (!programBaru) {
        throw ErrorFactory.notFound(`Program dengan ID ${programBaruId} tidak ditemukan`);
      }

      if (programLama.program.tipeProgram !== programBaru.tipeProgram) {
        throw ErrorFactory.badRequest('Siswa private tidak bisa pindah ke grup dan sebaliknya');
      }

      // 4. Validasi tidak pindah ke program yang sama
      if (programLama.programId === programBaruId) {
        throw ErrorFactory.badRequest('Tidak dapat pindah ke program yang sama');
      }

      // 5. Proses pindah program dalam transaction
      return await prisma.$transaction(async (tx) => {
        // a. Update status program lama menjadi TIDAK_AKTIF
        await tx.programSiswa.update({
          where: { id: programLama.id },
          data: { status: 'TIDAK_AKTIF' }
        });

        // b. Catat riwayat perubahan status
        await tx.riwayatStatusSiswa.create({
          data: {
            programSiswaId: programLama.id,
            statusLama: 'AKTIF',
            statusBaru: 'TIDAK_AKTIF',
            tanggalPerubahan: CommonServiceUtils.getCurrentDate()
          }
        });

        // c. Hapus SPP yang belum dibayar dari program lama
        const sppBelumDibayar = programLama.periodeSpp.filter(spp => !spp.pembayaranId);

        if (sppBelumDibayar.length > 0) {
          await tx.periodeSpp.deleteMany({
            where: {
              id: { in: sppBelumDibayar.map(spp => spp.id) },
              pembayaranId: null // Double check belum ada pembayaran
            }
          });

        }

        // d. Buat program siswa baru
        const programSiswaBaru = await tx.programSiswa.create({
          data: {
            siswaId: siswaId,
            programId: programBaruId,
            status: 'AKTIF'
          }
        });

        // e. Catat riwayat status untuk program baru
        await tx.riwayatStatusSiswa.create({
          data: {
            programSiswaId: programSiswaBaru.id,
            statusLama: 'TIDAK_AKTIF',
            statusBaru: 'AKTIF',
            tanggalPerubahan: CommonServiceUtils.getCurrentDate()
          }
        });

        // f. Buat jadwal untuk program baru jika ada
        if (jadwal && jadwal.length > 0) {
          if (jadwal.length > 2) {
            throw ErrorFactory.badRequest('Maksimal 2 jadwal per program');
          }

          for (let i = 0; i < jadwal.length; i++) {
            const jadwalItem = jadwal[i];

            // Validasi jam mengajar exists
            const jamMengajar = await tx.jamMengajar.findUnique({
              where: { id: jadwalItem.jamMengajarId }
            });

            if (!jamMengajar) {
              throw ErrorFactory.notFound(`Jam mengajar dengan ID ${jadwalItem.jamMengajarId} tidak ditemukan`);
            }

            await tx.jadwalProgramSiswa.create({
              data: {
                programSiswaId: programSiswaBaru.id,
                hari: jadwalItem.hari,
                jamMengajarId: jadwalItem.jamMengajarId,
                urutan: i + 1
              }
            });
          }
        }

        // g. Generate SPP 5 bulan ke depan untuk program baru
        const tanggalPindah = CommonServiceUtils.getCurrentDate();
        const sppBaru = await SppService.generateFiveMonthsAhead(
          programSiswaBaru.id,
          tanggalPindah,
          tx
        );


        // h. Send email notification
  
        // Return complete data
        const result = await tx.siswa.findUnique({
          where: { id: siswaId },
          include: {
            programSiswa: {
              where: { status: 'AKTIF' },
              include: {
                program: true,
                JadwalProgramSiswa: {
                  include: {
                    jamMengajar: true
                  }
                }
              }
            }
          }
        });

        return {
          siswa: {
            id: result.id,
            nama: result.namaMurid,
            nis: result.nis
          },
          programLama: {
            id: programLama.programId,
            nama: programLama.program.namaProgram,
            sppDihapus: sppBelumDibayar.length
          },
          programBaru: {
            id: programSiswaBaru.programId,
            nama: programBaru.namaProgram,
            jadwal: result.programSiswa[0]?.JadwalProgramSiswa || [],
            sppDigenerate: sppBaru.length
          }
        };
      });
    } catch (error) {
      logger.error(error);
      throw error;
    }
  }
}

module.exports = new SiswaService();