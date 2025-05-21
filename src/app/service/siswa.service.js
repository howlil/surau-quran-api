const { prisma } = require('../../lib/config/prisma.config');
const { logger } = require('../../lib/config/logger.config');
const { NotFoundError, ConflictError, BadRequestError } = require('../../lib/http/errors.http');
const PrismaUtils = require('../../lib/utils/prisma.utils');
const PasswordUtils = require('../../lib/utils/password.utils');
const paymentService = require('./payment.service');
const XenditUtils = require('../../lib/utils/xendit.utils');

class SiswaService {


  //TODO : REGISTER SISWA

  //TODO : PENDAFTAR BARU -> API DARI GET INVOICE XENDIT  FILTER BY STATUS TANGGAL

  async getAll(filters = {}) {
    try {
      const { page = 1, limit = 10, namaProgram, namaMurid, namaPanggilan } = filters;

      const where = {};


      if (namaMurid) {
        where.namaMurid = { contains: namaMurid, mode: 'insensitive' };
      }

      if (namaPanggilan) {
        where.namaPanggilan = { contains: namaPanggilan, mode: 'insensitive' };
      }

      if (namaProgram) {
        where.programSiswa = {
          some: {
            program: {
              namaProgram: {
                contains: namaProgram,
                mode: 'insensitive'
              }
            }
          }
        };
      }


      return await PrismaUtils.paginate(prisma.siswa, {
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
              email: true
            }
          },
          programSiswa: {
            select: {
              status: true,
              program: {
                select: {
                  id: true,
                  namaProgram: true
                }
              },
              JadwalProgramSiswa: {
                select: {
                  hari: true,
                  jamMengajar: {
                    select: {
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
            }
          }

        },
        orderBy: { namaMurid: 'asc' }
      });
    } catch (error) {
      logger.error('Error getting all siswa:', error);
      throw error;
    }
  }

  async getProfile(userId, filters = {}) {
    try {
      const { bulan, page = 1, limit = 10 } = filters;

      const siswa = await prisma.siswa.findUnique({
        where: { userId },
        include: {
          programSiswa: {
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

      if (!siswa) {
        throw new NotFoundError('Profil siswa tidak ditemukan');
      }

      // Build absensi query filter
      const absensiWhere = {
        siswaId: siswa.id
      };

      // Filter by month if provided
      if (bulan) {
        const monthRegex = `-${bulan.padStart(2, '0')}-`; // Format: -MM-
        absensiWhere.tanggal = {
          contains: monthRegex
        };
      }

      // Get the total count of attendance records matching the filter
      const totalAbsensi = await prisma.absensiSiswa.count({
        where: absensiWhere
      });

      // Calculate pagination values
      const skip = (page - 1) * limit;
      const take = parseInt(limit);
      const totalPages = Math.ceil(totalAbsensi / limit);

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

      // Format the jadwal (schedule) data
      const jadwal = [];
      siswa.programSiswa.forEach(ps => {
        ps.JadwalProgramSiswa.forEach(j => {
          jadwal.push({
            hari: j.hari,
            jam: `${j.jamMengajar.jamMulai} - ${j.jamMengajar.jamSelesai}`
          });
        });
      });

      // Format the program data
      const programs = siswa.programSiswa.map(ps => ({
        namaProgram: ps.program.namaProgram,
        status: ps.status
      }));

      // Format the attendance data
      const absensiFormatted = absensi.map(a => ({
        hari: this.getDayFromDate(a.tanggal),
        kelas: a.kelasProgram.kelas?.namaKelas || 'Tidak Ada Kelas',
        program: a.kelasProgram.program.namaProgram,
        tanggal: a.tanggal,
        status: a.statusKehadiran
      }));

      // Build the response object
      const result = {
        namaSiswa: siswa.namaMurid,
        nis: siswa.nis,
        program: programs,
        jadwal: jadwal,
        absensi: {
          data: absensiFormatted,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            totalItems: totalAbsensi,
            totalPages: totalPages,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1
          }
        },
        countAbsensi: {
          hadir,
          sakit,
          izin,
          tidakHadir,
          total
        }
      };

      return result;
    } catch (error) {
      logger.error(`Error getting siswa profile for user ${userId}:`, error);
      throw error;
    }
  }

  // Helper function to get day name from date string
  getDayFromDate(dateString) {
    const days = ['MINGGU', 'SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU'];
    const date = new Date(dateString);
    return days[date.getDay()];
  }

  async adminUpdateSiswa(id, data) {
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
        throw new NotFoundError(`Siswa dengan ID ${id} tidak ditemukan`);
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
        programId,
        programStatus = 'AKTIF',
        jadwal = []
      } = data;

      return await PrismaUtils.transaction(async (tx) => {
        // Update data siswa dasar
        let updatedSiswa = await tx.siswa.update({
          where: { id },
          data: {
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
            kelasSekolah
          }
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
            throw new ConflictError(`Email ${email} sudah digunakan`);
          }

          await tx.user.update({
            where: { id: siswa.userId },
            data: { email: email }
          });
        }

        // Proses program dan jadwal jika programId disediakan
        if (programId) {
          // Cek apakah program sudah ada
          let programSiswaId;
          const existingProgramSiswa = siswa.programSiswa.find(ps => ps.programId === programId);

          if (existingProgramSiswa) {
            // Update program yang ada
            await tx.programSiswa.update({
              where: { id: existingProgramSiswa.id },
              data: { status: programStatus }
            });

            programSiswaId = existingProgramSiswa.id;
          }

          // Proses jadwal
          if (jadwal && jadwal.length > 0) {
            // Ambil jadwal yang sudah ada untuk program ini
            const existingJadwals = existingProgramSiswa ?
              await tx.jadwalProgramSiswa.findMany({
                where: { programSiswaId }
              }) : [];

            // Map jadwal yang sudah ada berdasarkan ID
            const existingJadwalMap = {};
            for (const jadwal of existingJadwals) {
              existingJadwalMap[jadwal.id] = jadwal;
            }

            // Proses setiap jadwal yang dikirim
            for (const jadwalItem of jadwal) {
              const { hari, jamMengajarId } = jadwalItem;

              // Hanya buat jadwal baru jika minimal satu nilai disediakan
              if (hari || jamMengajarId) {
                const newData = { programSiswaId };

                // Gunakan nilai default jika tidak disediakan
                if (!hari && existingJadwals.length > 0) {
                  // Gunakan hari dari jadwal pertama sebagai default
                  newData.hari = existingJadwals[0].hari;
                } else if (hari) {
                  newData.hari = hari;
                } else {
                  // Jika tidak ada jadwal yang ada dan hari tidak disediakan
                  throw new BadRequestError('Hari wajib diisi untuk jadwal baru');
                }

                if (!jamMengajarId && existingJadwals.length > 0) {
                  // Gunakan jamMengajarId dari jadwal pertama sebagai default
                  newData.jamMengajarId = existingJadwals[0].jamMengajarId;
                } else if (jamMengajarId) {
                  // Verifikasi jamMengajarId valid
                  const jamMengajar = await tx.jamMengajar.findUnique({
                    where: { id: jamMengajarId }
                  });

                  if (!jamMengajar) {
                    throw new NotFoundError(`Jam mengajar dengan ID ${jamMengajarId} tidak ditemukan`);
                  }

                  newData.jamMengajarId = jamMengajarId;
                } else {
                  // Jika tidak ada jadwal yang ada dan jamMengajarId tidak disediakan
                  throw new BadRequestError('Jam mengajar ID wajib diisi untuk jadwal baru');
                }

                await tx.jadwalProgramSiswa.create({
                  data: newData
                });
              }
            }
          }
        }

        logger.info(`Admin updated siswa with ID: ${id}`);

        // Ambil data siswa yang telah diperbarui dengan relasi yang lengkap
        const updatedSiswaWithRelations = await tx.siswa.findUnique({
          where: { id },
          include: {
            user: {
              select: {
                email: true,
                role: true
              }
            },
            programSiswa: {
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

        return updatedSiswaWithRelations;
      });
    } catch (error) {
      logger.error(`Error in admin update siswa for ID ${id}:`, error);
      throw error;
    }
  }
}

module.exports = new SiswaService();