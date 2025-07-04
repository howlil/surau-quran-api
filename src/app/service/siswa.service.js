const { prisma } = require('../../lib/config/prisma.config');
const { logger } = require('../../lib/config/logger.config');
const { NotFoundError, ConflictError, BadRequestError } = require('../../lib/http/errors.http');
const PrismaUtils = require('../../lib/utils/prisma.utils');
const moment = require('moment');
const PasswordUtils = require('../../lib/utils/password.utils');
const paymentService = require('./payment.service');
const DataGeneratorUtils = require('../../lib/utils/data-generator.utils');
const EmailUtils = require('../../lib/utils/email.utils');
const SppService = require('./spp.service');
const { DATE_FORMATS } = require('../../lib/constants');
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
        kodeVoucher,
        jumlahPembayaran,
        totalBiaya,
      } = pendaftaranData;

      // Clean and normalize namaMurid and namaPanggilan before use
      const cleanedNamaMurid = namaMurid.trim().replace(/\s+/g, ' ');
      const cleanedNamaPanggilan = namaPanggilan ? namaPanggilan.trim().replace(/\s+/g, ' ') : null;

      // Check if email exists in user table
      const existingUser = await prisma.user.findUnique({
        where: { email }
      });

      if (existingUser) {
        throw new ConflictError(`Email ${email} sudah terdaftar`);
      }

      // Check if email exists in siswa table through pendaftaranTemp
      const existingPendaftaranTemp = await prisma.pendaftaranTemp.findFirst({
        where: {
          email
        }
      });

      if (existingPendaftaranTemp) {
        // Get the associated payment
        const existingPayment = await prisma.pembayaran.findUnique({
          where: { id: existingPendaftaranTemp.pembayaranId }
        });

        // If there's an expired or failed registration, delete it
        if (existingPayment && ['EXPIRED', 'FAILED'].includes(existingPayment.statusPembayaran)) {
          logger.info(`Found expired/failed registration for email ${email}, cleaning up...`);
          await prisma.$transaction(async (tx) => {
            // Delete the payment record first
            await tx.pembayaran.delete({
              where: { id: existingPendaftaranTemp.pembayaranId }
            });
            // Then delete the temporary registration
            await tx.pendaftaranTemp.delete({
              where: { id: existingPendaftaranTemp.id }
            });
          });
          logger.info(`Successfully cleaned up expired/failed registration for email ${email}`);
        } else if (existingPayment && existingPayment.statusPembayaran === 'PENDING') {
          throw new ConflictError(`Email ${email} sedang dalam proses pendaftaran`);
        }
      }

      // Check if email exists in siswa table
      const existingSiswa = await prisma.siswa.findFirst({
        where: {
          user: {
            email
          }
        },
        include: {
          programSiswa: {
            where: {
              status: 'AKTIF'
            }
          }
        }
      });

      if (existingSiswa) {
        if (existingSiswa.programSiswa.length > 0) {
          throw new ConflictError(`Email ${email} sudah terdaftar sebagai siswa dengan program aktif. Untuk mengubah program, silakan hubungi admin.`);
        }
        throw new ConflictError(`Email ${email} sudah terdaftar sebagai siswa`);
      }

      const program = await prisma.program.findUnique({
        where: { id: programId }
      });

      if (!program) {
        throw new NotFoundError(`Program dengan ID ${programId} tidak ditemukan`);
      }

      let voucherId = null;
      let actualDiskon = 0;
      let calculatedTotal = Number(jumlahPembayaran);

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

          // Validasi diskon nominal tidak boleh lebih besar dari biaya pendaftaran
          if (actualDiskon >= Number(jumlahPembayaran)) {
            throw new BadRequestError(`Diskon voucher Rp ${actualDiskon.toLocaleString('id-ID')} tidak boleh lebih besar atau sama dengan biaya pendaftaran Rp ${Number(jumlahPembayaran).toLocaleString('id-ID')}`);
          }
        } else if (voucher.tipe === 'PERSENTASE') {
          // Validasi persentase maksimal 100%
          if (Number(voucher.nominal) > 100) {
            throw new BadRequestError(`Persentase diskon tidak boleh lebih dari 100%`);
          }

          actualDiskon = Number(jumlahPembayaran) * (Number(voucher.nominal) / 100);
        }

        calculatedTotal = Number(jumlahPembayaran) - actualDiskon;

        // Validasi total biaya minimal Rp 1.000 (requirement Xendit)
        if (calculatedTotal < 1000) {
          throw new BadRequestError(`Total biaya setelah diskon minimal Rp 1.000. Saat ini: Rp ${calculatedTotal.toLocaleString('id-ID')}`);
        }
      }

      // If totalBiaya is provided, validate it matches our calculation
      if (totalBiaya !== undefined) {
        if (Math.abs(calculatedTotal - Number(totalBiaya)) > 0.01) {
          throw new BadRequestError('Total biaya tidak sesuai dengan perhitungan diskon');
        }
      }

      const paymentData = await paymentService.createPendaftaranInvoice({
        email,
        namaMurid: cleanedNamaMurid,
        totalBiaya: calculatedTotal,
        noWhatsapp,
        alamat
      });

      const pendaftaranTemp = await prisma.pendaftaranTemp.create({
        data: {
          namaMurid: cleanedNamaMurid,
          namaPanggilan: cleanedNamaPanggilan,
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
          kodeVoucher: kodeVoucher?.toUpperCase() || null,
          biayaPendaftaran: jumlahPembayaran,
          diskon: actualDiskon,
          totalBiaya: calculatedTotal,
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
      logger.info(`Starting pendaftaran process for payment ID: ${pembayaranId}`);

      // First check if this payment has already been processed
      const existingPendaftaran = await prisma.pendaftaran.findUnique({
        where: { pembayaranId },
        include: {
          siswa: {
            include: {
              user: true
            }
          }
        }
      });

      // If a pendaftaran record already exists, this payment has been processed
      if (existingPendaftaran) {
        logger.info(`Payment ID ${pembayaranId} has already been processed. Student: ${existingPendaftaran.siswa.namaMurid} (${existingPendaftaran.siswa.user.email})`);
        return existingPendaftaran.siswa;
      }

      // Get the payment data
      const pembayaran = await prisma.pembayaran.findUnique({
        where: { id: pembayaranId },
        include: {
          xenditPayment: true
        }
      });

      if (!pembayaran) {
        logger.error(`Payment not found for ID: ${pembayaranId}`);
        throw new NotFoundError('Payment not found');
      }

      // Get pendaftaranTemp data directly
      const pendaftaranTemp = await prisma.pendaftaranTemp.findFirst({
        where: { pembayaranId }
      });

      if (!pendaftaranTemp) {
        // Check if this might be a duplicate callback for an already processed payment
        logger.error(`PendaftaranTemp not found for payment ID: ${pembayaranId}`);

        // Check one more time if the pendaftaran exists (in case race condition)
        const finalCheck = await prisma.pendaftaran.findUnique({
          where: { pembayaranId },
          include: {
            siswa: true
          }
        });

        if (finalCheck) {
          logger.info(`Found existing pendaftaran record for payment ID ${pembayaranId} on final check. Already processed.`);
          return finalCheck.siswa;
        }

        throw new NotFoundError('Pendaftaran temporary data not found');
      }

      logger.info(`Found pendaftaran temp data for email: ${pendaftaranTemp.email}`);

      if (pembayaran.statusPembayaran !== 'PAID') {
        logger.error(`Payment status is not PAID for payment ID: ${pembayaranId}, current status: ${pembayaran.statusPembayaran}`);
        throw new Error('Payment is not completed');
      }

      // Generate a secure password for the user
      const generatedPassword = DataGeneratorUtils.generatePassword();
      const hashedPassword = await PasswordUtils.hash(generatedPassword);

      // Create user account
      const user = await prisma.user.create({
        data: {
          email: pendaftaranTemp.email,
          password: hashedPassword,
          role: 'SISWA'
        }
      });

      // Generate NIS
      const currentYear = new Date().getFullYear();
      const randomNumber = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      const nis = `${currentYear}${randomNumber}`;

      // Create siswa record
      const siswa = await prisma.siswa.create({
        data: {
          userId: user.id,
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
          noWhatsapp: pendaftaranTemp.noWhatsapp,
          isRegistered: true,
          nis: nis
        }
      });

      // Create program siswa record
      const programSiswa = await prisma.programSiswa.create({
        data: {
          siswaId: siswa.id,
          programId: pendaftaranTemp.programId,
          status: 'AKTIF',
          isVerified: true
        }
      });

      // Create pendaftaran record
      await prisma.pendaftaran.create({
        data: {
          siswaId: siswa.id,
          pembayaranId: pembayaranId,
          biayaPendaftaran: pendaftaranTemp.biayaPendaftaran,
          diskon: pendaftaranTemp.diskon,
          totalBiaya: pendaftaranTemp.totalBiaya,
          voucher_id: pendaftaranTemp.voucherId,
          tanggalDaftar: moment().format(DATE_FORMATS.DEFAULT)
        }
      });

      // Delete temporary registration data
      await prisma.pendaftaranTemp.delete({
        where: { id: pendaftaranTemp.id }
      });

      // Generate SPP untuk 5 bulan ke depan
      try {
        const tanggalDaftar = moment().format(DATE_FORMATS.DEFAULT);
        const sppRecords = await SppService.generateFiveMonthsAhead(programSiswa.id, tanggalDaftar);
        logger.info(`Generated ${sppRecords.length} SPP records for siswa: ${siswa.namaMurid}`);
      } catch (sppError) {
        logger.error(`Failed to generate SPP for siswa ${siswa.namaMurid}:`, {
          error: sppError.message,
          stack: sppError.stack
        });
      }

      // Send welcome email with credentials - but don't let email failure block the process
      try {
        await EmailUtils.sendWelcomeEmail({
          email: user.email,
          name: siswa.namaMurid,
          password: generatedPassword
        });
        logger.info(`Welcome email sent successfully to: ${user.email}`);
      } catch (emailError) {
        // Log the error but don't throw it
        logger.error(`Failed to send welcome email to ${user.email}:`, {
          error: emailError.message,
          stack: emailError.stack
        });
        logger.info(`Registration completed successfully for ${user.email}, but welcome email could not be sent`);
      }

      logger.info(`Successfully completed pendaftaran process for siswa: ${siswa.namaMurid} (ID: ${siswa.id})`);
      return siswa;
    } catch (error) {
      logger.error('Error processing paid pendaftaran:', {
        error: error.message,
        stack: error.stack,
        pembayaranId
      });
      throw error;
    }
  }


  async getPendaftaranInvoice(invoices, filters = {}) {
    const { status, tanggal, page = 1, limit = 10 } = filters;

    let filteredInvoices = invoices;
    if (status) {
      filteredInvoices = filteredInvoices.filter(inv => inv.status === status);
    }
    if (tanggal) {
      filteredInvoices = filteredInvoices.filter(inv => {
        const invoiceDate = moment(inv.createdAt).format(DATE_FORMATS.DEFAULT);
        return invoiceDate === tanggal;
      });
    }

    // Sort invoices by createdAt in descending order (newest first)
    filteredInvoices.sort((a, b) => {
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

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
      };

      if ((invoice.status === 'PAID' || invoice.status === 'SETTLED') && pembayaranId) {
        // Sudah migrate ke tabel utama
        const pendaftaran = await prisma.pendaftaran.findUnique({
          where: { pembayaranId },
          include: {
            voucher: {
              select: {
                kodeVoucher: true
              }
            },
            siswa: {
              include: {
                user: {
                  select: {
                    email: true
                  }
                },
                programSiswa: {
                  select: {
                    programId: true,
                    status: true
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
      } else if (pembayaranId) {
        // MASIH di temp table
        const pendaftaranTemp = await prisma.pendaftaranTemp.findUnique({
          where: { pembayaranId }
        });

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
            programId: programId,
            status: 'AKTIF'
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
              email: true
            }
          },
          programSiswa: {
            where: {
              status: 'AKTIF'
            },
            take: 1,
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
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      // Transform programSiswa dari array menjadi objek tunggal
      const transformedData = result.data.map(siswa => ({
        ...siswa,
        programSiswa: siswa.programSiswa.length > 0 ? siswa.programSiswa[0] : null
      }));

      return {
        ...result,
        data: transformedData
      };
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

        // Use pattern matching for DD-MM-YYYY format in database
        absensiWhere.tanggal = {
          contains: `-${month}-${year}`
        };

        logger.info(`Filtering absensi for month ${bulan}: pattern "-${month}-${year}"`);
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
      let currentProgram = null;

      // Get the active program (assuming one program per student)
      const activeProgramSiswa = siswa.programSiswa.find(ps => ps.status === 'AKTIF');

      if (activeProgramSiswa) {
        currentProgram = {
          namaProgram: activeProgramSiswa.program.namaProgram,
          status: activeProgramSiswa.status
        };

        // Get jadwal for the active program
        activeProgramSiswa.JadwalProgramSiswa.forEach(j => {
          jadwal.push({
            hari: j.hari,
            urutan: j.urutan,
            jam: `${j.jamMengajar.jamMulai} - ${j.jamMengajar.jamSelesai}`
          });
        });
      }

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
        program: currentProgram, // Single object instead of array
        jadwal: jadwal,
        absensi: {
          data: absensiFormatted,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            totalItems: totalAbsensi,
            totalPages: totalPages
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

      // Clean and normalize namaMurid and namaPanggilan before use
      const cleanedNamaMurid = namaMurid ? namaMurid.trim().replace(/\s+/g, ' ') : namaMurid;
      const cleanedNamaPanggilan = namaPanggilan ? namaPanggilan.trim().replace(/\s+/g, ' ') : namaPanggilan;

      return await PrismaUtils.transaction(async (tx) => {
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
            throw new ConflictError(`Email ${email} sudah digunakan`);
          }

          await tx.user.update({
            where: { id: siswa.userId },
            data: { email: email }
          });
        }

        // Proses program dan jadwal jika programId disediakan
        let programSiswaInstance;
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

              logger.info(`Deactivated ${activeProgramSiswas.length - 1} other active programs for siswa ${siswa.id}`);
            }

            programSiswaInstance = currentProgramSiswa;
            programSiswaInstance.programId = programId; // Update for subsequent use

            logger.info(`Program siswa diupdate: ${currentProgramSiswa.id} -> Program ID: ${programId}`);
          } else {
            // Only create new if no active program exists (edge case)
            programSiswaInstance = await tx.programSiswa.create({
              data: {
                siswaId: siswa.id,
                programId: programId,
                status: programStatus || 'AKTIF',
                isVerified: true,
              }
            });

            logger.info(`Program siswa baru dibuat: ${programSiswaInstance.id} -> Program ID: ${programId}`);
          }

          const programSiswaId = programSiswaInstance.id;

          // Process jadwal
          if (jadwal && jadwal.length > 0) {
            // Get current active schedules (excluding deleted ones)
            const currentJadwals = await tx.jadwalProgramSiswa.findMany({
              where: {
                programSiswaId,
                id: {
                  notIn: jadwal
                    .filter(j => j.isDeleted)
                    .map(j => j.id)
                }
              },
              orderBy: { urutan: 'asc' }
            });

            // Count new schedules to be added (excluding deleted ones)
            const newSchedules = jadwal.filter(j => !j.id && !j.isDeleted);
            const totalSchedules = currentJadwals.length + newSchedules.length;

            if (totalSchedules > 2) {
              throw new BadRequestError('Setiap siswa hanya boleh memiliki maksimal 2 jadwal per program.');
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
                  throw new BadRequestError('Hari dan Jam Mengajar ID wajib diisi untuk mengubah jadwal');
                }

                // Verify the jamMengajar exists
                const jamMengajar = await tx.jamMengajar.findUnique({
                  where: { id: jadwalItem.jamMengajarId }
                });
                if (!jamMengajar) {
                  throw new NotFoundError(`Jam mengajar dengan ID ${jadwalItem.jamMengajarId} tidak ditemukan`);
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
                  throw new BadRequestError('Hari dan Jam Mengajar ID wajib diisi untuk jadwal baru');
                }

                const jamMengajar = await tx.jamMengajar.findUnique({
                  where: { id: jadwalItem.jamMengajarId }
                });
                if (!jamMengajar) {
                  throw new NotFoundError(`Jam mengajar dengan ID ${jadwalItem.jamMengajarId} tidak ditemukan`);
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
          }
        } else if (jadwal && jadwal.length > 0) {
          // If jadwal is provided but no programId, throw error
          throw new BadRequestError('Program ID wajib diisi untuk menambah atau mengubah jadwal');
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
      logger.error(`Error in admin update siswa for ID ${id}:`, error);
      throw error;
    }
  }

  async updateStatusSiswa(programId, siswaId, status) {
    try {
      // Find the active program for this student
      const activeProgramSiswa = await prisma.programSiswa.findFirst({
        where: {
          siswaId,
          status: 'AKTIF'
        }
      });

      if (!activeProgramSiswa) {
        throw new NotFoundError(`Siswa dengan ID ${siswaId} tidak memiliki program aktif`);
      }

      // Validate that the programId matches the active program (optional check)
      if (programId && activeProgramSiswa.programId !== programId) {
        throw new BadRequestError(`Program ID ${programId} tidak sesuai dengan program aktif siswa`);
      }

      const oldStatus = activeProgramSiswa.status;

      const updatedProgramSiswa = await prisma.programSiswa.update({
        where: { id: activeProgramSiswa.id },
        data: { status }
      });

      // Catat riwayat perubahan status
      await prisma.riwayatStatusSiswa.create({
        data: {
          programSiswaId: updatedProgramSiswa.id,
          statusLama: oldStatus,
          statusBaru: status,
          tanggalPerubahan: moment().format(DATE_FORMATS.DEFAULT),
          keterangan: `Status diubah menjadi ${status}`
        }
      });

      return updatedProgramSiswa;
    } catch (error) {
      logger.error(`Error updating status for siswa ID ${siswaId}:`, error);
      throw error;
    }
  }

  async getJadwalSiswa(rfid) {
    try {
      let siswa;

      if (rfid) {
        // Cari siswa berdasarkan RFID
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
          throw new NotFoundError(`Siswa dengan RFID ${rfid} tidak ditemukan`);
        }
      } else {
        throw new BadRequestError('Parameter RFID wajib diisi');
      }

      // Format response
      const schedules = [];

      // Process each active program
      for (const programSiswa of siswa.programSiswa) {
        // Group jadwal by kelas program
        const kelasPrograms = new Map();

        // Add from kelasProgram if exists
        if (programSiswa.kelasProgram) {
          const kp = programSiswa.kelasProgram;
          kelasPrograms.set(kp.id, {
            kelasProgramId: kp.id,
            namaKelas: kp.kelas?.namaKelas || 'Tidak Ada Kelas',
            namaProgram: kp.program.namaProgram,
            jamMengajar: []
          });
        }

        // Add from JadwalProgramSiswa
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

            // Add jam mengajar
            kelasPrograms.get(kelasProgram.id).jamMengajar.push({
              jamMengajarId: jadwal.jamMengajar.id,
              Hari: jadwal.hari,
              jamMulai: jadwal.jamMengajar.jamMulai,
              jamSelesai: jadwal.jamMengajar.jamSelesai
            });
          }
        }

        // Add to schedules
        schedules.push(...Array.from(kelasPrograms.values()));
      }

      const result = {
        namaPanggilan: siswa.namaPanggilan || siswa.namaMurid,
        nis: siswa.nis,
        strataPendidikan: siswa.strataPendidikan,
        kelasSekolah: siswa.kelasSekolah,
        schedules: schedules
      };

      logger.info(`Retrieved jadwal for siswa with RFID: ${rfid}`);
      return result;
    } catch (error) {
      logger.error(`Error getting jadwal siswa with RFID ${rfid}:`, error);
      throw error;
    }
  }
}

module.exports = new SiswaService();