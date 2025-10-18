const prisma = require('../../lib/config/prisma.config');
const ErrorFactory = require('../../lib/factories/error.factory');
const moment = require('moment');
const PasswordUtils = require('../../lib/utils/password.utils');
const paymentService = require('./payment.service');
const financeService = require('./finance.service');
// const DataGeneratorUtils = require('../../lib/utils/data-generator.utils');
const SppService = require('./spp.service');
const CommonServiceUtils = require('../../lib/utils/common.service.utils');
const logger = require('../../lib/config/logger.config');

class PendaftaranService {

  generateStudentPassword(namaPanggilan = '', tanggalLahir = '') {
    const nama = namaPanggilan ? namaPanggilan.toLowerCase().replace(/\s/g, '') : 'siswa';
    const tanggal = tanggalLahir ? tanggalLahir.split('-')[0] : '01';
    return `${nama}${tanggal}`;
  }

  async findOrCreateChanel(chanelData) {
    try {
      // Normalize channel name (trim, lowercase, capitalize first letter)
      const normalizeChannelName = (name) => {
        if (!name) return 'Website';
        return name.trim().toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
      };

      const normalizedName = normalizeChannelName(chanelData?.chanelName);

      // Find existing channel with normalized name
      const existingChanel = await prisma.chanel.findFirst({
        where: {
          chanelName: {
            equals: normalizedName
          }
        }
      });

      if (existingChanel) {
        // Increment count and update
        return await prisma.chanel.update({
          where: { id: existingChanel.id },
          data: {
            count: {
              increment: 1
            }
          }
        });
      } else {
        // Create new channel
        return await prisma.chanel.create({
          data: {
            chanelName: normalizedName,
            isOther: chanelData?.isOther || false,
            count: 1
          }
        });
      }
    } catch (error) {
      logger.error('Error in findOrCreateChanel:', error);
      throw error;
    }
  }

  async createPendaftaran(options) {
    const { data: pendaftaranData } = options;
    try {
      if (!pendaftaranData) {
        throw ErrorFactory.badRequest('Data pendaftaran tidak boleh kosong');
      }

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
        metodePembayaran,
        evidence,
        chanel
      } = pendaftaranData;

      // Validate critical fields
      if (!email) {
        throw ErrorFactory.badRequest('Email tidak boleh kosong');
      }
      if (!namaMurid) {
        throw ErrorFactory.badRequest('Nama murid tidak boleh kosong');
      }
      if (!programId) {
        throw ErrorFactory.badRequest('Program tidak boleh kosong');
      }
      if (!jumlahPembayaran || Number(jumlahPembayaran) <= 0) {
        throw ErrorFactory.badRequest('Jumlah pembayaran tidak boleh kosong atau nol');
      }

      const cleanedNamaMurid = CommonServiceUtils.cleanString(namaMurid);
      const cleanedNamaPanggilan = CommonServiceUtils.cleanString(namaPanggilan);

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

        if (existingPayment && ['EXPIRED', 'FAILED'].includes(existingPayment.statusPembayaran)) {
          await prisma.$transaction(async (tx) => {
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

      // Cache program query dengan select minimal
      const program = await prisma.program.findUnique({
        where: { id: programId },
        select: {
          id: true,
          namaProgram: true,
          tipeProgram: true
        }
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
          // Validasi persentase antara 0-100%
          if (Number(voucher.nominal) < 0 || Number(voucher.nominal) > 100) {
            throw ErrorFactory.badRequest(`Persentase diskon harus antara 0-100%. Saat ini: ${voucher.nominal}%`);
          }

          actualDiskon = Number(jumlahPembayaran) * (Number(voucher.nominal) / 100);
        }

        calculatedTotal = Number(jumlahPembayaran) - actualDiskon;

        // Debug log untuk perhitungan diskon
        logger.info('Perhitungan diskon:', {
          jumlahPembayaran: Number(jumlahPembayaran),
          voucherNominal: voucher.nominal,
          voucherTipe: voucher.tipe,
          actualDiskon: actualDiskon,
          calculatedTotal: calculatedTotal,
        });

        // Validasi total biaya minimal Rp 250.000 untuk pendaftaran tanpa diskon
        if (actualDiskon === 0 && calculatedTotal < 250000) {
          throw ErrorFactory.badRequest(`Biaya pendaftaran minimal Rp 250.000. Saat ini: Rp ${calculatedTotal.toLocaleString('id-ID')}`);
        }

        // Validasi total biaya minimal Rp 1.000 (requirement Xendit) untuk yang ada diskon
        if (actualDiskon > 0 && calculatedTotal < 1000) {
          throw ErrorFactory.badRequest(`Total biaya setelah diskon minimal Rp 1.000. Saat ini: Rp ${calculatedTotal.toLocaleString('id-ID')}`);
        }
      } else {
        // Validasi untuk pendaftaran tanpa voucher - minimal Rp 250.000
        if (calculatedTotal < 250000) {
          throw ErrorFactory.badRequest(`Biaya pendaftaran minimal Rp 250.000. Saat ini: Rp ${calculatedTotal.toLocaleString('id-ID')}`);
        }
      }


      const chanelData = await this.findOrCreateChanel(chanel);

      if (metodePembayaran === 'TUNAI') {
        if (!evidence) {
          throw ErrorFactory.badRequest('Bukti pembayaran wajib diupload untuk pembayaran tunai');
        }
        
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
          evidence,
          chanelId: chanelData.id
        });
      } else {

        const paymentData = await paymentService.createPendaftaranPayment({
          email,
          namaMurid: cleanedNamaMurid,
          totalBiaya: calculatedTotal,
          noWhatsapp,
          alamat
        });

        if (!paymentData || !paymentData.redirectUrl) {
          throw ErrorFactory.internalServerError('Gagal membuat pembayaran. Silakan coba lagi.');
        }

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
            voucherId,
            chanelId: chanelData.id
          }
        });

