const { prisma } = require('../../lib/config/prisma.config');
const { logger } = require('../../lib/config/logger.config');
const { xenditConfig } = require('../../lib/config/xendit.config');
const { NotFoundError, BadRequestError } = require('../../lib/http/errors.http');
const PrismaUtils = require('../../lib/utils/prisma.utils');
const axios = require('axios');

class PaymentService {
  constructor() {
    this.baseURL = xenditConfig.getBaseURL();
    this.axiosConfig = xenditConfig.getAxiosConfig();
  }

  async createInvoice(data) {
    try {


      const {
        externalId,
        amount,
        payerEmail,
        description,
        successRedirectUrl,
        failureRedirectUrl,
        items = [],
        paymentMethods = [
            "CREDIT_CARD", "BCA", "BNI", "BRI", 
            "MANDIRI", "BSI", "PERMATA", 
            "ALFAMART", "INDOMARET"
        ],
      } = data;

      const invoiceData = {
        external_id: externalId,
        amount,
        payer_email: payerEmail,
        description,
        invoice_duration: 86400,
        success_redirect_url: successRedirectUrl,
        failure_redirect_url: failureRedirectUrl,
        payment_methods: paymentMethods,
        
        currency: 'IDR',
        should_send_email: true,
        reminder_time: 1,
        items
      };

      logger.info('Creating Xendit invoice with data:', JSON.stringify(invoiceData, null, 2));

      const response = await axios({
        ...this.axiosConfig,
        method: 'POST',
        url: `${this.baseURL}/v2/invoices`,
        data: invoiceData
      });

      logger.info('Xendit invoice created successfully:', response.data);
      return response.data;
    } catch (error) {
      logger.error('Failed to create Xendit invoice:', error.response?.data || error.message);



      throw error;
    }
  }



  async getInvoice(invoiceId) {
    try {
      const response = await axios({
        ...this.axiosConfig,
        method: 'GET',
        url: `${this.baseURL}/v2/invoices/${invoiceId}`
      });

      return response.data;
    } catch (error) {
      logger.error(`Error getting Xendit invoice ${invoiceId}:`, error.response?.data || error.message);
      throw error;
    }
  }

  async expireInvoice(invoiceId) {
    try {
      const response = await axios({
        ...this.axiosConfig,
        method: 'POST',
        url: `${this.baseURL}/v2/invoices/${invoiceId}/expire`
      });

      logger.info(`Expired Xendit invoice: ${invoiceId}`);
      return response.data;
    } catch (error) {
      logger.error(`Error expiring Xendit invoice ${invoiceId}:`, error.response?.data || error.message);
      throw error;
    }
  }

  async createDisbursement(data) {
    try {
      const {
        externalId,
        amount,
        bankCode,
        accountHolderName,
        accountNumber,
        description,
        emailTo = [],
        emailCC = []
      } = data;

      const disbursementData = {
        external_id: externalId,
        amount,
        bank_code: bankCode,
        account_holder_name: accountHolderName,
        account_number: accountNumber,
        description,
        email_to: emailTo,
        email_cc: emailCC
      };

      logger.info('Creating Xendit disbursement with data:', JSON.stringify(disbursementData, null, 2));

      const response = await axios({
        ...this.axiosConfig,
        method: 'POST',
        url: `${this.baseURL}/disbursements`,
        data: disbursementData
      });

      logger.info('Xendit disbursement created successfully:', response.data);
      return response.data;
    } catch (error) {
      logger.error('Failed to create Xendit disbursement:', error.response?.data || error.message);
      throw error;
    }
  }

  async getDisbursement(disbursementId) {
    try {
      const response = await axios({
        ...this.axiosConfig,
        method: 'GET',
        url: `${this.baseURL}/disbursements/${disbursementId}`
      });

      return response.data;
    } catch (error) {
      logger.error(`Error getting Xendit disbursement ${disbursementId}:`, error.response?.data || error.message);
      throw error;
    }
  }

  generateExternalId(prefix = 'PAY') {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    return `${prefix}-${timestamp}-${random}`;
  }

  mapXenditInvoiceStatus(xenditStatus) {
    const statusMap = {
      'PENDING': 'PENDING',
      'PAID': 'PAID',
      'SETTLED': 'SETTLED',
      'EXPIRED': 'EXPIRED',
      'FAILED': 'EXPIRED'
    };

    return statusMap[xenditStatus] || 'PENDING';
  }

