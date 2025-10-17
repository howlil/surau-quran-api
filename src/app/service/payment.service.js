const { prisma } = require('../../lib/config/prisma.config');
const ErrorFactory = require('../../lib/factories/error.factory');
const XenditUtils = require('../../lib/utils/xendit.utils');
const PrismaUtils = require('../../lib/utils/prisma.utils');
const PasswordUtils = require('../../lib/utils/password.utils');
const DataGeneratorUtils = require('../../lib/utils/data-generator.utils');
const EmailUtils = require('../../lib/utils/email.utils');
const WhatsAppUtils = require('../../lib/utils/whatsapp.utils');
const SppService = require('./spp.service');
const financeService = require('./finance.service');
const CommonServiceUtils = require('../../lib/utils/common.service.utils');
const moment = require('moment');

class PaymentService {

  async getVoucherId(kodeVoucher, tx) {
    try {
      const voucher = await tx.voucher.findUnique({
        where: {
          kodeVoucher: kodeVoucher.toUpperCase()
        }
      });
      return voucher?.id || null;
    } catch (error) {
      return null;
    }
  }

  async createPendaftaranInvoice(options) {
    try {
      const { data } = options;
      const { email, namaMurid, totalBiaya, noWhatsapp, alamat } = data;

      const externalId = XenditUtils.generateExternalId('DAFTAR');

      const invoiceData = {
        externalId,
        amount: Number(totalBiaya),
        payerEmail: email,
        description: `Pembayaran Pendaftaran - ${namaMurid}`,
        successRedirectUrl: process.env.FRONTEND_URL + process.env.XENDIT_SUCCESS_REDIRECT_URL,
        failureRedirectUrl: process.env.FRONTEND_URL + process.env.XENDIT_FAILURE_REDIRECT_URL,
        items: [{
          name: 'Biaya Pendaftaran',
          quantity: 1,
          price: Number(totalBiaya)
        }],
        customer: {
          givenNames: namaMurid || 'Calon Siswa',
          email: email,
          phoneNumber: noWhatsapp || '',
          address: alamat && alamat.trim() !== '' ? alamat.trim() : ''
        }
      };



      const xenditInvoice = await XenditUtils.createInvoice(invoiceData);

      const pembayaran = await prisma.pembayaran.create({
        data: {
          tipePembayaran: 'PENDAFTARAN',
          metodePembayaran: 'VIRTUAL_ACCOUNT',
          jumlahTagihan: xenditInvoice.items.reduce((sum, item) => sum + (item.price * item.quantity), 0),
          statusPembayaran: 'PENDING',
          tanggalPembayaran: CommonServiceUtils.getCurrentDate()
        }
      });

      await prisma.xenditPayment.create({
        data: {
          pembayaranId: pembayaran.id,
          xenditInvoiceId: xenditInvoice.id,
          xenditExternalId: xenditInvoice.externalId,
          xenditPaymentUrl: xenditInvoice.invoiceUrl,
          xenditPaymentChannel: 'VIRTUAL_ACCOUNT',
          xenditExpireDate: CommonServiceUtils.formatDate(xenditInvoice.expiryDate),
          xenditStatus: xenditInvoice.status
        }
      });

      return {
        pembayaranId: pembayaran.id,
        xenditInvoiceUrl: xenditInvoice.invoiceUrl,
        expireDate: xenditInvoice.expiryDate,
        amount: Number(totalBiaya),
        xenditInvoiceId: xenditInvoice.id
      };
    } catch (error) {
      throw error;
    }
  }

