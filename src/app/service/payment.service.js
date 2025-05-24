const { prisma } = require('../../lib/config/prisma.config');
const { logger } = require('../../lib/config/logger.config');
const XenditUtils = require('../../lib/utils/xendit.utils');
const { NotFoundError } = require('../../lib/http/errors.http');

class PaymentService {
  async createPendaftaranInvoice(data) {
    try {
      const { email, namaMurid, totalBiaya } = data;

      const externalId = XenditUtils.generateExternalId('DAFTAR');

      const invoiceData = {
        externalId,
        amount: Number(totalBiaya),
        payerEmail: email,
        description: `Pembayaran Pendaftaran - ${namaMurid}`,
        successRedirectUrl: process.env.XENDIT_SUCCESS_REDIRECT_URL || 'https://example.com/success',
        failureRedirectUrl: process.env.XENDIT_FAILURE_REDIRECT_URL || 'https://example.com/failure',
        items: [{
          name: 'Biaya Pendaftaran',
          quantity: 1,
          price: Number(totalBiaya)
        }]
      };

      if (!invoiceData.externalId || !invoiceData.amount || !invoiceData.payerEmail || !invoiceData.description) {
        logger.error('Missing required fields in invoiceData:', JSON.stringify(invoiceData, null, 2));
        throw new Error('Missing required fields for invoice creation');
      }

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
      logger.error('Error stack:', error.stack);
      throw error;
    }
  }

  async createSppInvoice(data) {
    try {
      const { email, namaSiswa, totalBiaya, periodeSppId, successRedirectUrl, failureRedirectUrl } = data;

      const externalId = XenditUtils.generateExternalId('SPP');

      const invoiceData = {
        externalId,
        amount: Number(totalBiaya),
        payerEmail: email,
        description: `Pembayaran SPP - ${namaSiswa}`,
        successRedirectUrl,
        failureRedirectUrl,
        items: [{
          name: 'SPP Bulanan',
          quantity: 1,
          price: Number(totalBiaya)
        }]
      };

      const xenditInvoice = await XenditUtils.createInvoice(invoiceData);

      const pembayaran = await prisma.pembayaran.create({
        data: {
          tipePembayaran: 'SPP',
          metodePembayaran: 'VIRTUAL_ACCOUNT',
          jumlahTagihan: Number(totalBiaya),
          statusPembayaran: 'PENDING',
          tanggalPembayaran: new Date().toISOString().split('T')[0]
        }
      });

      await prisma.xenditPayment.create({
        data: {
          pembayaranId: pembayaran.id,
          xenditInvoiceId: xenditInvoice.id,
          xenditExternalId: externalId,
          xenditPaymentUrl: xenditInvoice.invoice_url,
          xenditPaymentChannel: 'VIRTUAL_ACCOUNT',
          xenditExpireDate: xenditInvoice.expiry_date,
          xenditStatus: 'PENDING'
        }
      });

      await prisma.periodeSpp.update({
        where: { id: periodeSppId },
        data: { pembayaranId: pembayaran.id }
      });

      return {
        pembayaranId: pembayaran.id,
        xenditInvoiceUrl: xenditInvoice.invoice_url,
        expireDate: xenditInvoice.expiry_date,
        amount: Number(totalBiaya),
        xenditInvoiceId: xenditInvoice.id
      };
    } catch (error) {
      logger.error('Error creating SPP invoice:', error);
      throw error;
    }
  }

  async handleXenditCallback(callbackData) {
    try {
      const processedData = XenditUtils.processInvoiceCallback(callbackData);

      logger.info('Processing Xendit callback:', JSON.stringify(callbackData, null, 2));

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
          statusPembayaran: xenditPayment.pembayaran.statusPembayaran,
          tipePembayaran: xenditPayment.pembayaran.tipePembayaran,
          xenditInvoiceId: processedData.xenditInvoiceId
        }
      };
    } catch (error) {
      logger.error('Error handling Xendit callback:', error);
      throw error;
    }
  }


}

module.exports = new PaymentService();