  mapXenditStatusToPembayaran(xenditStatus) {
    const statusMap = {
      'PENDING': 'PENDING',
      'PAID': 'PAID',
      'SETTLED': 'PAID',
      'EXPIRED': 'EXPIRED',
      'FAILED': 'EXPIRED'
    };

    return statusMap[xenditStatus] || 'PENDING';
  }

  mapXenditDisbursementStatus(xenditStatus) {
    const statusMap = {
      'PENDING': 'PENDING',
      'COMPLETED': 'COMPLETED',
      'FAILED': 'FAILED'
    };

    return statusMap[xenditStatus] || 'PENDING';
  }

  processInvoiceCallback(callbackData) {
    return {
      invoiceId: callbackData.id,
      externalId: callbackData.external_id,
      status: this.mapXenditInvoiceStatus(callbackData.status),
      paidAmount: callbackData.paid_amount || 0,
      paidAt: callbackData.paid_at,
      paymentChannel: callbackData.payment_channel,
      paymentMethod: callbackData.payment_method,
      paymentDestination: callbackData.payment_destination,
      bankCode: callbackData.bank_code,
      eventType: 'invoice.paid'
    };
  }

  processDisbursementCallback(callbackData) {
    return {
      disbursementId: callbackData.id,
      externalId: callbackData.external_id,
      status: this.mapXenditDisbursementStatus(callbackData.status),
      amount: callbackData.amount,
      bankCode: callbackData.bank_code,
      accountHolderName: callbackData.account_holder_name,
      eventType: 'disbursement.completed'
    };
  }

  async processInvoiceCallback(callbackData, rawBody, callbackToken) {
    try {
      if (!xenditConfig.validateCallbackToken(callbackToken)) {
        throw new BadRequestError('Invalid callback token');
      }

      logger.info(`Processing Xendit invoice callback: ${callbackData.id}`);

      const processedData = this.processInvoiceCallback(callbackData);

      const xenditPayment = await prisma.xenditPayment.findUnique({
        where: { xenditInvoiceId: processedData.invoiceId },
        include: {
          pembayaran: {
            include: {
              pendaftaran: true,
              periodeSpp: true
            }
          }
        }
      });

      if (!xenditPayment) {
        logger.warn(`Xendit payment not found for invoice: ${processedData.invoiceId}`);
        return null;
      }

      await prisma.$transaction(async (tx) => {
        // Check if this is a temp registration payment
        const tempData = global.tempRegistrations?.[xenditPayment.pembayaranId];

        await tx.xenditCallbackInvoice.create({
          data: {
            xenditPaymentId: xenditPayment.id,
            eventType: processedData.eventType,
            rawResponse: rawBody,
            amount: processedData.paidAmount,
            status: processedData.status
          }
        });

        await tx.xenditPayment.update({
          where: { id: xenditPayment.id },
          data: {
            xenditStatus: processedData.status,
            xenditPaidAt: processedData.paidAt
          }
        });

        const newPaymentStatus = this.mapXenditStatusToPembayaran(processedData.status);

        await tx.pembayaran.update({
          where: { id: xenditPayment.pembayaranId },
          data: {
            statusPembayaran: newPaymentStatus
          }
        });

        if (processedData.status === 'PAID' || processedData.status === 'SETTLED') {
          // If this is a temp registration, complete the registration
          if (tempData && tempData.isTemporary) {
            const siswaService = require('./siswa.service');
            await siswaService.completeRegistrationFromCallback(processedData);
          } else {
            // Handle normal payment status updates
            if (xenditPayment.pembayaran.pendaftaran) {
              await tx.pendaftaran.update({
                where: { id: xenditPayment.pembayaran.pendaftaran.id },
                data: {
                  statusVerifikasi: 'DIVERIFIKASI'
                }
              });
            }

            if (xenditPayment.pembayaran.periodeSpp) {
              await tx.periodeSpp.update({
                where: { id: xenditPayment.pembayaran.periodeSpp.id },
                data: {
                  statusPembayaran: 'PAID'
                }
              });
            }
          }
        }
      });

      logger.info(`Successfully processed invoice callback: ${processedData.invoiceId}`);
      return processedData;
    } catch (error) {
      logger.error('Error processing invoice callback:', error);
      throw error;
    }
  }