  async createPendaftaranInvoiceV2(options) {
    try {
      const { data } = options;
      const {
        externalId,
        amount,
        description,
        payerEmail,
        customer,
        items
      } = data;

      const invoiceData = {
        externalId,
        amount: Number(amount),
        payerEmail,
        description,
        successRedirectUrl: process.env.FRONTEND_URL + process.env.XENDIT_SUCCESS_REDIRECT_URL,
        failureRedirectUrl: process.env.FRONTEND_URL + process.env.XENDIT_FAILURE_REDIRECT_URL,
        items: items.map(item => ({
          name: item.name,
          quantity: item.quantity,
          price: Number(item.price)
        })),
        customer: {
          givenNames: customer.givenNames || 'Calon Siswa',
          email: customer.email,
          phoneNumber: customer.phoneNumber || '',
          address: customer.address || ''
        }
      };


      const xenditInvoice = await XenditUtils.createInvoice(invoiceData);



      const pembayaran = await prisma.pembayaran.create({
        data: {
          tipePembayaran: 'PENDAFTARAN',
          metodePembayaran: 'VIRTUAL_ACCOUNT',
          jumlahTagihan: Number(amount),
          statusPembayaran: 'PENDING',
          tanggalPembayaran: CommonServiceUtils.getCurrentDate()
        }
      });


      return {
        pembayaranId: pembayaran.id,
        xenditInvoiceUrl: xenditInvoice.invoice_url || xenditInvoice.invoiceUrl || '',
        expireDate: xenditInvoice.expiry_date || xenditInvoice.expiryDate,
        amount: Number(amount),
        xenditInvoiceId: xenditInvoice.id
      };
    } catch (error) {
      throw error;
    }
  }

  async createBatchSppInvoice(options) {
    try {
      const { data } = options;
      const { periodeSppIds, siswa, payment, voucherId } = data;

      const externalId = XenditUtils.generateExternalId('SPP');

      let description = `Pembayaran SPP - ${siswa.nama} - ${payment.periods}`;
      if (payment.discountAmount > 0) {
        description += ` (Diskon: Rp ${payment.discountAmount.toLocaleString('id-ID')})`;
      }

      const invoiceData = {
        externalId,
        amount: Number(payment.finalAmount),
        payerEmail: siswa.email,
        description: description,
        successRedirectUrl: process.env.FRONTEND_URL + process.env.XENDIT_SUCCESS_REDIRECT_URL,
        failureRedirectUrl: process.env.FRONTEND_URL + process.env.XENDIT_FAILURE_REDIRECT_URL,
        items: [{
          name: `SPP ${payment.periods}`,
          quantity: 1,
          price: Number(payment.finalAmount)
        }],
        customer: {
          givenNames: siswa.nama || 'Siswa',
          email: siswa.email,
          phoneNumber: siswa.noWhatsapp || '08123456789',
          address: siswa.alamat && siswa.alamat.trim() !== '' ? siswa.alamat.trim() : 'Alamat tidak tersedia' // Default address
        }
      };

      const xenditInvoice = await XenditUtils.createInvoice(invoiceData);

      return await prisma.$transaction(async (tx) => {
        const pembayaran = await tx.pembayaran.create({
          data: {
            tipePembayaran: 'SPP',
            metodePembayaran: 'VIRTUAL_ACCOUNT',
            jumlahTagihan: Number(payment.finalAmount),
            statusPembayaran: 'PENDING',
            tanggalPembayaran: CommonServiceUtils.getCurrentDate()
          }
        });

        await tx.xenditPayment.create({
          data: {
            pembayaranId: pembayaran.id,
            xenditInvoiceId: xenditInvoice.id,
            xenditExternalId: xenditInvoice.externalId,
            xenditPaymentUrl: xenditInvoice.invoiceUrl,
            xenditPaymentChannel: 'VIRTUAL_ACCOUNT',
            xenditExpireDate: CommonServiceUtils.formatDate(xenditInvoice.expiryDate),
            xenditStatus: xenditInvoice.status
          }
        });

        for (const periodeSppId of periodeSppIds) {
          await tx.periodeSpp.update({
            where: { id: periodeSppId },
            data: {
              pembayaranId: pembayaran.id,
              ...(voucherId && {
                voucher_id: voucherId,
                diskon: payment.discountAmount / periodeSppIds.length
              })
            }
          });
        }

        return {
          pembayaranId: pembayaran.id,
          xenditInvoiceUrl: xenditInvoice.invoiceUrl,
          expireDate: xenditInvoice.expiryDate,
          amount: Number(payment.finalAmount),
          xenditInvoiceId: xenditInvoice.id
        };
      });
    } catch (error) {
      throw error;
    }
  }

