const { prisma } = require('../../lib/config/prisma.config');
const { logger } = require('../../lib/config/logger.config');
const XenditUtils = require('../../lib/utils/xendit.utils');
const { NotFoundError, BadRequestError } = require('../../lib/http/errors.http');

class PaymentService {
  async createPendaftaranInvoice(data) {
    try {
      const { email, namaMurid, totalBiaya, successRedirectUrl, failureRedirectUrl } = data;

      logger.debug('Creating pendaftaran invoice with data:', JSON.stringify({
        email,
        namaMurid,
        totalBiaya,
        successRedirectUrl,
        failureRedirectUrl
      }, null, 2));

      const externalId = XenditUtils.generateExternalId('DAFTAR');
      logger.debug('Generated external ID:', externalId);

      const invoiceData = {
        externalId,
        amount: Number(totalBiaya),
        payerEmail: email,
        description: `Pembayaran Pendaftaran - ${namaMurid}`,
        successRedirectUrl,
        failureRedirectUrl,
        items: [{
          name: 'Biaya Pendaftaran',
          quantity: 1,
          price: Number(totalBiaya)
        }]
      };

      logger.debug('Constructed invoice data:', JSON.stringify(invoiceData, null, 2));

      if (!invoiceData.externalId || !invoiceData.amount || !invoiceData.payerEmail || !invoiceData.description) {
        logger.error('Missing required fields in invoiceData:', invoiceData);
        throw new Error('Missing required fields for invoice creation');
      }

      logger.debug('Invoice data before sending to Xendit:', JSON.stringify(invoiceData, null, 2));

      const xenditInvoice = await XenditUtils.createInvoice(invoiceData);

     
      const pembayaran = await prisma.pembayaran.create({
        data: {
          tipePembayaran: 'PENDAFTARAN',
          metodePembayaran: 'VIRTUAL_ACCOUNT',
          jumlahTagihan: Number(totalBiaya),
          statusPembayaran: 'PENDING',
          tanggalPembayaran: new Date().toISOString().split('T')[0]
        }
      });

      // Handle different possible response formats from Xendit
      // The invoice URL field might be named differently
      const invoiceUrl = xenditInvoice.invoice_url ||
        xenditInvoice.invoiceUrl ||
        xenditInvoice.url ||
        xenditInvoice.xendit_url ||
        `https://checkout.xendit.co/v2/invoices/${xenditInvoice.id}`;

      // The expiry date field might also be named differently
      // Ensure it's always converted to ISO string format
      let expiryDate = xenditInvoice.expiry_date ||
        xenditInvoice.expiryDate ||
        xenditInvoice.expires_at ||
        xenditInvoice.expiresAt;

      // Convert to ISO string if it's not already a string
      if (expiryDate) {
        expiryDate = typeof expiryDate === 'string' ? expiryDate : new Date(expiryDate).toISOString();
      } else {
        // Default to 24 hours from now
        expiryDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      }

      // Log what we're using
      logger.debug('Using invoice URL:', invoiceUrl);
      logger.debug('Using expiry date:', expiryDate);

      // Create xendit payment record with proper field mapping
      await prisma.xenditPayment.create({
        data: {
          pembayaranId: pembayaran.id,
          xenditInvoiceId: xenditInvoice.id,
          xenditExternalId: externalId,
          xenditPaymentUrl: invoiceUrl, // This field is required
          xenditPaymentChannel: 'VIRTUAL_ACCOUNT',
          xenditExpireDate: expiryDate, // Now guaranteed to be a string
          xenditStatus: xenditInvoice.status || 'PENDING'
        }
      });

      return {
        pembayaranId: pembayaran.id,
        xenditInvoiceUrl: invoiceUrl,
        expireDate: expiryDate,
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

      const xenditPayment = await prisma.xenditPayment.findUnique({
        where: { xenditInvoiceId: processedData.xenditInvoiceId },
        include: {
          pembayaran: true
        }
      });

      if (!xenditPayment) {
        throw new NotFoundError(`Payment not found for invoice ID: ${processedData.xenditInvoiceId}`);
      }

      const mappedStatus = XenditUtils.mapXenditStatus(processedData.status);

      await prisma.$transaction(async (tx) => {
        await tx.xenditPayment.update({
          where: { id: xenditPayment.id },
          data: {
            xenditStatus: processedData.status,
            xenditPaidAt: processedData.paidAt
          }
        });

        await tx.pembayaran.update({
          where: { id: xenditPayment.pembayaranId },
          data: {
            statusPembayaran: mappedStatus,
            tanggalPembayaran: processedData.paidAt ?
              new Date(processedData.paidAt).toISOString().split('T')[0] :
              new Date().toISOString().split('T')[0]
          }
        });
      });

      logger.info(`Updated payment status for invoice ${processedData.xenditInvoiceId} to ${mappedStatus}`);

      return {
        success: true,
        payment: {
          id: xenditPayment.pembayaranId,
          statusPembayaran: mappedStatus,
          tipePembayaran: xenditPayment.pembayaran.tipePembayaran,
          xenditInvoiceId: processedData.xenditInvoiceId
        }
      };
    } catch (error) {
      logger.error('Error handling Xendit callback:', error);
      throw error;
    }
  }

  async getPaymentStatus(pembayaranId) {
    try {
      const payment = await prisma.pembayaran.findUnique({
        where: { id: pembayaranId },
        include: {
          xenditPayment: true,
          pendaftaran: {
            include: {
              siswa: {
                select: {
                  namaMurid: true
                }
              }
            }
          },
          periodeSpp: {
            include: {
              programSiswa: {
                include: {
                  siswa: {
                    select: {
                      namaMurid: true
                    }
                  }
                }
              }
            }
          }
        }
      });

      if (!payment) {
        throw new NotFoundError(`Payment dengan ID ${pembayaranId} tidak ditemukan`);
      }

      let customerName = 'Unknown';
      if (payment.pendaftaran?.siswa?.namaMurid) {
        customerName = payment.pendaftaran.siswa.namaMurid;
      } else if (payment.periodeSpp?.programSiswa?.siswa?.namaMurid) {
        customerName = payment.periodeSpp.programSiswa.siswa.namaMurid;
      }

      return {
        id: payment.id,
        tipePembayaran: payment.tipePembayaran,
        metodePembayaran: payment.metodePembayaran,
        jumlahTagihan: payment.jumlahTagihan,
        statusPembayaran: payment.statusPembayaran,
        tanggalPembayaran: payment.tanggalPembayaran,
        customerName,
        xenditInfo: payment.xenditPayment ? {
          invoiceUrl: payment.xenditPayment.xenditPaymentUrl,
          expireDate: payment.xenditPayment.xenditExpireDate,
          paidAt: payment.xenditPayment.xenditPaidAt,
          status: payment.xenditPayment.xenditStatus
        } : null
      };
    } catch (error) {
      logger.error(`Error getting payment status for ID ${pembayaranId}:`, error);
      throw error;
    }
  }

  async expirePayment(pembayaranId) {
    try {
      const payment = await prisma.pembayaran.findUnique({
        where: { id: pembayaranId },
        include: {
          xenditPayment: true
        }
      });

      if (!payment) {
        throw new NotFoundError(`Payment dengan ID ${pembayaranId} tidak ditemukan`);
      }

      if (payment.statusPembayaran === 'PAID') {
        throw new BadRequestError('Cannot expire a paid payment');
      }

      await prisma.$transaction(async (tx) => {
        if (payment.xenditPayment) {
          try {
            await XenditUtils.expireInvoice(payment.xenditPayment.xenditInvoiceId);
          } catch (error) {
            logger.warn(`Failed to expire Xendit invoice: ${error.message}`);
          }

          await tx.xenditPayment.update({
            where: { id: payment.xenditPayment.id },
            data: { xenditStatus: 'EXPIRED' }
          });
        }

        await tx.pembayaran.update({
          where: { id: pembayaranId },
          data: { statusPembayaran: 'EXPIRED' }
        });
      });

      logger.info(`Expired payment with ID: ${pembayaranId}`);
      return { success: true };
    } catch (error) {
      logger.error(`Error expiring payment with ID ${pembayaranId}:`, error);
      throw error;
    }
  }
}

module.exports = new PaymentService();