  async retryFailedPayment(paymentId) {
    try {
      const payment = await prisma.pembayaran.findUnique({
        where: { id: paymentId },
        include: {
          xenditPayment: true,
          pendaftaran: {
            include: {
              siswa: true
            }
          },
          periodeSpp: {
            include: {
              programSiswa: {
                include: {
                  siswa: true
                }
              }
            }
          }
        }
      });

      if (!payment?.xenditPayment) {
        throw new NotFoundError('Payment or Xendit payment not found');
      }

      if (payment.xenditPayment.xenditStatus !== 'EXPIRED' &&
        payment.xenditPayment.xenditStatus !== 'FAILED') {
        throw new BadRequestError('Payment is not in failed or expired state');
      }

      const externalId = this.generateExternalId('RETRY');
      let description = 'Retry payment';
      let payerEmail = 'user@example.com';
      let successRedirectUrl = `${process.env.FRONTEND_URL}/payment/success`;
      let failureRedirectUrl = `${process.env.FRONTEND_URL}/payment/failure`;

      if (payment.pendaftaran) {
        description = `Retry pendaftaran ${payment.pendaftaran.siswa.namaMurid}`;
        payerEmail = payment.pendaftaran.siswa.user?.email || payerEmail;
      } else if (payment.periodeSpp) {
        description = `Retry SPP ${payment.periodeSpp.bulan} ${payment.periodeSpp.tahun}`;
        payerEmail = payment.periodeSpp.programSiswa.siswa.user?.email || payerEmail;
      }

      const newInvoice = await this.createInvoice({
        externalId,
        amount: Number(payment.jumlahTagihan),
        payerEmail,
        description,
        successRedirectUrl,
        failureRedirectUrl
      });

      await prisma.$transaction(async (tx) => {
        await tx.xenditPayment.update({
          where: { id: payment.xenditPayment.id },
          data: {
            xenditStatus: 'EXPIRED'
          }
        });

        const newXenditPayment = await tx.xenditPayment.create({
          data: {
            pembayaranId: payment.id,
            xenditInvoiceId: newInvoice.id,
            xenditExternalId: externalId,
            xenditPaymentUrl: newInvoice.invoice_url,
            xenditPaymentChannel: newInvoice.payment_method || 'MULTIPLE',
            xenditExpireDate: newInvoice.expiry_date,
            xenditStatus: 'PENDING'
          }
        });

        await tx.pembayaran.update({
          where: { id: payment.id },
          data: {
            statusPembayaran: 'PENDING'
          }
        });
      });

      logger.info(`Created retry payment for payment ID: ${paymentId}`);
      return {
        paymentUrl: newInvoice.invoice_url,
        externalId,
        expiredAt: newInvoice.expiry_date
      };
    } catch (error) {
      logger.error(`Error retrying payment ${paymentId}:`, error);
      throw error;
    }
  }

  async getPaymentHistory(filters = {}) {
    try {
      const { page = 1, limit = 10, status, tipePembayaran, metodePembayaran } = filters;

      const where = {};
      if (status) {
        where.statusPembayaran = status;
      }
      if (tipePembayaran) {
        where.tipePembayaran = tipePembayaran;
      }
      if (metodePembayaran) {
        where.metodePembayaran = metodePembayaran;
      }

      return await PrismaUtils.paginate(prisma.pembayaran, {
        page,
        limit,
        where,
        include: {
          xenditPayment: true,
          pendaftaran: {
            include: {
              siswa: true
            }
          },
          periodeSpp: {
            include: {
              programSiswa: {
                include: {
                  siswa: true
                }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });
    } catch (error) {
      logger.error('Error getting payment history:', error);
      throw error;
    }
  }

  async getPaymentDetails(paymentId) {
    try {
      const payment = await prisma.pembayaran.findUnique({
        where: { id: paymentId },
        include: {
          xenditPayment: {
            include: {
              xenditCallbackInvoice: {
                orderBy: { createdAt: 'desc' }
              }
            }
          },
          pendaftaran: {
            include: {
              siswa: true,
              voucher: true
            }
          },
          periodeSpp: {
            include: {
              programSiswa: {
                include: {
                  siswa: true,
                  program: true
                }
              },
              voucher: true
            }
          }
        }
      });

      if (!payment) {
        throw new NotFoundError(`Payment dengan ID ${paymentId} tidak ditemukan`);
      }

      return payment;
    } catch (error) {
      logger.error(`Error getting payment details ${paymentId}:`, error);
      throw error;
    }
  }

  async getCallbackHistory(externalId) {
    try {
      const xenditPayment = await prisma.xenditPayment.findFirst({
        where: { xenditExternalId: externalId },
        include: {
          xenditCallbackInvoice: {
            orderBy: { createdAt: 'desc' }
          }
        }
      });

      return xenditPayment?.xenditCallbackInvoice || [];
    } catch (error) {
      logger.error(`Error getting callback history for ${externalId}:`, error);
      throw error;
    }
  }
}

module.exports = new PaymentService();