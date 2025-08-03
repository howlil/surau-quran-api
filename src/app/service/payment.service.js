// src/app/service/payment.service.js
const { prisma } = require('../../lib/config/prisma.config');
const { logger } = require('../../lib/config/logger.config');
const XenditUtils = require('../../lib/utils/xendit.utils');
const { NotFoundError } = require('../../lib/http/errors.http');
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

      if (!xenditPayment) {
        logger.error(`Payment not found for invoice ID: ${processedData.xenditInvoiceId}`);
        throw new NotFoundError(`Payment not found for invoice ID: ${processedData.xenditInvoiceId}`);
      }

      logger.info(`Found payment record for invoice ID: ${processedData.xenditInvoiceId}`);

      return await PrismaUtils.transaction(async (tx) => {
        logger.info('Updating Xendit payment record');
        await tx.xenditPayment.update({
          where: { id: xenditPayment.id },
          data: {
            xenditPaymentChannel: processedData.paymentMethod,
            xenditStatus: processedData.status,
            xenditPaidAt: processedData.paidAt
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
              moment().format(DATE_FORMATS.DEFAULT)
          }
        });

        // If this is a pendaftaran payment, process the pendaftaran
        if (xenditPayment && xenditPayment.pembayaran.tipePembayaran === 'PENDAFTARAN') {
          try {
            // Get pendaftaranTemp data directly
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
                return existingPendaftaran.siswa; // Return existing siswa data
              }

              logger.error(`PendaftaranTemp not found for payment ID: ${xenditPayment.pembayaranId}`);
              throw new NotFoundError(`PendaftaranTemp not found for payment ID: ${xenditPayment.pembayaranId}`);
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
                role: 'SISWA'
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
                namaPenjemput: pendaftaranTemp.namaPenjemput,
                noWhatsapp: pendaftaranTemp.noWhatsapp,
                isRegistered: true,
                nis: nis
              }
            });

            // Create program siswa record with status
            const programSiswa = await tx.programSiswa.create({
              data: {
                siswaId: siswa.id,
                programId: pendaftaranTemp.programId,
                status: 'AKTIF',
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
                voucher_id: pendaftaranTemp.voucherId,
                tanggalDaftar: moment().format(DATE_FORMATS.DEFAULT)
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

            logger.info(`Successfully processed pendaftaran for payment ID: ${xenditPayment.pembayaranId}`);
            return siswa;
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
        return updatedPayment;
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
        return;
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

      // Send WhatsApp notification if phone number is available
      if (siswa.noWhatsapp) {
        if (!WhatsAppUtils.validatePhoneNumber(siswa.noWhatsapp)) {
          logger.warn(`Invalid WhatsApp number format for siswa ${siswa.id}: ${siswa.noWhatsapp}`);
          return;
        }

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