  async handleXenditCallback(callbackData) {
    try {
      const processedData = XenditUtils.processInvoiceCallback(callbackData);

      const xenditPayment = await prisma.xenditPayment.findUnique({
        where: { xenditInvoiceId: processedData.xenditInvoiceId },
        include: {
          pembayaran: true
        }
      });

      // Check if payment is expired first (before checking if it exists in database)
      if (processedData.status === 'EXPIRED') {
        return { message: 'Payment expired' };
      }

      if (!xenditPayment) {
        throw ErrorFactory.notFound(`Payment not found for invoice ID: ${processedData.xenditInvoiceId}`);
      }

      // Check if payment is already processed
      if (xenditPayment.xenditStatus === 'PAID' && processedData.status === 'PAID') {
        return { message: 'Payment already processed' };
      }


      return await prisma.$transaction(async (tx) => {
        await tx.xenditPayment.update({
          where: { id: xenditPayment.id },
          data: {
            xenditPaymentChannel: processedData.paymentMethod,
            xenditStatus: processedData.status,
            xenditPaidAt: processedData.paidAt,
            updatedAt: new Date()
          }
        });

        await tx.pembayaran.update({
          where: { id: xenditPayment.pembayaranId },
          data: {
            metodePembayaran: processedData.paymentMethod,
            statusPembayaran: processedData.status === 'PAID' ? 'PAID' : 'PENDING',
            tanggalPembayaran: processedData.paidAt ?
              CommonServiceUtils.formatDate(processedData.paidAt) :
              CommonServiceUtils.getCurrentDate(),
            updatedAt: new Date()
          }
        });

        // If this is a pendaftaran payment, process the pendaftaran
        if (xenditPayment && xenditPayment.pembayaran.tipePembayaran === 'PENDAFTARAN') {
          try {
            // Check if it's a V2 private registration by checking program type
            // Get payer email from Xendit callback data
            const payerEmail = callbackData.payer_email;


            if (!payerEmail) {
              throw ErrorFactory.badRequest('Email pembayar tidak ditemukan');
            }

            // Find SiswaPrivateTemp by email
            const siswaPrivateTemp = await tx.siswaPrivateTemp.findFirst({
              where: { email: payerEmail }
            });

            if (siswaPrivateTemp) {
              // This is V2 private registration
              await this.processV2PrivateRegistration(xenditPayment, siswaPrivateTemp, tx);
            } else {
              // This is V1 regular registration
              await this.processV1RegularRegistration(xenditPayment, tx);
            }
          } catch (error) {
            throw error;
          }
        }

        // Get updated payment data
        const updatedPayment = await tx.pembayaran.findUnique({
          where: { id: xenditPayment.pembayaranId }
        });

        // Auto-sync to Finance when payment is successful
        if (processedData.status === 'PAID') {
          await financeService.createFromPayment({
            paymentId: updatedPayment.id,
            type: updatedPayment.tipePembayaran,
            amount: updatedPayment.jumlahTagihan
          });
        }

        try {
          let financeRecord = null;
          if (updatedPayment.tipePembayaran === 'PENDAFTARAN') {
            financeRecord = await financeService.createFromEnrollmentPayment({
              id: updatedPayment.id,
              jumlahTagihan: updatedPayment.jumlahTagihan,
              tanggalPembayaran: updatedPayment.tanggalPembayaran,
              metodePembayaran: updatedPayment.metodePembayaran || 'PAYMENT_GATEWAY'
            });

            await prisma.pembayaranFinance.create({
              data: {
                paymentId: updatedPayment.id,
                financeRecordId: financeRecord.id,
                amount: financeRecord.total
              }
            });
          } else if (updatedPayment.tipePembayaran === 'SPP') {
            financeRecord = await financeService.createFromSppPayment({
              id: updatedPayment.id,
              jumlahTagihan: updatedPayment.jumlahTagihan,
              tanggalPembayaran: updatedPayment.tanggalPembayaran,
              metodePembayaran: updatedPayment.metodePembayaran || 'PAYMENT_GATEWAY'
            });

            await prisma.pembayaranFinance.create({
              data: {
                paymentId: updatedPayment.id,
                financeRecordId: financeRecord.id,
                amount: financeRecord.total
              }
            });
          }
        } catch (financeError) {
          // Finance sync error - continue without failing the main process
        }

        // Send WhatsApp notification for successful payment
        if (processedData.status === 'PAID') {
          try {
            await this.sendPaymentSuccessNotification(updatedPayment, processedData, tx);
          } catch (notificationError) {

          }
        }


        // Return payment data for controller
        const result = {
          id: updatedPayment.id,
          statusPembayaran: updatedPayment.statusPembayaran,
          tipePembayaran: updatedPayment.tipePembayaran,
          jumlahTagihan: updatedPayment.jumlahTagihan,
          tanggalPembayaran: updatedPayment.tanggalPembayaran,
          metodePembayaran: updatedPayment.metodePembayaran
        };

        return result;
      });
    } catch (error) {

      throw error;
    }
  }

