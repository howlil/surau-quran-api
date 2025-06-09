const { prisma } = require('../../lib/config/prisma.config');
const { logger } = require('../../lib/config/logger.config');
const { NotFoundError, ConflictError, BadRequestError } = require('../../lib/http/errors.http');
const PrismaUtils = require('../../lib/utils/prisma.utils');
const moment = require('moment');
const PasswordUtils = require('../../lib/utils/password.utils');
const paymentService = require('./payment.service');
const DataGeneratorUtils = require('../../lib/utils/data-generator.utils');
const EmailUtils = require('../../lib/utils/email.utils');
class SiswaService {

  async createPendaftaran(pendaftaranData) {
    try {
      const {
        namaMurid,
        namaPanggilan,
        tanggalLahir,
        jenisKelamin,
        alamat,
        strataPendidikan,
        kelasSekolah,
        email,
        namaSekolah,
        namaOrangTua,
        namaPenjemput,
        noWhatsapp,
        programId,
        jadwal,
        kodeVoucher,
        jumlahPembayaran,
        totalBiaya,
      } = pendaftaranData;

      const existingUser = await prisma.user.findUnique({
        where: { email }
      });

      if (existingUser) {
        throw new ConflictError(`Email ${email} sudah terdaftar`);
      }

      const program = await prisma.program.findUnique({
        where: { id: programId }
      });

      if (!program) {
        throw new NotFoundError(`Program dengan ID ${programId} tidak ditemukan`);
      }

      const validJadwalIds = [];
      for (const jadwalItem of jadwal) {
        const jamMengajar = await prisma.jamMengajar.findUnique({
          where: { id: jadwalItem.jamMengajarId }
        });

        if (!jamMengajar) {
          throw new NotFoundError(`Jam mengajar dengan ID ${jadwalItem.jamMengajarId} tidak ditemukan`);
        }

        validJadwalIds.push(jadwalItem.id);
      }

      let voucherId = null;
      let actualDiskon = 0;

      if (kodeVoucher) {
        const voucher = await prisma.voucher.findUnique({
          where: {
            kodeVoucher: kodeVoucher.toUpperCase(),
            isActive: true
          }
        });

        if (!voucher) {
          throw new NotFoundError(`Voucher ${kodeVoucher} tidak valid atau tidak aktif`);
        }

        if (voucher.jumlahPenggunaan <= 0) {
          throw new BadRequestError(`Voucher ${kodeVoucher} sudah habis digunakan`);
        }

        voucherId = voucher.id;

        if (voucher.tipe === 'NOMINAL') {
          actualDiskon = Number(voucher.nominal);
        } else if (voucher.tipe === 'PERSENTASE') {
          actualDiskon = Number(jumlahPembayaran) * (Number(voucher.nominal) / 100);
        }

        const calculatedTotal = Number(jumlahPembayaran) - actualDiskon;
        if (Math.abs(calculatedTotal - Number(totalBiaya)) > 0.01) {
          throw new BadRequestError('Total biaya tidak sesuai dengan perhitungan diskon');
        }
      } else {
        if (Number(jumlahPembayaran) !== Number(totalBiaya)) {
          throw new BadRequestError('Total biaya harus sama dengan jumlah pembayaran jika tidak ada voucher');
        }
      }

      const paymentData = await paymentService.createPendaftaranInvoice({
        email,
        namaMurid,
        totalBiaya,
        noWhatsapp,
        alamat
      });

      const pendaftaranTemp = await prisma.pendaftaranTemp.create({
        data: {
          namaMurid,
          namaPanggilan: namaPanggilan || null,
          tanggalLahir: tanggalLahir || null,
          jenisKelamin,
          alamat: alamat || null,
          strataPendidikan: strataPendidikan || null,
          kelasSekolah: kelasSekolah || null,
          email,
          namaSekolah: namaSekolah || null,
          namaOrangTua,
          namaPenjemput: namaPenjemput || null,
          noWhatsapp: noWhatsapp || null,
          programId,
          jadwalJson: JSON.stringify(jadwal),
          kodeVoucher: kodeVoucher?.toUpperCase() || null,
          biayaPendaftaran: jumlahPembayaran,
          diskon: actualDiskon,
          totalBiaya,
          pembayaranId: paymentData.pembayaranId,
          voucherId
        }
      });

      logger.info(`Created pendaftaran temp with ID: ${pendaftaranTemp.id} for email: ${email}`);

      return {
        pendaftaranId: pendaftaranTemp.id,
        paymentInfo: paymentData
      };
    } catch (error) {
      logger.error('Error creating pendaftaran:', error);
      throw error;
    }
  }

