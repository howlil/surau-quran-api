const { prisma } = require('../../lib/config/prisma.config');
const ErrorFactory = require('../../lib/factories/error.factory');
const PrismaUtils = require('../../lib/utils/prisma.utils');
const moment = require('moment');
const PasswordUtils = require('../../lib/utils/password.utils');
const paymentService = require('./payment.service');
const bcrypt = require('bcrypt');
const XenditUtils = require('../../lib/utils/xendit.utils');
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
        metodePembayaran,
        evidence,
      } = pendaftaranData;

      const cleanedNamaMurid = namaMurid.trim().replace(/\s+/g, ' ');
      const cleanedNamaPanggilan = namaPanggilan ? namaPanggilan.trim().replace(/\s+/g, ' ') : null;

      // Check if email exists in user table
      const existingUser = await prisma.user.findUnique({
        where: { email }
      });

      if (existingUser) {
        throw ErrorFactory.badRequest(`Email ${email} sudah terdaftar`);
      }

      const existingPendaftaranTemp = await prisma.pendaftaranTemp.findFirst({
        where: {
          email
        }
      });

      if (existingPendaftaranTemp) {
        const existingPayment = await prisma.pembayaran.findUnique({
          where: { id: existingPendaftaranTemp.pembayaranId }
        });

        // If there's an expired or failed registration, delete it
        if (existingPayment && ['EXPIRED', 'FAILED'].includes(existingPayment.statusPembayaran)) {
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
        } else if (existingPayment && existingPayment.statusPembayaran === 'PENDING') {
          throw ErrorFactory.badRequest(`Email ${email} sedang dalam proses pendaftaran`);
        }
      }

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
          throw ErrorFactory.badRequest(`Email ${email} sudah terdaftar sebagai siswa dengan program aktif. Untuk mengubah program, silakan hubungi admin.`);
        }
        throw ErrorFactory.badRequest(`Email ${email} sudah terdaftar sebagai siswa`);
      }

      const program = await prisma.program.findUnique({
        where: { id: programId }
      });

      if (!program) {
        throw ErrorFactory.notFound(`Program dengan ID ${programId} tidak ditemukan`);
      }

      let actualDiskon = 0;
      let calculatedTotal = Number(jumlahPembayaran);
      let voucherId = null;

      if (kodeVoucher) {
        const voucher = await prisma.voucher.findUnique({
          where: {
            kodeVoucher: kodeVoucher.toUpperCase(),
            isActive: true
          }
        });

        if (!voucher) {
          throw ErrorFactory.notFound(`Voucher ${kodeVoucher} tidak valid atau tidak aktif`);
        }

        // Set voucherId for later use
        voucherId = voucher.id;

        if (voucher.tipe === 'NOMINAL') {
          actualDiskon = Number(voucher.nominal);

          // Validasi diskon nominal tidak boleh lebih besar dari biaya pendaftaran
          if (actualDiskon >= Number(jumlahPembayaran)) {
            throw ErrorFactory.badRequest(`Diskon voucher Rp ${actualDiskon.toLocaleString('id-ID')} tidak boleh lebih besar atau sama dengan biaya pendaftaran Rp ${Number(jumlahPembayaran).toLocaleString('id-ID')}`);
          }
        } else if (voucher.tipe === 'PERSENTASE') {
          // Validasi persentase maksimal 100%
          if (Number(voucher.nominal) > 100) {
            throw ErrorFactory.badRequest(`Persentase diskon tidak boleh lebih dari 100%`);
          }

          actualDiskon = Number(jumlahPembayaran) * (Number(voucher.nominal) / 100);
        }

        calculatedTotal = Number(jumlahPembayaran) - actualDiskon;

        // Validasi total biaya minimal Rp 1.000 (requirement Xendit)
        if (calculatedTotal < 1000) {
          throw ErrorFactory.badRequest(`Total biaya setelah diskon minimal Rp 1.000. Saat ini: Rp ${calculatedTotal.toLocaleString('id-ID')}`);
        }
      }

      if (totalBiaya !== undefined) {
        if (Math.abs(calculatedTotal - Number(totalBiaya)) > 0.01) {
          throw ErrorFactory.badRequest('Total biaya tidak sesuai dengan perhitungan diskon');
        }
      }

      // Handle berdasarkan metode pembayaran
      if (metodePembayaran === 'TUNAI') {
        // Untuk pembayaran tunai, langsung buat akun siswa
        return await this.createSiswaFromTunaiPayment({
          namaMurid: cleanedNamaMurid,
          namaPanggilan: cleanedNamaPanggilan,
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
          kodeVoucher: kodeVoucher?.toUpperCase() || null,
          jumlahPembayaran,
          actualDiskon,
          calculatedTotal,
          voucherId,
          evidence
        });
      } else {
        // Untuk pembayaran gateway (Xendit), buat invoice dan temp data
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


        return {
          pendaftaranId: pendaftaranTemp.id,
          paymentInfo: paymentData
        };
      }
    } catch (error) {
      throw error;
    }
  }

  async createSiswaFromTunaiPayment(data) {
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
        actualDiskon,
        calculatedTotal,
        voucherId,
        evidence
      } = data;


      // Buat pembayaran dengan status PAID untuk tunai
      const pembayaran = await prisma.pembayaran.create({
        data: {
          tipePembayaran: 'PENDAFTARAN',
          metodePembayaran: 'TUNAI',
          jumlahTagihan: calculatedTotal,
          statusPembayaran: 'PAID',
          tanggalPembayaran: new Date().toISOString().split('T')[0],
          evidence: evidence
        }
      });

      const generatedPassword = DataGeneratorUtils.generateStudentPassword(
        namaPanggilan,
        tanggalLahir
      );
      const hashedPassword = await PasswordUtils.hash(generatedPassword);
      const user = await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          role: 'SISWA'
        }
      });

      // Buat data siswa
      const siswa = await prisma.siswa.create({
        data: {
          userId: user.id,
          namaMurid,
          namaPanggilan,
          tanggalLahir,
          jenisKelamin,
          alamat,
          strataPendidikan,
          kelasSekolah,
          namaSekolah,
          namaOrangTua,
          namaPenjemput,
          noWhatsapp
        }
      });

      // Buat pendaftaran
      const pendaftaran = await prisma.pendaftaran.create({
        data: {
          siswaId: siswa.id,
          biayaPendaftaran: jumlahPembayaran,
          tanggalDaftar: new Date().toISOString().split('T')[0],
          diskon: actualDiskon,
          totalBiaya: calculatedTotal,
          voucher_id: voucherId,
          pembayaranId: pembayaran.id
        }
      });

      // Buat program siswa
      const programSiswa = await prisma.programSiswa.create({
        data: {
          siswaId: siswa.id,
          programId,
          status: 'AKTIF'
        }
      });

      // Update finance record dengan format tanggal DD-MM-YYYY
      const tanggalPembayaran = moment().format('DD-MM-YYYY');
      await financeService.createFromEnrollmentPayment({
        id: pembayaran.id,
        jumlahTagihan: calculatedTotal,
        tanggalPembayaran: tanggalPembayaran,
        metodePembayaran: 'TUNAI'
      });

        userId: user.id,
        siswaId: siswa.id,
        pembayaranId: pembayaran.id,
        email
      });

      const tanggalDaftar = moment().format(DATE_FORMATS.DEFAULT);
      const sppRecords = await SppService.generateFiveMonthsAhead(programSiswa.id, tanggalDaftar);

      return {
        success: true,
        message: 'Pendaftaran tunai berhasil, akun siswa telah dibuat',
        data: {
          userId: user.id,
          siswaId: siswa.id,
          pembayaranId: pembayaran.id,
          pendaftaranId: pendaftaran.id,
          programSiswaId: programSiswa.id,
          email,
          namaMurid,
          status: 'AKTIF'
        }
      };
    } catch (error) {
      throw error;
    }
  }

  async createSiswaV2FromTunaiPayment(data) {
    try {
      const {
        siswa,
        programId,
        calculatedFees,
        totalDiskon,
        finalTotal,
        voucherId,
        evidence,
        kartuKeluargaFile,
        isFamily,
        hubunganKeluarga
      } = data;


      const pembayaran = await prisma.pembayaran.create({
        data: {
          tipePembayaran: 'PENDAFTARAN',
          metodePembayaran: 'TUNAI',
          jumlahTagihan: finalTotal,
          statusPembayaran: 'PAID',
          tanggalPembayaran: new Date().toISOString().split('T')[0],
          evidence: evidence
        }
      });

      const createdSiswa = [];
      const createdPendaftaran = [];

      for (let i = 0; i < siswa.length; i++) {
        const student = siswa[i];
        const fee = calculatedFees[i];

        const generatedPassword = DataGeneratorUtils.generateStudentPassword(
          student.namaPanggilan,
          student.tanggalLahir
        );
        const hashedPassword = await PasswordUtils.hash(generatedPassword);
        const user = await prisma.user.create({
          data: {
            email: student.email,
            password: hashedPassword,
            role: 'SISWA'
          }
        });

        // Buat data siswa
        const siswaData = await prisma.siswa.create({
          data: {
            userId: user.id,
            namaMurid: student.namaMurid,
            namaPanggilan: student.namaPanggilan,
            tanggalLahir: student.tanggalLahir,
            jenisKelamin: student.jenisKelamin,
            alamat: student.alamat,
            strataPendidikan: student.strataPendidikan,
            kelasSekolah: student.kelasSekolah,
            namaSekolah: student.namaSekolah,
            namaOrangTua: student.namaOrangTua,
            namaPenjemput: student.namaPenjemput,
            noWhatsapp: student.noWhatsapp,
            isFamily: isFamily || false,
            hubunganKeluarga: hubunganKeluarga || null,
            kartuKeluarga: kartuKeluargaFile || null
          }
        });

        // Buat pendaftaran
        const pendaftaran = await prisma.pendaftaran.create({
          data: {
            siswaId: siswaData.id,
            biayaPendaftaran: fee.biayaPendaftaran,
            tanggalDaftar: new Date().toISOString().split('T')[0],
            diskon: fee.diskon,
            totalBiaya: fee.totalBiaya,
            voucher_id: voucherId,
            pembayaranId: pembayaran.id
          }
        });

        // Buat program siswa
        const programSiswa = await prisma.programSiswa.create({
          data: {
            siswaId: siswaData.id,
            programId,
            status: 'AKTIF'
          }
        });

        createdSiswa.push({
          userId: user.id,
          siswaId: siswaData.id,
          email: student.email,
          namaMurid: student.namaMurid,
          status: 'AKTIF'
        });

        createdPendaftaran.push(pendaftaran.id);
      }

      // Update finance record dengan format tanggal DD-MM-YYYY
      const tanggalPembayaran = moment().format('DD-MM-YYYY');
      await financeService.createFromEnrollmentPayment({
        id: pembayaran.id,
        jumlahTagihan: finalTotal,
        tanggalPembayaran: tanggalPembayaran,
        metodePembayaran: 'TUNAI'
      });

        pembayaranId: pembayaran.id,
        siswaCount: createdSiswa.length
      });

      // Generate SPP untuk 5 bulan ke depan untuk semua siswa
      const tanggalDaftar = moment().format(DATE_FORMATS.DEFAULT);
      const sppPromises = createdSiswa.map(async (siswaData) => {
        // Get programSiswaId untuk siswa ini
        const programSiswa = await prisma.programSiswa.findFirst({
          where: { siswaId: siswaData.siswaId }
        });
        
        if (programSiswa) {
          const sppRecords = await SppService.generateFiveMonthsAhead(programSiswa.id, tanggalDaftar);
          return sppRecords;
        }
        return [];
      });
      
      await Promise.all(sppPromises);

      return {
        success: true,
        message: `Pendaftaran tunai V2 berhasil, ${siswa.length} akun siswa telah dibuat`,
        data: {
          pembayaranId: pembayaran.id,
          siswa: createdSiswa,
          pendaftaranIds: createdPendaftaran,
          totalAmount: finalTotal,
          status: 'AKTIF'
        }
      };
    } catch (error) {
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
              const randomIndex = Math.floor(Math.random() * anggota.length);
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
          tanggalPerubahan: moment().format(DATE_FORMATS.DEFAULT)
        }
      });


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
      throw error;
    }
  }

  async createPendaftaranV2(data, kartuKeluargaFile) {
    try {
      const { siswa, programId, biayaPendaftaran, isFamily, hubunganKeluarga, kodeVoucher, totalBiaya, metodePembayaran, evidence } = data;

      // Validate required fields
      if (!programId) {
        throw ErrorFactory.badRequest('Program ID wajib diisi');
      }

      if (!siswa || !Array.isArray(siswa) || siswa.length === 0) {
        throw ErrorFactory.badRequest('Data siswa wajib diisi');
      }

      // Validate each student's email to prevent duplicate registrations
      for (const student of siswa) {
        const email = student.email;

        // Check if email exists in user table
        const existingUser = await prisma.user.findUnique({
          where: { email }
        });

        if (existingUser) {
          throw ErrorFactory.badRequest(`Email ${email} sudah terdaftar sebagai user`);
        }

        // Check if email exists in siswa table through pendaftaranTemp
        const existingPendaftaranTemp = await prisma.pendaftaranTemp.findFirst({
          where: { email }
        });

        if (existingPendaftaranTemp) {
          // Get the associated payment
          const existingPayment = await prisma.pembayaran.findUnique({
            where: { id: existingPendaftaranTemp.pembayaranId }
          });

          // If there's an expired or failed registration, delete it
          if (existingPayment && ['EXPIRED', 'FAILED'].includes(existingPayment.statusPembayaran)) {
            await prisma.$transaction(async (tx) => {
              // Delete the payment record first
              await tx.pembayaran.delete({
                where: { id: existingPendaftaranTemp.pembayaranId }
              });
              // Then delete the temporary registration
              await tx.pendaftaranTemp.delete({
                where: { id: existingPendaftaranTemp.id }
              });
            }, { timeout: 15000, maxWait: 5000 });
          } else if (existingPayment && existingPayment.statusPembayaran === 'PENDING') {
            throw ErrorFactory.badRequest(`Email ${email} sedang dalam proses pendaftaran`);
          }
        }

        // Check if email exists in siswa table
        const existingSiswa = await prisma.siswa.findFirst({
          where: {
            user: { email }
          },
          include: {
            programSiswa: {
              where: { status: 'AKTIF' }
            }
          }
        });

        if (existingSiswa) {
          if (existingSiswa.programSiswa.length > 0) {
            throw ErrorFactory.badRequest(`Email ${email} sudah terdaftar sebagai siswa dengan program aktif. Untuk mengubah program, silakan hubungi admin.`);
          }
          throw ErrorFactory.badRequest(`Email ${email} sudah terdaftar sebagai siswa`);
        }

        // Check if email exists in siswaPrivateTemp table
        const existingSiswaPrivateTemp = await prisma.siswaPrivateTemp.findFirst({
          where: { email }
        });

        if (existingSiswaPrivateTemp) {
          throw ErrorFactory.badRequest(`Email ${email} sedang dalam proses pendaftaran private`);
        }
      }

      // Validate program exists and get program details
      const program = await prisma.program.findUnique({
        where: { id: programId },
        select: {
          id: true,
          namaProgram: true,
          biayaSpp: true
        }
      });

      if (!program) {
        throw ErrorFactory.notFound('Program tidak ditemukan');
      }

      // Determine program type based on name
      const programType = this.getProgramType(program.namaProgram);
      const subType = this.getPrivateSubType(program.namaProgram);

      // Validate student count based on program type
      this.validateStudentCount(siswa.length, programType, subType);

      // Validate kartu keluarga for family programs
      if (isFamily && subType === 'BERSAUDARA' && !kartuKeluargaFile) {
        throw ErrorFactory.badRequest('Kartu keluarga wajib diupload untuk program Private Bersaudara (isFamily: true)');
      }

      // Validate hubungan keluarga for non-family programs
      if (!isFamily && subType === 'BERSAUDARA' && !hubunganKeluarga) {
        throw ErrorFactory.badRequest('Hubungan keluarga wajib diisi untuk program Private Bersaudara (isFamily: false)');
      }

      // Calculate registration fees for each student
      const calculatedFees = this.calculateRegistrationFees(siswa, programType, subType, biayaPendaftaran);

      // Validate total biaya matches calculated total
      const calculatedTotal = calculatedFees.reduce((sum, fee) => sum + fee.totalBiaya, 0);

      if (Math.abs(calculatedTotal - totalBiaya) > 1) {
        throw ErrorFactory.badRequest(`Total biaya tidak sesuai. Expected: ${calculatedTotal}, Got: ${totalBiaya}. Program: ${program.namaProgram}, Type: ${programType}, SubType: ${subType}`);
      }

      let voucher = null;
      let totalDiskon = 0;
      let voucherId = null;
      
      if (kodeVoucher) {
        // Log voucher query untuk debugging
          kodeVoucher: kodeVoucher.toUpperCase(),
          isActive: true
        });

        // Clear cache dan ambil voucher dengan query yang lebih spesifik
        voucher = await prisma.voucher.findFirst({
          where: {
            kodeVoucher: kodeVoucher.toUpperCase(),
            isActive: true
          },
          orderBy: {
            createdAt: 'desc'
          }
        });

        if (!voucher) {
          throw ErrorFactory.notFound('Voucher tidak valid atau tidak aktif');
        }

        // Cek apakah ada multiple voucher dengan kode yang sama
        const allVouchersWithSameCode = await prisma.voucher.findMany({
          where: {
            kodeVoucher: kodeVoucher.toUpperCase()
          },
          orderBy: {
            createdAt: 'desc'
          }
        });

        if (allVouchersWithSameCode.length > 1) {
            kodeVoucher: kodeVoucher.toUpperCase(),
            vouchers: allVouchersWithSameCode.map(v => ({
              id: v.id,
              tipe: v.tipe,
              nominal: v.nominal,
              isActive: v.isActive,
              createdAt: v.createdAt
            }))
          });
        }

        // Set voucherId for later use
        voucherId = voucher.id;

        // Calculate voucher discount on total
          voucherTipe: voucher.tipe,
          voucherNominal: voucher.nominal,
          voucherNominalNumber: Number(voucher.nominal),
          calculatedTotal
        });

        if (voucher.tipe === 'PERSENTASE') {
          totalDiskon = calculatedTotal * (Number(voucher.nominal) / 100);
            percentage: Number(voucher.nominal) / 100,
            totalDiskon
          });
        } else {
          totalDiskon = Math.min(Number(voucher.nominal), calculatedTotal * 0.5);
            voucherNominal: Number(voucher.nominal),
            maxDiscount: calculatedTotal * 0.5,
            totalDiskon
          });
        }
      }

      const finalTotal = calculatedTotal - totalDiskon;

      // Log perhitungan untuk debugging
        calculatedTotal,
        voucherType: voucher?.tipe,
        voucherNominal: voucher?.nominal,
        totalDiskon,
        finalTotal,
        discountPercentage: voucher ? (totalDiskon / calculatedTotal * 100).toFixed(2) + '%' : '0%',
        expectedFinalTotal: calculatedTotal - totalDiskon
      });

      // Handle berdasarkan metode pembayaran
      if (metodePembayaran === 'TUNAI') {
        // Untuk pembayaran tunai, langsung buat akun siswa untuk semua siswa
        return await this.createSiswaV2FromTunaiPayment({
          siswa,
          programId,
          calculatedFees,
          totalDiskon,
          finalTotal,
          voucherId,
          evidence,
          kartuKeluargaFile,
          isFamily,
          hubunganKeluarga
        });
      } else {
        // Untuk pembayaran gateway (Xendit), buat invoice dan temp data
        // Create Xendit invoice via payment service
        let xenditPaymentData;
        try {
          // Log Xendit request untuk debugging
            amount: finalTotal,
            description: `Pendaftaran ${program.namaProgram} - ${siswa.length} siswa`,
            itemsCount: siswa.length,
            expectedTotal: finalTotal
          });

          xenditPaymentData = await paymentService.createPendaftaranInvoiceV2({
            externalId: XenditUtils.generateExternalId('DAFTAR_V2'),
            amount: finalTotal,
            description: `Pendaftaran ${program.namaProgram} - ${siswa.length} siswa`,
            payerEmail: siswa[0].email,
            customer: {
              givenNames: siswa[0].namaMurid,
              email: siswa[0].email
            },
            items: siswa.map((s, index) => {
              const originalPrice = calculatedFees[index].totalBiaya;
              const discountRatio = totalDiskon / calculatedTotal;
              const discountedPrice = Math.round(originalPrice * (1 - discountRatio));

              // Log untuk debugging
                studentName: s.namaMurid,
                originalPrice,
                discountRatio: (discountRatio * 100).toFixed(2) + '%',
                discountedPrice,
                totalDiskon,
                calculatedTotal,
                expectedItemTotal: Math.round(originalPrice * (1 - discountRatio))
              });

              return {
                name: `Pendaftaran - ${s.namaMurid}`,
                quantity: 1,
                price: discountedPrice
              };
            })
          });
        } catch (xenditError) {
          // Jika Xendit gagal, hapus data yang sudah dibuat
          if (xenditPaymentData?.pembayaranId) {
            try {
              await prisma.$transaction(async (tx) => {
                // Hapus XenditPayment terlebih dahulu
                await tx.xenditPayment.deleteMany({
                  where: { pembayaranId: xenditPaymentData.pembayaranId }
                });

                // Terakhir hapus pembayaran
                await tx.pembayaran.delete({
                  where: { id: xenditPaymentData.pembayaranId }
                });
              }, { timeout: 15000, maxWait: 5000 });
            } catch (rollbackError) {
            }
          }
          throw xenditError;
        }

        // Create temporary registration data
        let pendaftaranPrivateTemp;
        try {
          pendaftaranPrivateTemp = await prisma.$transaction(async (tx) => {
            // Create individual student records first
            const siswaPrivatePromises = siswa.map((s) => {
              return tx.siswaPrivateTemp.create({
                data: {
                  namaMurid: s.namaMurid,
                  namaPanggilan: s.namaPanggilan,
                  tanggalLahir: s.tanggalLahir,
                  jenisKelamin: s.jenisKelamin,
                  alamat: s.alamat,
                  strataPendidikan: s.strataPendidikan,
                  kelasSekolah: s.kelasSekolah,
                  email: s.email,
                  namaSekolah: s.namaSekolah,
                  namaOrangTua: s.namaOrangTua,
                  namaPenjemput: s.namaPenjemput,
                  noWhatsapp: s.noWhatsapp,
                  biayaPendaftaran: biayaPendaftaran
                }
              });
            });

            const siswaPrivateRecords = await Promise.all(siswaPrivatePromises);

            // Create multiple private registration records - one for each student
            const privateRegPromises = siswaPrivateRecords.map((siswaPrivate) => {
              return tx.pendaftaranPrivateTemp.create({
                data: {
                  siswaPrivateId: siswaPrivate.id,
                  isFamily,
                  hubunganKeluarga,
                  jenisHubungan: data.jenisHubungan,
                  kartuKeluarga: kartuKeluargaFile,
                  kodeVoucher: kodeVoucher?.toUpperCase() || null,
                  diskon: totalDiskon,
                  totalBiaya: finalTotal,
                  programId
                }
              });
            });

            const privateRegs = await Promise.all(privateRegPromises);
            const privateReg = privateRegs[0]; // Use first one as main record

            return privateReg;
          }, { timeout: 30000, maxWait: 10000 });
        } catch (dbError) {
          // Jika database gagal, hapus payment yang sudah dibuat
          try {
            await prisma.$transaction(async (tx) => {
              // Hapus XenditPayment terlebih dahulu karena ada foreign key ke pembayaran
              await tx.xenditPayment.deleteMany({
                where: { pembayaranId: xenditPaymentData.pembayaranId }
              });

              // Kemudian hapus pembayaran
              await tx.pembayaran.delete({
                where: { id: xenditPaymentData.pembayaranId }
              });
            }, { timeout: 15000, maxWait: 5000 });
          } catch (rollbackError) {
          }
          throw dbError;
        }


        // Log payment data untuk debugging
          pembayaranId: xenditPaymentData.pembayaranId,
          xenditInvoiceUrl: xenditPaymentData.xenditInvoiceUrl,
          expireDate: xenditPaymentData.expireDate,
          amount: xenditPaymentData.amount,
          xenditInvoiceId: xenditPaymentData.xenditInvoiceId,
          fullPaymentData: JSON.stringify(xenditPaymentData, null, 2)
        });

        return {
          pendaftaranId: pendaftaranPrivateTemp.id,
          pembayaranId: xenditPaymentData.pembayaranId,
          invoiceUrl: xenditPaymentData.xenditInvoiceUrl,
          totalBiaya: finalTotal,
          siswaCount: siswa.length,
        };
      }
    } catch (error) {
      throw error;
    }
  }

  getProgramType(programName) {
    const groupPrograms = ['PRA BTA', 'BTA LVL 1', 'BTA LVL 2 & PRA Tahsin', 'TAHSIN', 'TAHFIDZ'];
    return groupPrograms.includes(programName) ? 'GROUP' : 'PRIVATE';
  }

  getPrivateSubType(programName) {
    if (programName.toLowerCase().includes('mandiri')) return 'MANDIRI';
    if (programName.toLowerCase().includes('sharing')) return 'SHARING';
    if (programName.toLowerCase().includes('bersaudara')) return 'BERSAUDARA';
    return null;
  }

  validateStudentCount(count, programType, subType) {
    if (programType === 'GROUP' && count !== 1) {
      throw ErrorFactory.badRequest('Program GROUP hanya untuk 1 siswa');
    }

    if (programType === 'PRIVATE') {
      switch (subType) {
        case 'MANDIRI':
          if (count !== 1) throw ErrorFactory.badRequest('Private Mandiri hanya untuk 1 siswa');
          break;
        case 'SHARING':
          if (count < 1 || count > 3) throw ErrorFactory.badRequest('Private Sharing untuk 1-3 siswa');
          break;
        case 'BERSAUDARA':
          if (count < 2 || count > 4) throw ErrorFactory.badRequest('Private Bersaudara untuk 2-4 siswa');
          break;
      }
    }
  }

  calculateRegistrationFees(siswa, programType, subType, biayaPendaftaran) {
    const basePrice = biayaPendaftaran || (programType === 'GROUP' ? 250000 : 640000);

    if (programType === 'GROUP') {
      return siswa.map(() => ({
        biayaPendaftaran: biayaPendaftaran,
        diskon: 0,
        totalBiaya: biayaPendaftaran
      }));
    }

    // Private program calculations
    switch (subType) {
      case 'MANDIRI':
        return [{
          biayaPendaftaran: biayaPendaftaran,
          diskon: 0,
          totalBiaya: biayaPendaftaran
        }];

      case 'SHARING':
        // 20% discount from previous student's price
        let previousPrice = biayaPendaftaran;
        return siswa.map((_, index) => {
          if (index === 0) {
            return {
              biayaPendaftaran: biayaPendaftaran,
              diskon: 0,
              totalBiaya: biayaPendaftaran
            };
          } else {
            const currentPrice = Math.round(previousPrice * 0.8); // 80% dari harga sebelumnya
            const diskon = previousPrice - currentPrice;
            previousPrice = currentPrice; // Update untuk siswa berikutnya
            return {
              biayaPendaftaran: biayaPendaftaran,
              diskon,
              totalBiaya: currentPrice
            };
          }
        });

      case 'BERSAUDARA':
        // Logic baru untuk Private Bersaudara:
        // - 2 siswa: siswa 1 = 100%, siswa 2 = 50%
        // - 3 siswa: siswa 1 = 100%, siswa 2 = 50%, siswa 3 = gratis
        // - 4 siswa: siswa 1 = 100%, siswa 2 = 50%, siswa 3 = 50% dari siswa 2, siswa 4 = gratis
        return siswa.map((_, index) => {
          if (index === 0) {
            // Siswa pertama: 100%
            return {
              biayaPendaftaran: biayaPendaftaran,
              diskon: 0,
              totalBiaya: biayaPendaftaran
            };
          } else if (index === 1) {
            // Siswa kedua: 50% dari harga pertama
            const currentPrice = Math.round(biayaPendaftaran * 0.5);
            const diskon = biayaPendaftaran - currentPrice;
            return {
              biayaPendaftaran: biayaPendaftaran,
              diskon,
              totalBiaya: currentPrice
            };
          } else if (index === 2 && siswa.length === 3) {
            // Siswa ketiga (jika total 3 siswa): gratis
            return {
              biayaPendaftaran: biayaPendaftaran,
              diskon: biayaPendaftaran,
              totalBiaya: 0
            };
          } else if (index === 2 && siswa.length === 4) {
            // Siswa ketiga (jika total 4 siswa): 50% dari siswa kedua
            const siswaKeduaPrice = Math.round(biayaPendaftaran * 0.5);
            const currentPrice = Math.round(siswaKeduaPrice * 0.5);
            const diskon = biayaPendaftaran - currentPrice;
            return {
              biayaPendaftaran: biayaPendaftaran,
              diskon,
              totalBiaya: currentPrice
            };
          } else if (index === 3) {
            // Siswa keempat: gratis
            return {
              biayaPendaftaran: biayaPendaftaran,
              diskon: biayaPendaftaran,
              totalBiaya: 0
            };
          } else {
            // Fallback untuk kasus lain
            return {
              biayaPendaftaran: biayaPendaftaran,
              diskon: 0,
              totalBiaya: biayaPendaftaran
            };
          }
        });

      default:
        return siswa.map(() => ({
          biayaPendaftaran: biayaPendaftaran,
          diskon: 0,
          totalBiaya: biayaPendaftaran
        }));
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
            tanggalPerubahan: moment().format(DATE_FORMATS.DEFAULT)
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
            tanggalPerubahan: moment().format(DATE_FORMATS.DEFAULT)
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
        const tanggalPindah = moment().format(DATE_FORMATS.DEFAULT);
        const sppBaru = await SppService.generateFiveMonthsAhead(
          programSiswaBaru.id,
          tanggalPindah,
          tx
        );


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
        } catch (emailError) {
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
      throw error;
    }
  }
}

module.exports = new SiswaService();