  async processPaidSpp(pembayaranId) {
    try {
      const periodeSppList = await prisma.periodeSpp.findMany({
        where: { pembayaranId },
        include: {
          programSiswa: {
            include: {
              siswa: true
            }
          }
        }
      });

      if (periodeSppList.length === 0) {
        throw ErrorFactory.notFound('Tidak ada periode SPP yang terkait dengan pembayaran ini');
      }

      const monthsPaid = periodeSppList.map(spp => `${spp.bulan} ${spp.tahun}`).join(', ');

      return {
        success: true,
        siswaId: periodeSppList[0].programSiswa.siswaId,
        monthsPaid,
        totalPeriods: periodeSppList.length
      };
    } catch (error) {
      throw error;
    }
  }

  async processV2PrivateRegistration(xenditPayment, siswaPrivateTemp, tx) {
    try {

      // Find PendaftaranPrivateTemp by siswaPrivateId
      const pendaftaranPrivateTemp = await tx.pendaftaranPrivateTemp.findFirst({
        where: {
          siswaPrivateId: siswaPrivateTemp.id
        }
      });

      if (!pendaftaranPrivateTemp) {
        throw ErrorFactory.notFound(`PendaftaranPrivateTemp tidak ditemukan untuk siswa: ${siswaPrivateTemp.namaMurid}`);
      }

      // Get all students for this registration (for SHARING/BERSAUDARA programs)
      // Get all SiswaPrivateTemp records that are linked to PendaftaranPrivateTemp records
      // with the same registration data (programId, isFamily, etc.)
      const allSiswaPrivateIds = await tx.pendaftaranPrivateTemp.findMany({
        where: {
          programId: pendaftaranPrivateTemp.programId,
          isFamily: pendaftaranPrivateTemp.isFamily,
          hubunganKeluarga: pendaftaranPrivateTemp.hubunganKeluarga,
          kartuKeluarga: pendaftaranPrivateTemp.kartuKeluarga,
          totalBiaya: pendaftaranPrivateTemp.totalBiaya,
          diskon: pendaftaranPrivateTemp.diskon
        },
        select: {
          siswaPrivateId: true
        }
      });

      // Get all siswaPrivate records by their IDs
      const siswaPrivateRecords = await tx.siswaPrivateTemp.findMany({
        where: {
          id: {
            in: allSiswaPrivateIds.map(p => p.siswaPrivateId)
          }
        },
        orderBy: {
          id: 'asc'
        }
      });

      siswaPrivateRecords.forEach((student, index) => {
      });

      if (siswaPrivateRecords.length === 0) {
        throw ErrorFactory.notFound(`Tidak ada data siswa ditemukan untuk pendaftaran ini`);
      }


      // Get program details to determine program type (do this once outside the loop)
      const program = await tx.program.findUnique({
        where: { id: pendaftaranPrivateTemp.programId }
      });

      const programName = program?.namaProgram || '';
      const isSharing = programName.toLowerCase().includes('sharing');
      const isBersaudara = programName.toLowerCase().includes('bersaudara');

      // Create all students data in parallel using Promise.all for better performance
      const studentCreationPromises = siswaPrivateRecords.map(async (siswaPrivate, index) => {
        // Generate password with format: namapanggilan + tanggal lahir (DD)
        // Use namaMurid as fallback if namaPanggilan is empty
        const namaPanggilan = siswaPrivate.namaPanggilan || siswaPrivate.namaMurid;
        const generatedPassword = DataGeneratorUtils.generateStudentPassword(
          namaPanggilan,
          siswaPrivate.tanggalLahir
        );
        const hashedPassword = await PasswordUtils.hash(generatedPassword);

        // Create user
        const user = await tx.user.create({
          data: {
            email: siswaPrivate.email,
            password: hashedPassword,
            role: 'SISWA',
            createdAt: new Date(),
            updatedAt: new Date()
          }
        });

        // Generate NIS
        const nis = CommonServiceUtils.generateNIS(3);

        // Create siswa record
        const siswa = await tx.siswa.create({
          data: {
            userId: user.id,
            nis,
            namaMurid: siswaPrivate.namaMurid,
            namaPanggilan: siswaPrivate.namaPanggilan,
            tanggalLahir: siswaPrivate.tanggalLahir,
            jenisKelamin: siswaPrivate.jenisKelamin,
            alamat: siswaPrivate.alamat,
            strataPendidikan: siswaPrivate.strataPendidikan,
            kelasSekolah: siswaPrivate.kelasSekolah,
            namaSekolah: siswaPrivate.namaSekolah,
            namaOrangTua: siswaPrivate.namaOrangTua,
            namaPenjemput: siswaPrivate.namaPenjemput || siswaPrivate.namaOrangTua, // Fallback ke namaOrangTua jika namaPenjemput kosong
            jenisHubungan: pendaftaranPrivateTemp.jenisHubungan || null,
            noWhatsapp: siswaPrivate.noWhatsapp,

            isFamily: pendaftaranPrivateTemp.isFamily || false,
            hubunganKeluarga: pendaftaranPrivateTemp.hubunganKeluarga || null,
            kartuKeluarga: pendaftaranPrivateTemp.kartuKeluarga || null,
            keluargaId: null, // Will be set after creation based on program type
            createdAt: new Date(),
            updatedAt: new Date()
          }
        });

        // Create program siswa
        await tx.programSiswa.create({
          data: {
            siswaId: siswa.id,
            programId: pendaftaranPrivateTemp.programId,
            status: 'AKTIF',
            createdAt: new Date(),
            updatedAt: new Date()
          }
        });

        return {
          email: user.email,
          nama: siswa.namaMurid,
          nis: siswa.nis,
          password: generatedPassword,
          siswaId: siswa.id,
          index: index // Keep track of order for keluargaId assignment
        };
      });

      // Execute all student creation promises in parallel
      const createdUsers = await Promise.all(studentCreationPromises);

      // Get the first student ID for keluargaId (for SHARING or BERSAUDARA programs)
      let firstStudentId = null;

      // Set keluargaId for SHARING or BERSAUDARA programs
      if (isSharing || isBersaudara) {
        // First student (index 0) becomes the reference
        firstStudentId = createdUsers[0].siswaId;

        // Update keluargaId for all subsequent students
        const updatePromises = createdUsers.slice(1).map(async (user) => {
          await tx.siswa.update({
            where: { id: user.siswaId },
            data: { keluargaId: firstStudentId }
          });
        });

        await Promise.all(updatePromises);
      } else {
        // For MANDIRI programs, tidak perlu set keluargaId
      }

      // Create pendaftaran record for the first student only (since pembayaranId is unique)
      const firstStudent = createdUsers[0];
      await tx.pendaftaran.create({
        data: {
          siswaId: firstStudent.siswaId,
          biayaPendaftaran: siswaPrivateRecords[0].biayaPendaftaran,
          tanggalDaftar: moment().format('DD-MM-YYYY'),
          diskon: pendaftaranPrivateTemp.diskon || 0,
          totalBiaya: pendaftaranPrivateTemp.totalBiaya || siswaPrivateRecords[0].biayaPendaftaran,
          pembayaranId: xenditPayment.pembayaranId, // Use original pembayaranId
          voucher_id: pendaftaranPrivateTemp.kodeVoucher ? await this.getVoucherId(pendaftaranPrivateTemp.kodeVoucher, tx) : null,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });



      // Delete temporary registration data
      // Delete all PendaftaranPrivateTemp records for these students first due to foreign key constraint
      await tx.pendaftaranPrivateTemp.deleteMany({
        where: {
          siswaPrivateId: {
            in: siswaPrivateRecords.map(s => s.id)
          }
        }
      });

      // Then delete all SiswaPrivateTemp records for this registration
      await tx.siswaPrivateTemp.deleteMany({
        where: {
          id: {
            in: siswaPrivateRecords.map(s => s.id)
          }
        }
      });


      // Generate SPP untuk 5 bulan ke depan untuk semua siswa - this is critical, failure should fail the transaction
      // Get all programSiswa records in one query to avoid N+1 problem
      const siswaIds = createdUsers.map(user => user.siswaId);
      const programSiswaRecords = await tx.programSiswa.findMany({
        where: {
          siswaId: { in: siswaIds }
        }
      });

      const tanggalDaftar = CommonServiceUtils.getCurrentDate();

      // Generate SPP for all students in parallel
      const sppPromises = programSiswaRecords.map(async (programSiswa) => {
        const sppRecords = await SppService.generateFiveMonthsAhead(programSiswa.id, tanggalDaftar, tx);
        return sppRecords;
      });

      await Promise.all(sppPromises);

      // Send welcome emails for V2 private registration (in parallel, don't block transaction)
      const emailPromises = createdUsers.map(async (createdUser) => {
        try {
          await EmailUtils.sendWelcomeEmail({
            email: createdUser.email,
            name: createdUser.nama,
            password: createdUser.password
          });
        } catch (emailError) {
          // Email sending error - continue without failing the main process
        }
      });



    } catch (error) {
      throw error;
    }
  }

  async processV1RegularRegistration(xenditPayment, tx) {
    try {

      // Check V1 regular registration
      const pendaftaranTemp = await tx.pendaftaranTemp.findFirst({
        where: { pembayaranId: xenditPayment.pembayaranId }
      });

      if (!pendaftaranTemp) {
        // Check if this might be a duplicate callback for an already processed payment
        const existingPendaftaran = await tx.pendaftaran.findUnique({
          where: { pembayaranId: xenditPayment.pembayaranId },
          include: { siswa: true }
        });

        if (existingPendaftaran) {
          return existingPendaftaran.siswa;
        }

        throw ErrorFactory.notFound(`PendaftaranTemp tidak ditemukan untuk payment ID: ${xenditPayment.pembayaranId}`);
      }

      // Generate password with format: namapanggilan + tanggal lahir (DD)
      const generatedPassword = DataGeneratorUtils.generateStudentPassword(
        pendaftaranTemp.namaPanggilan,
        pendaftaranTemp.tanggalLahir
      );
      const hashedPassword = await PasswordUtils.hash(generatedPassword);

      // Create user
      const user = await tx.user.create({
        data: {
          email: pendaftaranTemp.email,
          password: hashedPassword,
          role: 'SISWA',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });

      // Generate NIS
      const nis = CommonServiceUtils.generateNIS(3);

      // Create siswa record
      const siswa = await tx.siswa.create({
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
          namaPenjemput: pendaftaranTemp.namaPenjemput || pendaftaranTemp.namaOrangTua, // Fallback ke namaOrangTua jika namaPenjemput kosong
          noWhatsapp: pendaftaranTemp.noWhatsapp,

          nis: nis,
          isFamily: false,
          hubunganKeluarga: null,
          keluargaId: null, // Will be set after creation
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });

      // For regular registration, tidak perlu set keluargaId
      // keluargaId tetap null untuk program regular

      // Create program siswa record with status
      const programSiswa = await tx.programSiswa.create({
        data: {
          siswaId: siswa.id,
          programId: pendaftaranTemp.programId,
          status: 'AKTIF',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });

      // Create pendaftaran record
      await tx.pendaftaran.create({
        data: {
          siswaId: siswa.id,
          pembayaranId: xenditPayment.pembayaranId,
          biayaPendaftaran: pendaftaranTemp.biayaPendaftaran,
          diskon: pendaftaranTemp.diskon,
          totalBiaya: pendaftaranTemp.totalBiaya,
          voucher_id: pendaftaranTemp.kodeVoucher ? await this.getVoucherId(pendaftaranTemp.kodeVoucher, tx) : null,
          tanggalDaftar: CommonServiceUtils.getCurrentDate(),
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });

      // Delete temporary registration data
      await tx.pendaftaranTemp.delete({
        where: { id: pendaftaranTemp.id }
      });

      // Generate SPP untuk 5 bulan ke depan - this is critical, failure should fail the transaction
      const tanggalDaftar = CommonServiceUtils.getCurrentDate();
      const sppRecords = await SppService.generateFiveMonthsAhead(programSiswa.id, tanggalDaftar, tx);

      // Send welcome email with credentials - but don't let email failure block the transaction


      return siswa;
    } catch (error) {
      throw error;
    }
  }

  async sendPaymentSuccessNotification(payment, processedData, tx) {
    try {
      let siswa = null;
      let program = null;
      let periode = null;

      // Get student and program information based on payment type
      if (payment.tipePembayaran === 'PENDAFTARAN') {
        const pendaftaran = await tx.pendaftaran.findUnique({
          where: { pembayaranId: payment.id },
          include: {
            siswa: {
              include: {
                user: {
                  select: {
                    email: true
                  }
                }
              }
            }
          }
        });

        if (pendaftaran) {
          siswa = pendaftaran.siswa;
          // For pendaftaran, get program from programSiswa
          const programSiswa = await tx.programSiswa.findFirst({
            where: { siswaId: siswa.id },
            include: {
              program: true
            }
          });
          if (programSiswa) {
            program = programSiswa.program;
          }
        }
      } else if (payment.tipePembayaran === 'SPP') {
        const periodeSpp = await tx.periodeSpp.findFirst({
          where: { pembayaranId: payment.id },
          include: {
            programSiswa: {
              include: {
                siswa: {
                  include: {
                    user: {
                      select: {
                        email: true
                      }
                    }
                  }
                },
                program: true
              }
            }
          }
        });

        if (periodeSpp) {
          siswa = periodeSpp.programSiswa.siswa;
          program = periodeSpp.programSiswa.program;
          periode = `${periodeSpp.bulan} ${periodeSpp.tahun}`;
        }
      }

      if (!siswa || !program) {
        // Continue without sending notification, but don't fail the main process
        return; // Exit early to avoid null reference errors
      }

      // Format amount
      const formattedAmount = new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR'
      }).format(payment.jumlahTagihan);

      // Prepare payment data for WhatsApp
      const paymentData = {
        namaSiswa: siswa.namaMurid,
        namaProgram: program.namaProgram,
        jumlahTagihan: formattedAmount,
        tanggalPembayaran: payment.tanggalPembayaran,
        metodePembayaran: payment.metodePembayaran,
        invoiceId: processedData.xenditInvoiceId,
        periode: periode
      };


      if (true && siswa.noWhatsapp) { // Set to true when WhatsApp token is renewed
        if (!WhatsAppUtils.validatePhoneNumber(siswa.noWhatsapp)) {
          // Skip WhatsApp notification but continue with email
        } else {
          try {
            const result = await WhatsAppUtils.sendPaymentSuccessWhatsApp(siswa.noWhatsapp, paymentData);

            if (result.success) {
              // WhatsApp notification sent successfully
            } else {
              // WhatsApp notification failed
            }
          } catch (whatsappError) {
            // WhatsApp notification error - continue with email notification
          }
        }
      } else if (siswa.noWhatsapp) {
        // WhatsApp number exists but validation failed
      } else {
        // No WhatsApp number available
      }

      // Send email notification as fallback
      if (siswa.user?.email) {
        try {
          await EmailUtils.sendPaymentSuccess({
            email: siswa.user.email,
            name: siswa.namaMurid,
            amount: payment.jumlahTagihan,
            paymentDate: payment.tanggalPembayaran
          });
        } catch (emailError) {
          // Email notification error - continue without failing the main process
        }
      }

    } catch (error) {
      throw error;
    }
  }
}

module.exports = new PaymentService();