// src/app/service/payment.service.js
const { prisma } = require('../../lib/config/prisma.config');
const { logger } = require('../../lib/config/logger.config');
const XenditUtils = require('../../lib/utils/xendit.utils');
const { NotFoundError, BadRequestError } = require('../../lib/http/errors.http');
const PrismaUtils = require('../../lib/utils/prisma.utils');
const PasswordUtils = require('../../lib/utils/password.utils');
const DataGeneratorUtils = require('../../lib/utils/data-generator.utils');
const EmailUtils = require('../../lib/utils/email.utils');
const WhatsAppUtils = require('../../lib/utils/whatsapp.utils');
const SppService = require('./spp.service');
const financeService = require('./finance.service');
const moment = require('moment');
const { DATE_FORMATS } = require('../../lib/constants');

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
      logger.error('Error getting voucher ID:', error);
      return null;
    }
  }

  async createPendaftaranInvoice(data) {
    try {
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

      // Log customer data untuk debugging pendaftaran
      logger.info('Creating Xendit pendaftaran invoice with customer data:', {
        customer: invoiceData.customer,
        description: invoiceData.description
      });

      const xenditInvoice = await XenditUtils.createInvoice(invoiceData);

      const pembayaran = await prisma.pembayaran.create({
        data: {
          tipePembayaran: 'PENDAFTARAN',
          metodePembayaran: 'VIRTUAL_ACCOUNT',
          jumlahTagihan: xenditInvoice.items.reduce((sum, item) => sum + (item.price * item.quantity), 0),
          statusPembayaran: 'PENDING',
          tanggalPembayaran: moment().format(DATE_FORMATS.DEFAULT)
        }
      });

      await prisma.xenditPayment.create({
        data: {
          pembayaranId: pembayaran.id,
          xenditInvoiceId: xenditInvoice.id,
          xenditExternalId: xenditInvoice.externalId,
          xenditPaymentUrl: xenditInvoice.invoiceUrl,
          xenditPaymentChannel: 'VIRTUAL_ACCOUNT',
          xenditExpireDate: moment(xenditInvoice.expiryDate).format(DATE_FORMATS.DEFAULT),
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
      logger.error('Error creating pendaftaran invoice:', error);
      throw error;
    }
  }

  async createPendaftaranInvoiceV2(data) {
    try {
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

      logger.info('Creating Xendit pendaftaran V2 invoice:', {
        externalId,
        amount,
        description,
        itemsCount: items.length
      });

      const xenditInvoice = await XenditUtils.createInvoice(invoiceData);

      // Log response dari Xendit untuk debugging
      logger.info('Xendit invoice response for V2:', {
        id: xenditInvoice.id,
        invoice_url: xenditInvoice.invoice_url,
        invoiceUrl: xenditInvoice.invoiceUrl,
        external_id: xenditInvoice.external_id,
        externalId: xenditInvoice.externalId,
        expiry_date: xenditInvoice.expiry_date,
        expiryDate: xenditInvoice.expiryDate,
        status: xenditInvoice.status,
        amount: xenditInvoice.amount,
        fullResponse: JSON.stringify(xenditInvoice, null, 2)
      });

      const pembayaran = await prisma.pembayaran.create({
        data: {
          tipePembayaran: 'PENDAFTARAN',
          metodePembayaran: 'VIRTUAL_ACCOUNT',
          jumlahTagihan: Number(amount),
          statusPembayaran: 'PENDING',
          tanggalPembayaran: moment().format(DATE_FORMATS.DEFAULT)
        }
      });

      await prisma.xenditPayment.create({
        data: {
          pembayaranId: pembayaran.id,
          xenditInvoiceId: xenditInvoice.id,
          xenditExternalId: xenditInvoice.external_id || externalId,
          xenditPaymentUrl: xenditInvoice.invoice_url || '',
          xenditPaymentChannel: 'PENDING',
          xenditExpireDate: xenditInvoice.expiry_date || '',
          xenditStatus: 'PENDING'
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
      logger.error('Error creating pendaftaran V2 invoice:', error);
      
      // Provide more specific error messages based on error type
      if (error.message.includes('fetch failed') || error.message.includes('network') || error.message.includes('timeout')) {
        throw new BadRequestError('Gagal terhubung ke sistem pembayaran. Silakan coba lagi dalam beberapa menit atau hubungi admin jika masalah berlanjut.');
      } else if (error.message.includes('authentication') || error.message.includes('unauthorized')) {
        throw new BadRequestError('Konfigurasi sistem pembayaran bermasalah. Silakan hubungi admin.');
      } else if (error.message.includes('validation') || error.message.includes('invalid')) {
        throw new BadRequestError('Data pembayaran tidak valid. Silakan periksa kembali data yang dimasukkan.');
      } else if (error.message.includes('Gagal terhubung ke sistem pembayaran')) {
        // This is our custom error message from XenditUtils
        throw new BadRequestError(error.message);
      } else {
        throw new BadRequestError('Gagal membuat invoice pembayaran. Silakan coba lagi atau hubungi admin.');
      }
    }
  }

  async createBatchSppInvoice(data) {
    try {
      const { periodeSppIds, siswa, payment, voucherId } = data;

      const externalId = XenditUtils.generateExternalId('SPP');

      // Buat deskripsi yang mencakup diskon jika ada
      let description = `Pembayaran SPP - ${siswa.nama} - ${payment.periods}`;
      if (payment.discountAmount > 0) {
        description += ` (Diskon: Rp ${payment.discountAmount.toLocaleString('id-ID')})`;
      }

      const invoiceData = {
        externalId,
        amount: Number(payment.finalAmount), // Gunakan finalAmount yang sudah dikurangi diskon
        payerEmail: siswa.email,
        description: description,
        successRedirectUrl: process.env.FRONTEND_URL + process.env.XENDIT_SUCCESS_REDIRECT_URL,
        failureRedirectUrl: process.env.FRONTEND_URL + process.env.XENDIT_FAILURE_REDIRECT_URL,
        items: [{
          name: `SPP ${payment.periods}`,
          quantity: 1,
          price: Number(payment.finalAmount) // Gunakan finalAmount, bukan originalAmount
        }],
        customer: {
          givenNames: siswa.nama || 'Siswa',
          email: siswa.email,
          phoneNumber: siswa.noWhatsapp || '08123456789', // Default phone number
          address: siswa.alamat && siswa.alamat.trim() !== '' ? siswa.alamat.trim() : 'Alamat tidak tersedia' // Default address
        }
      };

      // Log customer data untuk debugging SPP
      logger.info('Creating Xendit SPP invoice with customer data:', {
        customer: invoiceData.customer,
        description: invoiceData.description,
        amount: invoiceData.amount,
        originalAmount: payment.originalAmount,
        discountAmount: payment.discountAmount,
        finalAmount: payment.finalAmount
      });

      const xenditInvoice = await XenditUtils.createInvoice(invoiceData);

      return await PrismaUtils.transaction(async (tx) => {
        const pembayaran = await tx.pembayaran.create({
          data: {
            tipePembayaran: 'SPP',
            metodePembayaran: 'VIRTUAL_ACCOUNT',
            jumlahTagihan: Number(payment.finalAmount),
            statusPembayaran: 'PENDING',
            tanggalPembayaran: moment().format(DATE_FORMATS.DEFAULT)
          }
        });

        await tx.xenditPayment.create({
          data: {
            pembayaranId: pembayaran.id,
            xenditInvoiceId: xenditInvoice.id,
            xenditExternalId: xenditInvoice.externalId,
            xenditPaymentUrl: xenditInvoice.invoiceUrl,
            xenditPaymentChannel: 'VIRTUAL_ACCOUNT',
            xenditExpireDate: moment(xenditInvoice.expiryDate).format(DATE_FORMATS.DEFAULT),
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
      logger.error('Error creating batch SPP invoice:', error);
      throw error;
    }
  }

  async handleXenditCallback(callbackData) {
    try {
      logger.info('Received Xendit callback:', callbackData);
      const processedData = XenditUtils.processInvoiceCallback(callbackData);
      logger.info('Processed callback data:', processedData);

      const xenditPayment = await prisma.xenditPayment.findUnique({
        where: { xenditInvoiceId: processedData.xenditInvoiceId },
        include: {
          pembayaran: true
        }
      });

      // Check if payment is expired first (before checking if it exists in database)
      if (processedData.status === 'EXPIRED') {
        logger.info(`Payment expired for invoice ID: ${processedData.xenditInvoiceId}. Skipping processing.`);
        return { message: 'Payment expired' };
      }

      if (!xenditPayment) {
        logger.error(`Payment not found for invoice ID: ${processedData.xenditInvoiceId}`);
        throw new NotFoundError(`Payment not found for invoice ID: ${processedData.xenditInvoiceId}`);
      }

      // Check if payment is already processed
      if (xenditPayment.xenditStatus === 'PAID' && processedData.status === 'PAID') {
        logger.info(`Payment already processed for invoice ID: ${processedData.xenditInvoiceId}. Skipping.`);
        return { message: 'Payment already processed' };
      }

      logger.info(`Found payment record for invoice ID: ${processedData.xenditInvoiceId}`);

      return await PrismaUtils.transaction(async (tx) => {
        logger.info('Updating Xendit payment record');
        await tx.xenditPayment.update({
          where: { id: xenditPayment.id },
          data: {
            xenditPaymentChannel: processedData.paymentMethod,
            xenditStatus: processedData.status,
            xenditPaidAt: processedData.paidAt,
            updatedAt: new Date()
          }
        });

        logger.info('Updating payment record');
        await tx.pembayaran.update({
          where: { id: xenditPayment.pembayaranId },
          data: {
            metodePembayaran: processedData.paymentMethod,
            statusPembayaran: processedData.status === 'PAID' ? 'PAID' : 'PENDING',
            tanggalPembayaran: processedData.paidAt ?
              moment(processedData.paidAt).format(DATE_FORMATS.DEFAULT) :
              moment().format(DATE_FORMATS.DEFAULT),
            updatedAt: new Date()
          }
        });

        // If this is a pendaftaran payment, process the pendaftaran
        if (xenditPayment && xenditPayment.pembayaran.tipePembayaran === 'PENDAFTARAN') {
          try {
            // Check if it's a V2 private registration by checking program type
            // Get payer email from Xendit callback data
            const payerEmail = callbackData.payer_email;
            
            logger.info('Processing pendaftaran payment with payer email:', payerEmail);
            
            if (!payerEmail) {
              throw new BadRequestError('Email pembayar tidak ditemukan');
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
            logger.error(`Error processing pendaftaran for payment ID: ${xenditPayment.pembayaranId}:`, {
              error: error.message,
              stack: error.stack
            });
            throw error;
          }
        }

        // Get updated payment data
        const updatedPayment = await tx.pembayaran.findUnique({
          where: { id: xenditPayment.pembayaranId }
        });

        // Auto-sync to Finance when payment is successful
        if (processedData.status === 'PAID') {
          logger.info('Starting auto-sync to finance for paid payment:', {
            paymentId: updatedPayment.id,
            type: updatedPayment.tipePembayaran,
            amount: updatedPayment.jumlahTagihan
          });

          try {
            let financeRecord = null;
            if (updatedPayment.tipePembayaran === 'PENDAFTARAN') {
              financeRecord = await financeService.createFromEnrollmentPayment({
                id: updatedPayment.id,
                jumlahTagihan: updatedPayment.jumlahTagihan,
                tanggalPembayaran: updatedPayment.tanggalPembayaran
              });
              logger.info('Successfully synced enrollment payment to finance:', {
                paymentId: updatedPayment.id,
                financeRecordId: financeRecord.id,
                amount: financeRecord.total
              });
            } else if (updatedPayment.tipePembayaran === 'SPP') {
              financeRecord = await financeService.createFromSppPayment({
                id: updatedPayment.id,
                jumlahTagihan: updatedPayment.jumlahTagihan,
                tanggalPembayaran: updatedPayment.tanggalPembayaran
              });
              logger.info('Successfully synced SPP payment to finance:', {
                paymentId: updatedPayment.id,
                financeRecordId: financeRecord.id,
                amount: financeRecord.total
              });
            }
          } catch (financeError) {
            // Log error but don't fail the main payment processing
            logger.error('Failed to auto-sync payment to finance:', {
              paymentId: updatedPayment.id,
              error: financeError.message,
              stack: financeError.stack
            });
          }
        } else {
          logger.info('Skipping finance sync - payment not paid yet:', {
            paymentId: updatedPayment.id,
            status: processedData.status
          });
        }

        // Send WhatsApp notification for successful payment
        if (processedData.status === 'PAID') {
          try {
            await this.sendPaymentSuccessNotification(updatedPayment, processedData, tx);
          } catch (notificationError) {
            // Log error but don't fail the main payment processing
            logger.error('Failed to send payment success notification:', {
              paymentId: updatedPayment.id,
              error: notificationError.message,
              stack: notificationError.stack
            });
          }
        }

        logger.info(`Successfully processed payment callback for ID: ${xenditPayment.pembayaranId}`);
        
        // Return payment data for controller
        const result = {
          id: updatedPayment.id,
          statusPembayaran: updatedPayment.statusPembayaran,
          tipePembayaran: updatedPayment.tipePembayaran,
          jumlahTagihan: updatedPayment.jumlahTagihan,
          tanggalPembayaran: updatedPayment.tanggalPembayaran,
          metodePembayaran: updatedPayment.metodePembayaran
        };
        
        logger.info('Returning payment result:', result);
        return result;
      });
    } catch (error) {
      logger.error('Error handling Xendit callback:', {
        error: error.message,
        stack: error.stack
      });
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
        throw new NotFoundError('Tidak ada periode SPP yang terkait dengan pembayaran ini');
      }

      const monthsPaid = periodeSppList.map(spp => `${spp.bulan} ${spp.tahun}`).join(', ');
      logger.info(`SPP payment processed for: ${periodeSppList[0].programSiswa.siswa.namaMurid} - ${monthsPaid}`);

      return {
        success: true,
        siswaId: periodeSppList[0].programSiswa.siswaId,
        monthsPaid,
        totalPeriods: periodeSppList.length
      };
    } catch (error) {
      logger.error('Error processing paid SPP:', error);
      throw error;
    }
  }

  async processV2PrivateRegistration(xenditPayment, siswaPrivateTemp, tx) {
    try {
      logger.info(`Processing V2 private registration for payment ID: ${xenditPayment.pembayaranId}`);

      // Find PendaftaranPrivateTemp by siswaPrivateId
      const pendaftaranPrivateTemp = await tx.pendaftaranPrivateTemp.findFirst({
        where: {
          siswaPrivateId: siswaPrivateTemp.id
        }
      });

    if (!pendaftaranPrivateTemp) {
      throw new NotFoundError(`PendaftaranPrivateTemp tidak ditemukan untuk siswa: ${siswaPrivateTemp.namaMurid}`);
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

    logger.info(`Found ${siswaPrivateRecords.length} students for this registration`);
    siswaPrivateRecords.forEach((student, index) => {
      logger.info(`Student ${index + 1}: ${student.namaMurid} (${student.email}) - ID: ${student.id}`);
    });

    if (siswaPrivateRecords.length === 0) {
      throw new NotFoundError(`Tidak ada data siswa ditemukan untuk pendaftaran ini`);
    }

    logger.info(`Found ${siswaPrivateRecords.length} students for V2 private registration`);

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
      const currentYear = new Date().getFullYear();
      const randomNumber = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      const nis = `${currentYear}${randomNumber}`;

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
    logger.info(`Successfully created ${createdUsers.length} students in parallel`);

    // Get the first student ID for keluargaId (for SHARING or BERSAUDARA programs)
    let firstStudentId = null;

    // Set keluargaId for SHARING or BERSAUDARA programs
    if (isSharing || isBersaudara) {
      // First student (index 0) becomes the reference
      firstStudentId = createdUsers[0].siswaId;
      logger.info(`First student ${createdUsers[0].nama} (ID: ${firstStudentId}) set as keluarga reference - keluargaId will remain null`);

      // Update keluargaId for all subsequent students
      const updatePromises = createdUsers.slice(1).map(async (user) => {
        await tx.siswa.update({
          where: { id: user.siswaId },
          data: { keluargaId: firstStudentId }
        });
        logger.info(`Student ${user.nama} (ID: ${user.siswaId}) linked to keluarga ID: ${firstStudentId}`);
      });

      await Promise.all(updatePromises);
    } else {
      // For MANDIRI programs, tidak perlu set keluargaId
      logger.info(`MANDIRI program - no keluargaId needed for any students`);
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
    logger.info(`Created pendaftaran record for first student ${firstStudent.nama} with pembayaranId: ${xenditPayment.pembayaranId}`);



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

    logger.info(`Deleted ${siswaPrivateRecords.length} temporary student records and ${siswaPrivateRecords.length} registration records`);

    // Generate SPP untuk 5 bulan ke depan untuk semua siswa - this is critical, failure should fail the transaction
    // Get all programSiswa records in one query to avoid N+1 problem
    const siswaIds = createdUsers.map(user => user.siswaId);
    const programSiswaRecords = await tx.programSiswa.findMany({
      where: { 
        siswaId: { in: siswaIds }
      }
    });

    const tanggalDaftar = moment().format(DATE_FORMATS.DEFAULT);
    
    // Generate SPP for all students in parallel
    const sppPromises = programSiswaRecords.map(async (programSiswa) => {
      const sppRecords = await SppService.generateFiveMonthsAhead(programSiswa.id, tanggalDaftar, tx);
      logger.info(`Generated ${sppRecords.length} SPP records for siswa ID: ${programSiswa.siswaId}`);
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
        logger.info(`Welcome email sent successfully to: ${createdUser.email}`);
      } catch (emailError) {
        logger.error(`Failed to send welcome email to ${createdUser.email}:`, {
          error: emailError.message,
          stack: emailError.stack
        });
        logger.info(`Registration completed successfully for ${createdUser.email}, but welcome email could not be sent`);
      }
    });
    
    // Don't await email sending to avoid blocking the transaction
    Promise.all(emailPromises).catch(error => {
      logger.error('Error sending welcome emails:', error);
    });

      logger.info(`Successfully processed V2 private registration for payment ID: ${xenditPayment.pembayaranId}`);
    } catch (error) {
      logger.error('Error processing V2 private registration:', error);
      throw error;
    }
  }

  async processV1RegularRegistration(xenditPayment, tx) {
    try {
      logger.info(`Processing V1 regular registration for payment ID: ${xenditPayment.pembayaranId}`);

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
        logger.info(`Found existing pendaftaran for payment ID: ${xenditPayment.pembayaranId}. Skipping processing.`);
        return existingPendaftaran.siswa;
      }

      throw new NotFoundError(`PendaftaranTemp tidak ditemukan untuk payment ID: ${xenditPayment.pembayaranId}`);
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
    const currentYear = new Date().getFullYear();
    const randomNumber = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    const nis = `${currentYear}${randomNumber}`;

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
        tanggalDaftar: moment().format(DATE_FORMATS.DEFAULT),
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });

    // Delete temporary registration data
    await tx.pendaftaranTemp.delete({
      where: { id: pendaftaranTemp.id }
    });

    // Generate SPP untuk 5 bulan ke depan - this is critical, failure should fail the transaction
    const tanggalDaftar = moment().format(DATE_FORMATS.DEFAULT);
    const sppRecords = await SppService.generateFiveMonthsAhead(programSiswa.id, tanggalDaftar, tx);
    logger.info(`Generated ${sppRecords.length} SPP records for siswa: ${siswa.namaMurid}`);

    // Send welcome email with credentials - but don't let email failure block the transaction
    try {
      await EmailUtils.sendWelcomeEmail({
        email: user.email,
        name: siswa.namaMurid,
        password: generatedPassword
      });
      logger.info(`Welcome email sent successfully to: ${user.email}`);
    } catch (emailError) {
      logger.error(`Failed to send welcome email to ${user.email}:`, {
        error: emailError.message,
        stack: emailError.stack
      });
      logger.info(`Registration completed successfully for ${user.email}, but welcome email could not be sent`);
    }

      logger.info(`Successfully processed V1 regular registration for payment ID: ${xenditPayment.pembayaranId}`);
      return siswa;
    } catch (error) {
      logger.error('Error processing V1 regular registration:', error);
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
        logger.warn(`Could not find student or program data for payment ${payment.id}`);
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
          logger.warn(`Invalid WhatsApp number format for siswa ${siswa.id}: ${siswa.noWhatsapp}`);
          // Skip WhatsApp notification but continue with email
        } else {
          try {
            const result = await WhatsAppUtils.sendPaymentSuccessWhatsApp(siswa.noWhatsapp, paymentData);

            if (result.success) {
              logger.info(`Payment success WhatsApp notification sent to ${siswa.noWhatsapp} for payment ${payment.id}`, {
                messageSid: result.messageSid,
                status: result.status,
                paymentType: payment.tipePembayaran
              });
            } else {
              logger.error(`Failed to send payment success WhatsApp notification to ${siswa.noWhatsapp} for payment ${payment.id}:`, {
                error: result.error,
                code: result.code
              });
            }
          } catch (whatsappError) {
            logger.error(`Error sending WhatsApp notification to ${siswa.noWhatsapp} for payment ${payment.id}:`, {
              error: whatsappError.message,
              details: whatsappError.details
            });
            // Don't throw error, continue with email notification
          }
        }
      } else if (siswa.noWhatsapp) {
        logger.info(`WhatsApp notification temporarily disabled due to API token expiration for siswa ${siswa.id}`);
      } else {
        logger.info(`No WhatsApp number available for siswa ${siswa.id}, skipping WhatsApp notification`);
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
          logger.info(`Payment success email sent to ${siswa.user.email} for payment ${payment.id}`);
        } catch (emailError) {
          logger.error(`Failed to send payment success email to ${siswa.user.email} for payment ${payment.id}:`, emailError);
        }
      }

    } catch (error) {
      logger.error(`Error sending payment success notification for payment ${payment.id}:`, error);
      throw error;
    }
  }
}

module.exports = new PaymentService();