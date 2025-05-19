const { xendit } = require('../config/xendit.config');
const { logger } = require('../config/logger.config');

class XenditUtils {
  static async createInvoice(data) {
    try {
      const {
        externalId,
        amount,
        payerEmail,
        description,
        successRedirectUrl,
        failureRedirectUrl,
        items = [],
        paymentMethods = ['BANK_TRANSFER', 'EWALLET', 'RETAIL_OUTLET', 'CREDIT_CARD', 'QR_CODE']
      } = data;

      const invoiceData = {
        externalId,
        amount,
        payerEmail,
        description,
        invoiceDuration: 86400,
        successRedirectUrl,
        failureRedirectUrl,
        paymentMethods,
        currency: 'IDR',
        shouldSendEmail: true,
        reminderTime: 1,
        items
      };

      const invoice = await xendit.Invoice.createInvoice(invoiceData);
      
      logger.info(`Created Xendit invoice: ${invoice.id}`);
      return invoice;
    } catch (error) {
      logger.error('Error creating Xendit invoice:', error);
      throw error;
    }
  }

  static async getInvoice(invoiceId) {
    try {
      const invoice = await xendit.Invoice.getInvoice({
        invoiceId
      });
      
      return invoice;
    } catch (error) {
      logger.error(`Error getting Xendit invoice ${invoiceId}:`, error);
      throw error;
    }
  }

  static async expireInvoice(invoiceId) {
    try {
      const invoice = await xendit.Invoice.expireInvoice({
        invoiceId
      });
      
      logger.info(`Expired Xendit invoice: ${invoiceId}`);
      return invoice;
    } catch (error) {
      logger.error(`Error expiring Xendit invoice ${invoiceId}:`, error);
      throw error;
    }
  }

  static async createDisbursement(data) {
    try {
      const {
        externalId,
        amount,
        bankCode,
        accountHolderName,
        accountNumber,
        description
      } = data;

      const disbursementData = {
        externalId,
        amount,
        bankCode,
        accountHolderName,
        accountNumber,
        description
      };

      const disbursement = await xendit.Disbursement.create(disbursementData);
      
      logger.info(`Created Xendit disbursement: ${disbursement.id}`);
      return disbursement;
    } catch (error) {
      logger.error('Error creating Xendit disbursement:', error);
      throw error;
    }
  }

  static async getDisbursement(disbursementId) {
    try {
      const disbursement = await xendit.Disbursement.getById({
        disbursementId
      });
      
      return disbursement;
    } catch (error) {
      logger.error(`Error getting Xendit disbursement ${disbursementId}:`, error);
      throw error;
    }
  }

  static generateExternalId(prefix = 'TXN') {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    return `${prefix}-${timestamp}-${random}`;
  }

  static mapXenditInvoiceStatus(xenditStatus) {
    const statusMap = {
      'PENDING': 'PENDING',
      'PAID': 'PAID',
      'SETTLED': 'SETTLED',
      'EXPIRED': 'EXPIRED',
      'FAILED': 'FAILED'
    };

    return statusMap[xenditStatus] || 'PENDING';
  }

  static mapXenditStatusToPembayaran(xenditStatus) {
    const statusMap = {
      'PENDING': 'PENDING',
      'PAID': 'PAID',
      'SETTLED': 'PAID',
      'EXPIRED': 'EXPIRED',
      'FAILED': 'EXPIRED'
    };

    return statusMap[xenditStatus] || 'PENDING';
  }

  static mapXenditDisbursementStatus(xenditStatus) {
    const statusMap = {
      'PENDING': 'PENDING',
      'COMPLETED': 'COMPLETED',
      'FAILED': 'FAILED'
    };

    return statusMap[xenditStatus] || 'PENDING';
  }

  static validateCallbackSignature(rawBody, callbackToken, xenditCallbackToken) {
    return callbackToken === xenditCallbackToken;
  }

  static processInvoiceCallback(callbackData) {
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

  static processDisbursementCallback(callbackData) {
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
}

module.exports = XenditUtils;