  async processPaidPendaftaran(pembayaranId) {
    try {
      return await PrismaUtils.transaction(async (tx) => {
        const pendaftaranTemp = await tx.pendaftaranTemp.findUnique({
          where: { pembayaranId }
        });
        if (!pendaftaranTemp) {
          throw new NotFoundError(`Data pendaftaran tidak ditemukan untuk pembayaran ID ${pembayaranId}`);
        }

        const existingUser = await tx.user.findUnique({
          where: { email: pendaftaranTemp.email }
        });
        if (existingUser) {
          logger.warn(`User with email ${pendaftaranTemp.email} already exists, skipping user creation`);
          throw new ConflictError(`Email ${pendaftaranTemp.email} sudah terdaftar`);
        }

        const defaultPassword = DataGeneratorUtils.generateRandomPassword();
        const hashedPassword = await PasswordUtils.hash(defaultPassword);

        const user = await tx.user.create({
          data: {
            email: pendaftaranTemp.email,
            password: hashedPassword,
            role: 'SISWA'
          }
        });

        // 5. Generate NIS unik
        const existingNISNumbers = await tx.siswa.findMany({ select: { nis: true } });
        const nisNumber = DataGeneratorUtils.generateNIS(
          existingNISNumbers.map(s => s.nis).filter(Boolean)
        );

        // 6. Create siswa baru
        const siswa = await tx.siswa.create({
          data: {
            userId: user.id,
            nis: nisNumber,
            noWhatsapp: pendaftaranTemp.noWhatsapp,
            namaMurid: pendaftaranTemp.namaMurid,
            namaPanggilan: pendaftaranTemp.namaPanggilan,
            tanggalLahir: pendaftaranTemp.tanggalLahir,
            jenisKelamin: pendaftaranTemp.jenisKelamin,
            alamat: pendaftaranTemp.alamat,
            strataPendidikan: pendaftaranTemp.strataPendidikan,
            kelasSekolah: pendaftaranTemp.kelasSekolah,
            namaSekolah: pendaftaranTemp.namaSekolah,
            namaOrangTua: pendaftaranTemp.namaOrangTua,
            namaPenjemput: pendaftaranTemp.namaPenjemput,
            isRegistered: true
          }
        });

        // 7. Catat pendaftaran final
        const pendaftaran = await tx.pendaftaran.create({
          data: {
            siswaId: siswa.id,
            biayaPendaftaran: pendaftaranTemp.biayaPendaftaran,
            tanggalDaftar: new Date().toISOString().split('T')[0],
            diskon: pendaftaranTemp.diskon,
            totalBiaya: pendaftaranTemp.totalBiaya,
            voucher_id: pendaftaranTemp.voucherId,
            pembayaranId
          }
        });

        // 8. Daftarkan program siswa (hanya satu)
        const programSiswa = await tx.programSiswa.create({
          data: {
            siswaId: siswa.id,
            programId: pendaftaranTemp.programId,
            status: 'AKTIF'
          }
        });

        const jadwalList = [];
        const jadwal = Array.isArray(pendaftaranTemp.jadwalJson)
          ? pendaftaranTemp.jadwalJson
          : JSON.parse(pendaftaranTemp.jadwalJson);

        for (const jadwalItem of jadwal) {
          const jadwalProgramSiswa = await tx.jadwalProgramSiswa.create({
            data: {
              programSiswaId: programSiswa.id,
              hari: jadwalItem.hari,
              urutan: jadwalItem.urutan,
              jamMengajarId: jadwalItem.jamMengajarId
            }
          });
          jadwalList.push(jadwalProgramSiswa);
        }

        await tx.riwayatStatusSiswa.create({
          data: {
            programSiswaId: programSiswa.id,
            statusLama: 'TIDAK_AKTIF',
            statusBaru: 'AKTIF',
            tanggalPerubahan: new Date().toISOString().split('T')[0],
            keterangan: 'Pendaftaran baru setelah pembayaran berhasil'
          }
        });

        if (pendaftaranTemp.voucherId) {
          await tx.voucher.update({
            where: { id: pendaftaranTemp.voucherId },
            data: {
              jumlahPenggunaan: { decrement: 1 }
            }
          });
        }

        // 12. Hapus data pendaftaranTemp
        await tx.pendaftaranTemp.delete({ where: { id: pendaftaranTemp.id } });


        // 13. Generate PeriodeSpp bulan berjalan untuk program yang baru didaftarkan
        const bulanDaftar = new Date(); // Bulan daftar, bisa juga custom dari pendaftaranTemp
        const namaBulan = bulanDaftar.toLocaleString('id-ID', { month: 'long' }); // Contoh: "Mei"
        const tahunDaftar = bulanDaftar.getFullYear();

        await tx.periodeSpp.create({
          data: {
            programSiswaId: programSiswa.id,
            bulan: namaBulan,
            tahun: tahunDaftar,
            tanggalTagihan: bulanDaftar.toISOString().split('T')[0],
            jumlahTagihan: 0,
            diskon: 0,
            totalTagihan: 0,
            pembayaranId,
            voucher_id: null
          }
        });

        const sppAmount = await this.#getSppAmount(pendaftaranTemp.programId);
        const sppPeriods = [];

        for (let i = 1; i <= 3; i++) {
          const sppDate = new Date(bulanDaftar);
          sppDate.setMonth(sppDate.getMonth() + i);

          const bulan = sppDate.toLocaleString('id-ID', { month: 'long' });
          const tahun = sppDate.getFullYear();
          const tanggalTagihan = `${tahun}-${String(sppDate.getMonth() + 1).padStart(2, '0')}-25`;

          const periodeSpp = await tx.periodeSpp.create({
            data: {
              programSiswaId: programSiswa.id,
              bulan,
              tahun,
              tanggalTagihan,
              jumlahTagihan: sppAmount,
              diskon: 0,
              totalTagihan: sppAmount,
              voucher_id: null
            }
          });

          sppPeriods.push(periodeSpp);
        }

        // TODO : SEND EMAIL 
        // 14. Kirim welcome email (di luar transaksi supaya tidak rollback kalau email gagal)
        // process.nextTick(async () => {
        //   try {
        //     await EmailUtils.sendWelcomeEmail({
        //       email: user.email,
        //       namaMurid: siswa.namaMurid,
        //       password: defaultPassword,
        //       nis: siswa.nis
        //     });
        //   } catch (emailError) {
        //     logger.warn('Failed to send welcome email:', emailError);
        //   }
        // });

        // logger.info(`Successfully processed paid pendaftaran for user: ${user.email}`);

        return {
          success: true,
          pendaftaran,
          siswa: {
            id: siswa.id,
            nis: siswa.nis,
            namaMurid: siswa.namaMurid,
            email: user.email
          },
          programSiswa,
          jadwal: jadwalList,
          defaultPassword,
          message: `Akun berhasil dibuat dengan email: ${user.email} dan password sementara: ${defaultPassword}`
        };
      });
    } catch (error) {
      logger.error('Error processing paid pendaftaran:', error);
      throw error;
    }
  }

