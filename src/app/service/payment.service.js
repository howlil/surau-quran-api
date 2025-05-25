// src/app/service/payment.service.js
const { prisma } = require('../../lib/config/prisma.config');
const { logger } = require('../../lib/config/logger.config');
const XenditUtils = require('../../lib/utils/xendit.utils');
const { NotFoundError } = require('../../lib/http/errors.http');
const PrismaUtils = require('../../lib/utils/prisma.utils');

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
          givenNames: namaMurid,
          email: email,
          phoneNumber: noWhatsapp,
          address: alamat
        }
      };

      const xenditInvoice = await XenditUtils.createInvoice(invoiceData);

      const pembayaran = await prisma.pembayaran.create({
        data: {
          tipePembayaran: 'PENDAFTARAN',
          jumlahTagihan: xenditInvoice.items.reduce((sum, item) => sum + (item.price * item.quantity), 0),
          statusPembayaran: xenditInvoice.status,
          tanggalPembayaran: xenditInvoice.updated.toISOString().split('T')[0],
        }
      });

      await prisma.xenditPayment.create({
        data: {
          pembayaranId: pembayaran.id,
          xenditInvoiceId: xenditInvoice.id,
          xenditExternalId: xenditInvoice.externalId,
          xenditPaymentUrl: xenditInvoice.invoiceUrl,
          xenditPaymentChannel: 'VIRTUAL_ACCOUNT',
          xenditExpireDate: xenditInvoice.expiryDate.toISOString().split('T')[0],
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

      const invoiceData = {
        externalId,
        amount: Number(payment.finalAmount),
        payerEmail: siswa.email,
        description: `Pembayaran SPP - ${siswa.nama} - ${payment.periods}`,
        successRedirectUrl: process.env.FRONTEND_URL + process.env.XENDIT_SUCCESS_REDIRECT_URL,
        failureRedirectUrl: process.env.FRONTEND_URL + process.env.XENDIT_FAILURE_REDIRECT_URL,
        items: [{
          name: `SPP ${payment.periods}`,
          quantity: 1,
          price: Number(payment.originalAmount)
        }]
      };

      if (payment.discountAmount > 0) {
        invoiceData.items.push({
          name: `Diskon Voucher ${payment.kodeVoucher}`,
          quantity: 1,
          price: -Number(payment.discountAmount)
        });
      }

      const xenditInvoice = await XenditUtils.createInvoice(invoiceData);

      return await PrismaUtils.transaction(async (tx) => {
        const pembayaran = await tx.pembayaran.create({
          data: {
            tipePembayaran: 'SPP',
            metodePembayaran: 'VIRTUAL_ACCOUNT',
            jumlahTagihan: Number(payment.finalAmount),
            statusPembayaran: 'PENDING',
            tanggalPembayaran: new Date().toISOString().split('T')[0]
          }
        });

        await tx.xenditPayment.create({
          data: {
            pembayaranId: pembayaran.id,
            xenditInvoiceId: xenditInvoice.id,
            xenditExternalId: xenditInvoice.externalId,
            xenditPaymentUrl: xenditInvoice.invoiceUrl,
            xenditPaymentChannel: 'VIRTUAL_ACCOUNT',
            xenditExpireDate: xenditInvoice.expiryDate.toISOString().split('T')[0],
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

        if (voucherId) {
          await tx.voucher.update({
            where: { id: voucherId },
            data: {
              jumlahPenggunaan: { decrement: 1 }
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
      const processedData = XenditUtils.processInvoiceCallback(callbackData);

      const xenditPayment = await prisma.xenditPayment.findUnique({
        where: { xenditInvoiceId: processedData.xenditInvoiceId },
        include: {
          pembayaran: true
        }
      });

      if (!xenditPayment) {
        throw new NotFoundError(`Payment not found for invoice ID: ${processedData.xenditInvoiceId}`);
      }

      await prisma.$transaction(async (tx) => {
        await tx.xenditPayment.update({
          where: { id: xenditPayment.id },
          data: {
            xenditPaymentChannel: processedData.paymentMethod,
            xenditStatus: processedData.status,
            xenditPaidAt: processedData.paidAt
          }
        });

        await tx.pembayaran.update({
          where: { id: xenditPayment.pembayaranId },
          data: {
            metodePembayaran: processedData.paymentMethod,
            statusPembayaran: processedData.status,
            tanggalPembayaran: processedData.paidAt ?
              new Date(processedData.paidAt).toISOString().split('T')[0] :
              new Date().toISOString().split('T')[0]
          }
        });
      });

      return {
        success: true,
        payment: {
          id: xenditPayment.pembayaranId,
          statusPembayaran: processedData.status,
          tipePembayaran: xenditPayment.pembayaran.tipePembayaran,
          xenditInvoiceId: processedData.xenditInvoiceId
        }
      };
    } catch (error) {
      logger.error('Error handling Xendit callback:', error);
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
}

module.exports = new PaymentService();