const { prisma } = require('../../lib/config/prisma.config');
const { logger } = require('../../lib/config/logger.config');
const { NotFoundError, ConflictError, BadRequestError } = require('../../lib/http/errors.http');
const PrismaUtils = require('../../lib/utils/prisma.utils');
const moment = require('moment');
const PasswordUtils = require('../../lib/utils/password.utils');
const paymentService = require('./payment.service');
const financeService = require('./finance.service');
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

      if (existingPendaftaran) {
        logger.info(`Payment ID ${pembayaranId} has already been processed. Student: ${existingPendaftaran.siswa.namaMurid} (${existingPendaftaran.siswa.user.email})`);
        return existingPendaftaran.siswa;
      }

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

      // Auto-sync to Finance when enrollment payment is successful
      try {
        await financeService.createFromEnrollmentPayment({
          id: pembayaranId,
          jumlahTagihan: pendaftaranTemp.totalBiaya,
          tanggalPembayaran: moment().format(DATE_FORMATS.DEFAULT)
        });
        logger.info(`Auto-created finance record for enrollment payment ID: ${pembayaranId}, Amount: ${pendaftaranTemp.totalBiaya}`);
      } catch (financeError) {
        // Log error but don't fail the main enrollment processing
        logger.error('Failed to auto-sync enrollment payment to finance:', {
          pembayaranId,
          amount: pendaftaranTemp.totalBiaya,
          error: financeError.message
        });
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
    const { status, tanggal, nama, page = 1, limit = 10 } = filters;

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
        program: null, // Add program field
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
                  include: {
                    program: {
                      select: {
                        id: true,
                        namaProgram: true
                      }
                    },
                    kelasProgram: {
                      include: {
                        jamMengajar: {
                          select: {
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
        
        // Add program information
        if (programAktif) {
          data.program = {
            programId: programAktif.programId,
            namaProgram: programAktif.program.namaProgram,
            jadwal: []
          };

          // Add jadwal from kelasProgram if exists
          if (programAktif.kelasProgram) {
            data.program.jadwal.push({
              hari: programAktif.kelasProgram.hari,
              jamMulai: programAktif.kelasProgram.jamMengajar?.jamMulai,
              jamSelesai: programAktif.kelasProgram.jamMengajar?.jamSelesai,
              namaKelas: programAktif.kelasProgram.kelas?.namaKelas || 'Belum ditentukan'
            });
          }

          // Add jadwal from JadwalProgramSiswa
          if (programAktif.JadwalProgramSiswa && programAktif.JadwalProgramSiswa.length > 0) {
            programAktif.JadwalProgramSiswa.forEach(jadwal => {
              data.program.jadwal.push({
                hari: jadwal.hari,
                jamMulai: jadwal.jamMengajar?.jamMulai,
                jamSelesai: jadwal.jamMengajar?.jamSelesai,
                urutan: jadwal.urutan
              });
            });
          }
        }
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
        
        // Try to get program information from pendaftaranTemp
        if (pendaftaranTemp?.programId) {
          const program = await prisma.program.findUnique({
            where: { id: pendaftaranTemp.programId },
            select: {
              id: true,
              namaProgram: true
            }
          });
          
          if (program) {
            data.program = {
              programId: program.id,
              namaProgram: program.namaProgram,
              jadwal: [] // No jadwal available for temp data
            };
          }
        }
      }

      result.push(data);
    }

    // Apply nama filter if provided
    let finalResult = result;
    if (nama) {
      finalResult = result.filter(item => {
        const studentName = item.student?.nama || '';
        return studentName.toLowerCase().includes(nama.toLowerCase());
      });
    }

    return {
      result: finalResult,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: finalResult.length
      }
    };
  }

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
      // Logic: Prioritaskan AKTIF -> CUTI -> TIDAK_AKTIF (yang terbaru diupdate)
      const transformedData = result.data.map(siswa => {
        let selectedProgram = null;
        
        if (siswa.programSiswa.length > 0) {
          // 1. Prioritas pertama: program yang AKTIF
          const activeProgram = siswa.programSiswa.find(ps => ps.status === 'AKTIF');
          
          if (activeProgram) {
            selectedProgram = activeProgram;
            logger.info(`Siswa ${siswa.namaMurid} (${siswa.nis}) menggunakan program AKTIF: ${activeProgram.program?.namaProgram}`);
          } else {
            // 2. Prioritas kedua: program yang CUTI (yang terbaru diupdate)
            const cutiProgram = siswa.programSiswa
              .filter(ps => ps.status === 'CUTI')
              .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))[0];
            
            if (cutiProgram) {
              selectedProgram = cutiProgram;
              logger.info(`Siswa ${siswa.namaMurid} (${siswa.nis}) menggunakan program CUTI: ${cutiProgram.program?.namaProgram}`);
            } else {
              // 3. Prioritas ketiga: program TIDAK_AKTIF yang terbaru diupdate
              selectedProgram = siswa.programSiswa
                .filter(ps => ps.status === 'TIDAK_AKTIF')
                .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))[0];
              
              if (selectedProgram) {
                logger.info(`Siswa ${siswa.namaMurid} (${siswa.nis}) menggunakan program TIDAK_AKTIF terbaru: ${selectedProgram.program?.namaProgram}`);
              }
            }
          }
          
          // Debug log untuk semua program siswa (untuk tracking)
          if (siswa.programSiswa.length > 1) {
            logger.info(`Siswa ${siswa.namaMurid} (${siswa.nis}) memiliki ${siswa.programSiswa.length} program:`);
            siswa.programSiswa.forEach((program, index) => {
              logger.info(`  Program ${index + 1}: ${program.program?.namaProgram} - Status: ${program.status} - Updated: ${program.updatedAt}`);
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
          logger.info(`Siswa ${siswa.namaMurid} (${siswa.nis}) memiliki status program: ${selectedProgram.status} pada program: ${selectedProgram.program?.namaProgram}`);
        }

        return transformedSiswa;
      });

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
        throw new NotFoundError('Profil siswa tidak ditemukan');
      }

      // Pilih program yang akan ditampilkan (prioritaskan AKTIF -> CUTI -> TIDAK_AKTIF)
      let selectedProgramSiswa = null;
      if (siswa.programSiswa.length > 0) {
        // 1. Prioritas pertama: program yang AKTIF
        const activeProgram = siswa.programSiswa.find(ps => ps.status === 'AKTIF');
        
        if (activeProgram) {
          selectedProgramSiswa = activeProgram;
          logger.info(`Profile siswa ${siswa.namaMurid} (${siswa.nis}) menggunakan program AKTIF: ${activeProgram.program?.namaProgram}`);
        } else {
          // 2. Prioritas kedua: program yang CUTI (yang terbaru diupdate)
          const cutiProgram = siswa.programSiswa
            .filter(ps => ps.status === 'CUTI')
            .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))[0];
          
          if (cutiProgram) {
            selectedProgramSiswa = cutiProgram;
            logger.info(`Profile siswa ${siswa.namaMurid} (${siswa.nis}) menggunakan program CUTI: ${cutiProgram.program?.namaProgram}`);
          } else {
            // 3. Prioritas ketiga: program TIDAK_AKTIF yang terbaru diupdate
            selectedProgramSiswa = siswa.programSiswa
              .filter(ps => ps.status === 'TIDAK_AKTIF')
              .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))[0];
            
            if (selectedProgramSiswa) {
              logger.info(`Profile siswa ${siswa.namaMurid} (${siswa.nis}) menggunakan program TIDAK_AKTIF terbaru: ${selectedProgramSiswa.program?.namaProgram}`);
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
          pagination: {
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
      logger.error('Error getting profile siswa:', error);
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
        rfid,
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
              throw new ConflictError(`RFID ${rfid} sudah terdaftar untuk user lain`);
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
              }
            });

            logger.info(`Program siswa baru dibuat: ${programSiswaInstance.id} -> Program ID: ${programId}`);
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

          logger.info(`Current jadwal count: ${currentJadwals.length}, New jadwal count: ${jadwal.length}`);

          // Count schedules properly:
          // - Existing schedules that will be updated (with id)
          // - New schedules to be added (without id and not deleted)
          // - Schedules to be deleted (with isDeleted flag)
          const schedulesToUpdate = jadwal.filter(j => j.id && !j.isDeleted);
          const schedulesToAdd = jadwal.filter(j => !j.id && !j.isDeleted);
          const schedulesToDelete = jadwal.filter(j => j.isDeleted && j.id);
          
          // Calculate final count: current - deleted + added
          const finalScheduleCount = currentJadwals.length - schedulesToDelete.length + schedulesToAdd.length;

          logger.info(`Schedules to update: ${schedulesToUpdate.length}, to add: ${schedulesToAdd.length}, to delete: ${schedulesToDelete.length}, final count: ${finalScheduleCount}`);

          if (finalScheduleCount > 2) {
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
                logger.info(`Deleted jadwal: ${jadwalItem.id}`);
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
              logger.info(`Updated jadwal: ${jadwalItem.id} -> ${jadwalItem.hari} ${jamMengajar.jamMulai}-${jamMengajar.jamSelesai}`);
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
              logger.info(`Created new jadwal: ${jadwalItem.hari} ${jamMengajar.jamMulai}-${jamMengajar.jamSelesai}`);
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
      logger.error(`Error in admin update siswa for ID ${id}:`, error);
      throw error;
    }
  }

  async updateStatusSiswa(programId, siswaId, status) {
    try {
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

      if (!programSiswa) {
        throw new NotFoundError(`Program siswa tidak ditemukan untuk siswa ID ${siswaId}${programId ? ` dan program ID ${programId}` : ''}`);
      }

      const oldStatus = programSiswa.status;

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
          tanggalPerubahan: moment().format(DATE_FORMATS.DEFAULT)
        }
      });

      logger.info(`Successfully updated status for siswa ${updatedProgramSiswa.siswa.namaMurid} (${updatedProgramSiswa.siswa.nis}) from ${oldStatus} to ${status} in program ${updatedProgramSiswa.program.namaProgram}`);

      return {
        programId: updatedProgramSiswa.programId,
        status: updatedProgramSiswa.status,
        siswa: {
          id: updatedProgramSiswa.siswa.id,
          namaMurid: updatedProgramSiswa.siswa.namaMurid,
          nis: updatedProgramSiswa.siswa.nis
        },
        program: {
          id: updatedProgramSiswa.program.id,
          namaProgram: updatedProgramSiswa.program.namaProgram
        },
        statusLama: oldStatus,
        statusBaru: status
      };
    } catch (error) {
      logger.error(`Error updating status for siswa ID ${siswaId}:`, error);
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
          charge: 0
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
            select: {
              statusPembayaran: true
            }
          }
        }
      });

      if (!sppThisMonth) {
        // If no SPP record for this month, return default values
        return {
          spp: false,
          charge: 0
        };
      }

      // Check if payment is completed
      const isPaid = sppThisMonth.pembayaran && 
                    ['PAID', 'SETTLED'].includes(sppThisMonth.pembayaran.statusPembayaran);

      return {
        spp: !isPaid, // true if not paid, false if paid
        charge: isPaid ? 0 : 250000 // 250.000 if not paid, 0 if paid
      };
    } catch (error) {
      logger.error(`Error getting SPP this month status for siswa ${siswaId}:`, error);
      // Return default values on error
      return {
        spp: false,
        charge: 0
      };
    }
  }

  async getJadwalSiswa(rfid) {
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
          throw new NotFoundError(`Siswa dengan RFID ${rfid} tidak ditemukan`);
        }
      } else {
        throw new BadRequestError('Parameter RFID wajib diisi');
      }

      // Get SPP status for this month
      const sppThisMonth = await this.getSppThisMonthStatus(siswa.id);

      // Format response
      const schedules = [];

      // Process each active program
      for (const programSiswa of siswa.programSiswa) {
        logger.info(`Processing program ${programSiswa.program.namaProgram} for siswa ${siswa.namaMurid}`);
        
        // Group jadwal by kelas program
        const kelasPrograms = new Map();

        // Add from kelasProgram if exists (this is the main schedule)
        if (programSiswa.kelasProgram) {
          const kp = programSiswa.kelasProgram;
          logger.info(`Found kelas program: ${kp.kelas?.namaKelas} for program: ${kp.program.namaProgram}`);
          
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
            logger.info(`Added jam mengajar from kelas program: ${kp.jamMengajar.jamMulai} - ${kp.jamMengajar.jamSelesai}`);
          }

          kelasPrograms.set(kp.id, scheduleEntry);
        }

        // Add from JadwalProgramSiswa (additional schedules) - avoid duplicates
        logger.info(`Found ${programSiswa.JadwalProgramSiswa.length} jadwal program siswa`);
        
        for (const jadwal of programSiswa.JadwalProgramSiswa) {
          logger.info(`Processing jadwal: ${jadwal.hari} at ${jadwal.jamMengajar.jamMulai} - ${jadwal.jamMengajar.jamSelesai}`);
          
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
            logger.info(`Found matching kelas program: ${kelasProgram.kelas?.namaKelas}`);
            
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
              logger.info(`Added unique jadwal: ${jadwal.hari} at ${jadwal.jamMengajar.jamMulai} - ${jadwal.jamMengajar.jamSelesai}`);
            } else {
              logger.info(`Skipped duplicate jadwal: ${jadwal.hari} at ${jadwal.jamMengajar.jamMulai} - ${jadwal.jamMengajar.jamSelesai}`);
            }
          } else {
            logger.warn(`No matching kelas program found for jadwal: ${jadwal.hari} at ${jadwal.jamMengajar.jamMulai} - ${jadwal.jamMengajar.jamSelesai}`);
          }
        }

        // If no schedules found from either source, create a basic entry
        if (kelasPrograms.size === 0) {
          logger.warn(`No schedules found for program ${programSiswa.program.namaProgram}, creating basic entry`);
          
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

      logger.info(`Retrieved jadwal for siswa with RFID: ${rfid}, found ${schedules.length} schedules`);
      return result;
    } catch (error) {
      logger.error(`Error getting jadwal siswa with RFID ${rfid}:`, error);
      throw error;
    }
  }

  async pindahProgram(siswaId, data) {
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
        throw new NotFoundError(`Siswa dengan ID ${siswaId} tidak ditemukan`);
      }

      // 2. Validasi program aktif
      if (siswa.programSiswa.length === 0) {
        throw new BadRequestError('Siswa tidak memiliki program aktif');
      }

      const programLama = siswa.programSiswa[0];

      // 3. Validasi program baru
      const programBaru = await prisma.program.findUnique({
        where: { id: programBaruId }
      });

      if (!programBaru) {
        throw new NotFoundError(`Program dengan ID ${programBaruId} tidak ditemukan`);
      }

      // 4. Validasi tidak pindah ke program yang sama
      if (programLama.programId === programBaruId) {
        throw new BadRequestError('Tidak dapat pindah ke program yang sama');
      }

      // 5. Proses pindah program dalam transaction
      return await PrismaUtils.transaction(async (tx) => {
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
            tanggalPerubahan: moment().format(DATE_FORMATS.DEFAULT),
            keterangan: `Pindah ke program ${programBaru.namaProgram}`
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

          logger.info(`Deleted ${sppBelumDibayar.length} unpaid SPP records from old program`);
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
            tanggalPerubahan: moment().format(DATE_FORMATS.DEFAULT),
            keterangan: `Pindah dari program ${programLama.program.namaProgram}`
          }
        });

        // f. Buat jadwal untuk program baru jika ada
        if (jadwal && jadwal.length > 0) {
          if (jadwal.length > 2) {
            throw new BadRequestError('Maksimal 2 jadwal per program');
          }

          for (let i = 0; i < jadwal.length; i++) {
            const jadwalItem = jadwal[i];

            // Validasi jam mengajar exists
            const jamMengajar = await tx.jamMengajar.findUnique({
              where: { id: jadwalItem.jamMengajarId }
            });

            if (!jamMengajar) {
              throw new NotFoundError(`Jam mengajar dengan ID ${jadwalItem.jamMengajarId} tidak ditemukan`);
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
        const tanggalPindah = moment().format(DATE_FORMATS.DEFAULT);
        const sppBaru = await SppService.generateFiveMonthsAhead(
          programSiswaBaru.id,
          tanggalPindah,
          tx
        );

        logger.info(`Generated ${sppBaru.length} SPP records for new program`);

        // h. Send email notification
        try {
          await EmailUtils.sendEmail({
            to: siswa.user.email,
            subject: 'Pemberitahuan Pindah Program',
            template: 'program-change',
            context: {
              namaSiswa: siswa.namaMurid,
              programLama: programLama.program.namaProgram,
              programBaru: programBaru.namaProgram,
              tanggalPindah: tanggalPindah
            }
          });
          logger.info(`Program change notification sent to ${siswa.user.email}`);
        } catch (emailError) {
          logger.error('Failed to send program change notification:', emailError);
          // Don't throw, let the process continue
        }

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
      logger.error(`Error in pindahProgram for siswa ${siswaId}:`, error);
      throw error;
    }
  }
}

module.exports = new SiswaService();