  async #getSppAmount(programId) {
    const program = await prisma.program.findUnique({
      where: { id: programId },
      include: {
        kelasProgram: true
      }
    });

    const defaultSppAmount = 300000;

    return defaultSppAmount;
  }

  async getPendaftaranInvoice(invoices, filters = {}) {
    const { status, tanggal, page = 1, limit = 10 } = filters;

    let filteredInvoices = invoices;
    if (status) {
      filteredInvoices = filteredInvoices.filter(inv => inv.status === status);
    }
    if (tanggal) {
      filteredInvoices = filteredInvoices.filter(inv => {
        const invoiceDate = moment(inv.createdAt).format('DD-MM-YYYY');
        return invoiceDate === tanggal;
      });
    }

    const startIdx = (page - 1) * limit;
    const pagedInvoices = filteredInvoices.slice(startIdx, startIdx + Number(limit));
    const result = [];

    logger.info(pagedInvoices)

    for (const invoice of pagedInvoices) {
      // 1. Ambil pembayaranId dari XenditPayment
      const xenditPayment = await prisma.xenditPayment.findUnique({
        where: { xenditInvoiceId: invoice.id }
      });
      const pembayaranId = xenditPayment?.pembayaranId || null;

      // Logging debug (boleh dihapus kalau sudah stabil)
      console.log('[DEBUG getPendaftaranInvoice]', {
        invoiceId: invoice.id,
        status: invoice.status,
        pembayaranId,
      });

      let data = {
        invoice: {
          id: invoice.id,
          xenditInvoiceId: invoice.id,
          status: invoice.status,
          amount: invoice.amount,
          invoiceUrl: invoice.invoiceUrl,
          createdAt: invoice.createdAt,
          expiredAt: invoice.expiredAt,
        },
        student: null,
        registration: null,
        schedule: [],
      };

      if (invoice.status === 'PAID' && pembayaranId) {
        // Sudah migrate ke tabel utama
        const pendaftaran = await prisma.pendaftaran.findUnique({
          where: { pembayaranId },
          include: {
            siswa: {
              include: {
                programSiswa: {
                  include: {
                    JadwalProgramSiswa: true
                  }
                }
              }
            }
          }
        });
        const siswa = pendaftaran?.siswa;
        const programAktif = siswa?.programSiswa?.find(p => p.status === 'AKTIF');
        data.student = siswa
          ? {
            id: siswa.id,
            nama: siswa.namaMurid,
            namaPanggilan: siswa.namaPanggilan,
            email: siswa.user?.email || null,
            jenisKelamin: siswa.jenisKelamin,
            tanggalLahir: siswa.tanggalLahir,
            alamat: siswa.alamat,
            strataPendidikan: siswa.strataPendidikan,
            kelasSekolah: siswa.kelasSekolah,
            namaSekolah: siswa.namaSekolah,
            namaOrangTua: siswa.namaOrangTua,
            namaPenjemput: siswa.namaPenjemput,
            noWhatsapp: siswa.noWhatsapp,
          }
          : null;
        data.registration = pendaftaran
          ? {
            pembayaranId: pendaftaran.pembayaranId,
            biayaPendaftaran: Number(pendaftaran.biayaPendaftaran),
            diskon: Number(pendaftaran.diskon),
            totalBiaya: Number(pendaftaran.totalBiaya),
            programId: programAktif?.programId || null,
            kodeVoucher: pendaftaran.voucher?.kodeVoucher || null,
            voucherId: pendaftaran.voucher_id || null,
            tanggalDaftar: pendaftaran.tanggalDaftar,
          }
          : null;
        data.schedule = programAktif
          ? programAktif.JadwalProgramSiswa.map(jadwal => ({
            hari: jadwal.hari,
            urutan: jadwal.urutan,
            jamMengajarId: jadwal.jamMengajarId,
          }))
          : [];
      } else if (pembayaranId) {
        // MASIH di temp table
        const pendaftaranTemp = await prisma.pendaftaranTemp.findUnique({
          where: { pembayaranId }
        });
        let jadwalArr = [];
        try {
          jadwalArr = JSON.parse(pendaftaranTemp?.jadwalJson || '[]');
        } catch (_) {
          jadwalArr = [];
        }
        data.student = pendaftaranTemp
          ? {
            id: pendaftaranTemp.id,
            nama: pendaftaranTemp.namaMurid,
            namaPanggilan: pendaftaranTemp.namaPanggilan,
            email: pendaftaranTemp.email,
            jenisKelamin: pendaftaranTemp.jenisKelamin,
            tanggalLahir: pendaftaranTemp.tanggalLahir,
            alamat: pendaftaranTemp.alamat,
            strataPendidikan: pendaftaranTemp.strataPendidikan,
            kelasSekolah: pendaftaranTemp.kelasSekolah,
            namaSekolah: pendaftaranTemp.namaSekolah,
            namaOrangTua: pendaftaranTemp.namaOrangTua,
            namaPenjemput: pendaftaranTemp.namaPenjemput,
            noWhatsapp: pendaftaranTemp.noWhatsapp,
          }
          : null;
        data.registration = pendaftaranTemp
          ? {
            pembayaranId: pendaftaranTemp.pembayaranId,
            biayaPendaftaran: Number(pendaftaranTemp.biayaPendaftaran),
            diskon: Number(pendaftaranTemp.diskon),
            totalBiaya: Number(pendaftaranTemp.totalBiaya),
            programId: pendaftaranTemp.programId || null,
            kodeVoucher: pendaftaranTemp.kodeVoucher || null,
            voucherId: pendaftaranTemp.voucherId || null,
            tanggalDaftar: null,
          }
          : null;
        data.schedule = jadwalArr.map(jadwal => ({
          hari: jadwal.hari,
          urutan: jadwal.urutan,
          jamMengajarId: jadwal.jamMengajarId,
        }));
      }

      result.push(data);
    }

    return {
      result,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: filteredInvoices.length
      }
    };
  }

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
                  urutan: true,
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
        throw new NotFoundError('Profil siswa tidak ditemukan');
      }

      // Build absensi query filter
      const absensiWhere = {
        siswaId: siswa.id
      };

      if (bulan) {
        const [month, year] = bulan.split('-');
        if (!month || !year || month.length !== 2 || year.length !== 4) {
          throw new BadRequestError('Format bulan harus MM-YYYY');
        }

        const startDate = `${year}-${month}-01`;
        const endDate = moment(startDate).endOf('month').format('YYYY-MM-DD');

        absensiWhere.tanggal = {
          gte: startDate,
          lte: endDate
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
            urutan: j.urutan,
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
        programStatus,
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

  async updateStatusSiswa(programId, siswaId, status) {
    try {
      const programSiswa = await prisma.programSiswa.findFirst({
        where: {
          programId,
          siswaId
        }
      });

      if (!programSiswa) {
        throw new NotFoundError(`Program siswa dengan ID ${siswaId} tidak ditemukan untuk program ID ${programId}`);
      }

      const oldStatus = programSiswa.status;

      const updatedProgramSiswa = await prisma.programSiswa.update({
        where: { id: programSiswa.id },
        data: { status }
      });

      // Catat riwayat perubahan status
      await prisma.riwayatStatusSiswa.create({
        data: {
          programSiswaId: updatedProgramSiswa.id,
          statusLama: oldStatus,
          statusBaru: status,
          tanggalPerubahan: new Date().toISOString().split('T')[0],
          keterangan: `Status diubah menjadi ${status}`
        }
      });

      return updatedProgramSiswa;
    } catch (error) {
      logger.error(`Error updating status for siswa ID ${siswaId} in program ID ${programId}:`, error);
      throw error;
    }
  }
}

module.exports = new SiswaService();