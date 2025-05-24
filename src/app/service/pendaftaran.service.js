const { prisma } = require('../../lib/config/prisma.config');
const { logger } = require('../../lib/config/logger.config');
const { NotFoundError, ConflictError, BadRequestError } = require('../../lib/http/errors.http');
const paymentService = require('./payment.service');
const PasswordUtils = require('../../lib/utils/password.utils');
const PrismaUtils = require('../../lib/utils/prisma.utils');
const DataGeneratorUtils = require('../../lib/utils/data-generator.utils');
const EmailUtils = require('../../lib/utils/email.utils');

class PendaftaranService {
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
        successRedirectUrl,
        failureRedirectUrl
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

        const kelasProgram = await prisma.kelasProgram.findFirst({
          where: {
            programId,
            hari: jadwalItem.hari,
            jamMengajarId: jadwalItem.jamMengajarId
          }
        });

        if (!kelasProgram) {
          throw new NotFoundError(`Kelas program tidak tersedia untuk ${jadwalItem.hari} jam ${jamMengajar.jamMulai}-${jamMengajar.jamSelesai}`);
        }

        validJadwalIds.push(kelasProgram.id);
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
        successRedirectUrl,
        failureRedirectUrl
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

        const existingNISNumbers = await tx.siswa.findMany({
          select: { nis: true }
        });
        
        const nisNumber = DataGeneratorUtils.generateNIS(
          existingNISNumbers.map(s => s.nis).filter(Boolean)
        );

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

        const jadwal = JSON.parse(pendaftaranTemp.jadwalJson);

        const programSiswaList = [];
        const jadwalList = [];

        for (const jadwalItem of jadwal) {
          const kelasProgram = await tx.kelasProgram.findFirst({
            where: {
              programId: pendaftaranTemp.programId,
              hari: jadwalItem.hari,
              jamMengajarId: jadwalItem.jamMengajarId
            }
          });

          if (!kelasProgram) {
            throw new NotFoundError(`Kelas program tidak ditemukan untuk ${jadwalItem.hari}`);
          }

          let programSiswa = programSiswaList.find(ps => ps.kelasProgramId === kelasProgram.id);

          if (!programSiswa) {
            programSiswa = await tx.programSiswa.create({
              data: {
                siswaId: siswa.id,
                programId: pendaftaranTemp.programId,
                kelasProgramId: kelasProgram.id,
                status: 'AKTIF'
              }
            });
            programSiswaList.push(programSiswa);
          }

          const jadwalProgramSiswa = await tx.jadwalProgramSiswa.create({
            data: {
              programSiswaId: programSiswa.id,
              hari: jadwalItem.hari,
              jamMengajarId: jadwalItem.jamMengajarId
            }
          });
          jadwalList.push(jadwalProgramSiswa);
        }

        for (const programSiswa of programSiswaList) {
          await tx.riwayatStatusSiswa.create({
            data: {
              programSiswaId: programSiswa.id,
              statusLama: 'TIDAK_AKTIF',
              statusBaru: 'AKTIF',
              tanggalPerubahan: new Date().toISOString().split('T')[0],
              keterangan: 'Pendaftaran baru setelah pembayaran berhasil'
            }
          });
        }

        if (pendaftaranTemp.voucherId) {
          await tx.voucher.update({
            where: { id: pendaftaranTemp.voucherId },
            data: {
              jumlahPenggunaan: {
                decrement: 1
              }
            }
          });
        }

        await tx.pendaftaranTemp.delete({
          where: { id: pendaftaranTemp.id }
        });

        logger.info(`Successfully processed paid pendaftaran for user: ${user.email}`);

        try {
          await EmailUtils.sendWelcomeEmail({
            email: user.email,
            namaMurid: siswa.namaMurid,
            password: defaultPassword,
            nis: siswa.nis
          });
        } catch (emailError) {
          logger.warn('Failed to send welcome email:', emailError);
        }

        return {
          success: true,
          pendaftaran,
          siswa: {
            id: siswa.id,
            nis: siswa.nis,
            namaMurid: siswa.namaMurid,
            email: user.email
          },
          programSiswa: programSiswaList,
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

  async getPendaftaranStatus(pendaftaranId) {
    try {
      const pendaftaranTemp = await prisma.pendaftaranTemp.findUnique({
        where: { id: pendaftaranId },
        include: {
          pembayaran: {
            include: {
              xenditPayment: true
            }
          }
        }
      });

      if (!pendaftaranTemp) {
        throw new NotFoundError(`Pendaftaran dengan ID ${pendaftaranId} tidak ditemukan`);
      }

      return {
        id: pendaftaranTemp.id,
        namaMurid: pendaftaranTemp.namaMurid,
        email: pendaftaranTemp.email,
        totalBiaya: pendaftaranTemp.totalBiaya,
        statusPembayaran: pendaftaranTemp.pembayaran?.statusPembayaran || 'PENDING',
        paymentInfo: pendaftaranTemp.pembayaran?.xenditPayment ? {
          invoiceUrl: pendaftaranTemp.pembayaran.xenditPayment.xenditPaymentUrl,
          expireDate: pendaftaranTemp.pembayaran.xenditPayment.xenditExpireDate,
          status: pendaftaranTemp.pembayaran.xenditPayment.xenditStatus
        } : null,
        createdAt: pendaftaranTemp.createdAt,
        isCompleted: false
      };
    } catch (error) {
      logger.error(`Error getting pendaftaran status for ID ${pendaftaranId}:`, error);
      throw error;
    }
  }

  async cancelPendaftaran(pendaftaranId) {
    try {
      const pendaftaranTemp = await prisma.pendaftaranTemp.findUnique({
        where: { id: pendaftaranId },
        include: {
          pembayaran: {
            include: {
              xenditPayment: true
            }
          }
        }
      });

      if (!pendaftaranTemp) {
        throw new NotFoundError(`Pendaftaran dengan ID ${pendaftaranId} tidak ditemukan`);
      }

      if (pendaftaranTemp.pembayaran?.statusPembayaran === 'PAID') {
        throw new BadRequestError('Tidak dapat membatalkan pendaftaran yang sudah dibayar');
      }

      await PrismaUtils.transaction(async (tx) => {
        if (pendaftaranTemp.pembayaran?.id) {
          await paymentService.expirePayment(pendaftaranTemp.pembayaran.id);
        }

        await tx.pendaftaranTemp.delete({
          where: { id: pendaftaranId }
        });
      });

      logger.info(`Cancelled pendaftaran with ID: ${pendaftaranId}`);
      return { success: true, message: 'Pendaftaran berhasil dibatalkan' };
    } catch (error) {
      logger.error(`Error cancelling pendaftaran with ID ${pendaftaranId}:`, error);
      throw error;
    }
  }
}

module.exports = new PendaftaranService();