        return {
          success: false,
          pendaftaranId: pendaftaranTemp.id,
          redirectUrl: paymentData.redirectUrl,
          token: paymentData.token,
          orderId: paymentData.orderId,
          amount: paymentData.amount,
          expireDate: paymentData.expireDate
        };
      }
    } catch (error) {
      logger.error(error)
      throw error
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
        evidence,
        chanelId
      } = data;

      // Buat pembayaran dengan status PAID untuk tunai
      const pembayaran = await prisma.pembayaran.create({
        data: {
          tipePembayaran: 'PENDAFTARAN',
          metodePembayaran: 'TUNAI',
          totalTagihan: calculatedTotal,
          statusPembayaran: 'SETTLEMENT',
          tanggalPembayaran: new Date().toISOString().split('T')[0],
          evidence: evidence
        }
      });

      const generatedPassword = this.generateStudentPassword();
      const hashedPassword = await PasswordUtils.hashPassword(generatedPassword);

      return await prisma.$transaction(async (tx) => {
        // Create user account
        const user = await tx.user.create({
          data: {
            email,
            password: hashedPassword,
            role: 'SISWA'
          }
        });

        // Create siswa record
        const siswa = await tx.siswa.create({
          data: {
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
            noWhatsapp,
            userId: user.id
          }
        });

        // Create programSiswa record
        const programSiswa = await tx.programSiswa.create({
          data: {
            siswaId: siswa.id,
            programId,
            status: 'AKTIF',
            createdAt: new Date(),
            updatedAt: new Date()
          }
        });

        // Create pendaftaran record
        await tx.pendaftaran.create({
          data: {
            siswaId: siswa.id,
            pembayaranId: pembayaran.id,
            biayaPendaftaran: jumlahPembayaran,
            tanggalDaftar: CommonServiceUtils.getCurrentDate()
          }
        });

        // Generate SPP untuk 5 bulan ke depan
        const tanggalDaftar = CommonServiceUtils.getCurrentDate();
        const sppRecords = await SppService.generateFiveMonthsAhead(programSiswa.id, tanggalDaftar, tx);

        return {
          success: true,
          message: 'Pendaftaran berhasil',
          data: {
            siswa: {
              id: siswa.id,
              namaMurid: siswa.namaMurid,
              email: user.email
              // Password tidak dikembalikan untuk keamanan
            },
            pembayaran: {
              id: pembayaran.id,
              totalBiaya: calculatedTotal
            },
            evidence: evidence
          }
        };
      });
    } catch (error) {
      logger.error(error);
      throw error;
    }
  }

  async createPendaftaranV2(options) {
    const { data } = options;
    try {
      const { siswa, programId, biayaPendaftaran, isFamily, hubunganKeluarga, kartuKeluarga,kodeVoucher, metodePembayaran, evidence, chanel } = data;

      // Validate required fields
      if (!programId) {
        throw ErrorFactory.badRequest('Program ID wajib diisi');
      }

      if (!siswa || !Array.isArray(siswa) || siswa.length === 0) {
        throw ErrorFactory.badRequest('Data siswa wajib diisi');
      }

      if (!biayaPendaftaran || Number(biayaPendaftaran) <= 0) {
        throw ErrorFactory.badRequest('Biaya pendaftaran tidak boleh kosong atau nol');
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

      // Kartu keluarga hanya diperlukan jika ada file upload atau data yang dikirim
      // Jika tidak ada, kita akan skip validasi ini
      if (isFamily && subType === 'BERSAUDARA' && data.kartuKeluarga && data.kartuKeluarga.trim() === '') {
        throw ErrorFactory.badRequest('Kartu keluarga wajib diupload untuk program Private Bersaudara (isFamily: true)');
      }

      if (!isFamily && subType === 'BERSAUDARA' && !hubunganKeluarga) {
        throw ErrorFactory.badRequest('Hubungan keluarga wajib diisi untuk program Private Bersaudara (isFamily: false)');
      }

      const calculatedFees = this.calculateRegistrationFees(siswa, programType, subType, biayaPendaftaran);

      const calculatedTotal = calculatedFees.reduce((sum, fee) => sum + fee.totalBiaya, 0);


      let voucher = null;
      let totalDiskon = 0;
      let voucherId = null;

      if (kodeVoucher) {
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

        voucherId = voucher.id;

        if (voucher.tipe === 'PERSENTASE') {
          if (Number(voucher.nominal) < 0 || Number(voucher.nominal) > 100) {
            throw ErrorFactory.badRequest(`Persentase diskon harus antara 0-100%. Saat ini: ${voucher.nominal}%`);
          }

          totalDiskon = calculatedTotal * (Number(voucher.nominal) / 100);
        } else {
          totalDiskon = Math.min(Number(voucher.nominal), calculatedTotal * 0.5);
        }
      }

      const finalTotal = calculatedTotal - totalDiskon;

      // Validasi minimum payment
      if (totalDiskon === 0 && finalTotal < 250000) {
        throw ErrorFactory.badRequest(`Biaya pendaftaran minimal Rp 250.000. Saat ini: Rp ${finalTotal.toLocaleString('id-ID')}`);
      }

      if (totalDiskon > 0 && finalTotal < 1000) {
        throw ErrorFactory.badRequest(`Total biaya setelah diskon minimal Rp 1.000. Saat ini: Rp ${finalTotal.toLocaleString('id-ID')}`);
      }

      // Find or create chanel
      const chanelData = await this.findOrCreateChanel(chanel);

      // Handle berdasarkan metode pembayaran
      if (metodePembayaran === 'TUNAI') {
        // Validasi evidence untuk pembayaran tunai
        if (!evidence) {
          throw ErrorFactory.badRequest('Bukti pembayaran wajib diupload untuk pembayaran tunai');
        }
        
        // Untuk pembayaran tunai, langsung buat akun siswa untuk semua siswa
        return await this.createSiswaV2FromTunaiPayment({
          siswa,
          programId,
          calculatedFees,
          totalDiskon,
          finalTotal,
          voucherId,
          evidence,
          kartuKeluarga: data.kartuKeluarga,
          isFamily,
          hubunganKeluarga,
          chanelId: chanelData.id
        });
      } else {
        // Untuk pembayaran gateway (Midtrans), buat invoice dan temp data
        // Create Midtrans payment via payment service
        let midtransPaymentData;
        try {
          midtransPaymentData = await paymentService.createPendaftaranPaymentV2({
            data: {
              email: siswa[0].email,
              namaMurid: siswa[0].namaMurid,
              totalBiaya: finalTotal,
              noWhatsapp: siswa[0].noWhatsapp,
              alamat: siswa[0].alamat,
              description: `Pendaftaran ${program.namaProgram} - ${siswa.length} siswa`,
              items: siswa.map((s, index) => {
                const originalPrice = calculatedFees[index].totalBiaya;
                const discountRatio = totalDiskon / calculatedTotal;
                const discountedPrice = CommonServiceUtils.safeRound(originalPrice * (1 - discountRatio));

                return {
                  name: `Pendaftaran - ${s.namaMurid}`,
                  quantity: 1,
                  price: discountedPrice
                };
              })
            }
          });
        } catch (midtransError) {
          // Jika Midtrans gagal, hapus data yang sudah dibuat
          if (midtransPaymentData?.pembayaranId) {
            try {
              await prisma.$transaction(async (tx) => {
                // Hapus pembayaran
                await tx.pembayaran.delete({
                  where: { id: midtransPaymentData.pembayaranId }
                });
              }, { timeout: 15000, maxWait: 5000 });
            } catch (rollbackError) {
            }
          }
          throw midtransError;
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
                  chanelId: chanelData.id,
                  isFamily,
                  hubunganKeluarga,
                  jenisHubungan: data.jenisHubungan,
                  kartuKeluarga: data.kartuKeluarga,
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
              // Hapus pembayaran
              await tx.pembayaran.delete({
                where: { id: midtransPaymentData.pembayaranId }
              });
            }, { timeout: 15000, maxWait: 5000 });
          } catch (rollbackError) {
          }
          throw dbError;
        }

        return {
          success: false,
          pendaftaranId: pendaftaranPrivateTemp.id,
          pembayaranId: midtransPaymentData.pembayaranId,
          redirectUrl: midtransPaymentData.redirectUrl,
          token: midtransPaymentData.token,
          orderId: midtransPaymentData.orderId,
          amount: midtransPaymentData.amount,
          expireDate: midtransPaymentData.expireDate,
          totalBiaya: finalTotal,
          siswaCount: siswa.length,
        };
      }
    } catch (error) {
      logger.error(error);
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
        isFamily,
        hubunganKeluarga,
        chanelId
      } = data;

      const pembayaran = await prisma.pembayaran.create({
        data: {
          tipePembayaran: 'PENDAFTARAN',
          metodePembayaran: 'TUNAI',
          totalTagihan: finalTotal,
          statusPembayaran: 'SETTLEMENT',
          tanggalPembayaran: new Date().toISOString().split('T')[0],
          evidence: evidence
        }
      });

      const createdSiswa = [];
      const createdPendaftaran = [];

      for (let i = 0; i < siswa.length; i++) {
        const student = siswa[i];
        const fee = calculatedFees[i];

        const generatedPassword = this.generateStudentPassword(
          student.namaPanggilan,
          student.tanggalLahir
        );
        const hashedPassword = await PasswordUtils.hashPassword(generatedPassword);
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
            kartuKeluarga: data.kartuKeluarga || null
          }
        });

        // Buat pendaftaran
        const pendaftaran = await prisma.pendaftaran.create({
          data: {
            siswaId: siswaData.id,
            biayaPendaftaran: fee.biayaPendaftaran,
            tanggalDaftar: new Date().toISOString().split('T')[0],
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
          // Password tidak dikembalikan untuk keamanan
        });

        createdPendaftaran.push(pendaftaran.id);
      }

      // Update finance record dengan format tanggal DD-MM-YYYY
      const tanggalPembayaran = CommonServiceUtils.getCurrentDate('DD-MM-YYYY');
      await financeService.createFromEnrollmentPayment({
        id: pembayaran.id,
        totalTagihan: finalTotal,
        tanggalPembayaran: tanggalPembayaran,
        metodePembayaran: 'TUNAI'
      });

      // Generate SPP untuk 5 bulan ke depan untuk semua siswa
      const tanggalDaftar = CommonServiceUtils.getCurrentDate();
      // Batch query untuk programSiswa
      const programSiswaIds = await prisma.programSiswa.findMany({
        where: { 
          siswaId: { 
            in: createdSiswa.map(s => s.siswaId) 
          } 
        },
        select: { id: true, siswaId: true }
      });
      
      const programSiswaMap = new Map(programSiswaIds.map(ps => [ps.siswaId, ps.id]));
      
      const sppPromises = createdSiswa.map(async (siswaData) => {
        const programSiswaId = programSiswaMap.get(siswaData.siswaId);

        if (programSiswaId) {
          const sppRecords = await SppService.generateFiveMonthsAhead(programSiswaId, tanggalDaftar);
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
          status: 'AKTIF',
          evidence: evidence
        }
      };
    } catch (error) {
      logger.error(error);
      throw error;
    }
  }

  async getPendaftaranInvoice(invoices, options = {}) {
    const { data: filters = {}, where: additionalWhere = {} } = options;
    const { status, tanggal, nama, page = 1, limit = 10 } = filters;

    let filteredInvoices = invoices;
    if (status) {
      filteredInvoices = filteredInvoices.filter(inv => inv.status === status);
    }
    if (tanggal) {
      filteredInvoices = filteredInvoices.filter(inv => {
        const invoiceDate = CommonServiceUtils.formatDate(inv.createdAt);
        return invoiceDate === tanggal;
      });
    }

    // Sort invoices by createdAt in descending order (newest first)
    filteredInvoices.sort((a, b) => {
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    const startIdx = (page - 1) * limit;
    const pagedInvoices = filteredInvoices.slice(startIdx, startIdx + CommonServiceUtils.safeNumber(limit));
    const result = [];

    for (const invoice of pagedInvoices) {
      // 1. Ambil pembayaranId dari XenditPayment
      const xenditPayment = await prisma.xenditPayment.findUnique({
        where: { xenditInvoiceId: invoice.id }
      });
      const pembayaranId = xenditPayment?.pembayaranId || null;

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

    let finalResult = result;
    if (nama) {
      finalResult = result.filter(item => {
        const studentName = item.student?.nama || '';
        return studentName.toLowerCase().includes(nama.toLowerCase());
      });
    }

    return {
      data: finalResult,
      meta: {
        page: Number(page),
        limit: Number(limit),
        total: finalResult.length
      }
    };
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
        default:
          throw ErrorFactory.badRequest('Program private tidak valid');
      }
    }
  }

  calculateRegistrationFees(siswa, programType, subType, biayaPendaftaran) {
    const fees = [];

    if (programType === 'GROUP') {
      // Group programs: each student pays full registration fee
      siswa.forEach(() => {
        fees.push({
          biayaPendaftaran: Number(biayaPendaftaran),
          totalBiaya: Number(biayaPendaftaran)
        });
      });
    } else if (programType === 'PRIVATE') {
      switch (subType) {
        case 'MANDIRI':
          // Private Mandiri: each student pays full registration fee
          siswa.forEach(() => {
            fees.push({
              biayaPendaftaran: Number(biayaPendaftaran),
              totalBiaya: Number(biayaPendaftaran)
            });
          });
          break;
        case 'SHARING':
          // Private Sharing: orang 1 full, orang 2+ potongan 20% dari harga sebelumnya
          siswa.forEach((_, index) => {
            if (index === 0) {
              // Orang pertama: full price
              fees.push({
                biayaPendaftaran: Number(biayaPendaftaran),
                totalBiaya: Number(biayaPendaftaran)
              });
            } else {
              // Orang selanjutnya: 20% potongan dari harga sebelumnya
              const previousFee = fees[index - 1].totalBiaya;
              const currentFee = previousFee * 0.8; // 20% potongan (80% dari harga sebelumnya)
              fees.push({
                biayaPendaftaran: Number(biayaPendaftaran),
                totalBiaya: currentFee
              });
            }
          });
          break;
        case 'BERSAUDARA':
          // Private Bersaudara: orang 1 full, orang 2+ setengah harga, orang terakhir gratis
          siswa.forEach((_, index) => {
            if (index === 0) {
              // Orang pertama: full price
              fees.push({
                biayaPendaftaran: Number(biayaPendaftaran),
                totalBiaya: Number(biayaPendaftaran)
              });
            } else if (index === siswa.length - 1) {
              // Orang terakhir: gratis
              fees.push({
                biayaPendaftaran: Number(biayaPendaftaran),
                totalBiaya: 0
              });
            } else {
              // Orang di tengah: setengah harga dari orang sebelumnya
              const previousFee = fees[index - 1].totalBiaya;
              const currentFee = previousFee * 0.5; // Setengah harga
              fees.push({
                biayaPendaftaran: Number(biayaPendaftaran),
                totalBiaya: currentFee
              });
            }
          });
          break;
        default:
          throw ErrorFactory.badRequest('Program private tidak valid');
      }
    }

    return fees;
  }

}

module.exports = new PendaftaranService();
