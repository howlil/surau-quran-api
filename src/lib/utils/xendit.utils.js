const { xendit } = require('../config/xendit.config');
const { logger } = require('../config/logger.config');

class XenditUtils {
  static async createInvoice(data) {
    try {
      if (!xendit) {
        throw new Error('Xendit client not available or not properly initialized');
      }

      // First get the Invoice API instance
      const Invoice = xendit.Invoice;

      if (!Invoice) {
        throw new Error('Xendit Invoice API not available');
      }

      // Validate required parameters
      if (!data) {
        throw new Error('Invoice data is required');
      }

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

      // Validate each required parameter individually
      if (!externalId) {
        throw new Error('externalId is required for invoice creation');
      }

      if (amount === undefined || amount === null) {
        throw new Error('amount is required for invoice creation');
      }

      if (!payerEmail) {
        throw new Error('payerEmail is required for invoice creation');
      }

      if (!description) {
        throw new Error('description is required for invoice creation');
      }

      // Format data according to Xendit's API requirements - use camelCase and proper naming
      const invoiceParams = {
        externalID: externalId,
        amount: Number(amount),
        payerEmail: payerEmail,
        description: description,
        invoiceDuration: 86400,
        currency: 'IDR',
        reminderTime: 1,
      };

      // Only add optional parameters if they are present
      if (successRedirectUrl) {
        invoiceParams.successRedirectURL = successRedirectUrl;
      }

      if (failureRedirectUrl) {
        invoiceParams.failureRedirectURL = failureRedirectUrl;
      }

      if (items && items.length > 0) {
        invoiceParams.items = items;
      }

      if (paymentMethods && paymentMethods.length > 0) {
        invoiceParams.paymentMethods = paymentMethods;
      }

      // Set email sending preference
      invoiceParams.shouldSendEmail = true;

      // Log the exact parameters being sent
      logger.debug('Creating Xendit invoice with params:', JSON.stringify(invoiceParams, null, 2));

      // Create invoice with properly formatted params
      const invoice = await Invoice.createInvoice(invoiceParams);

      // Log the response for debugging
      logger.debug('Xendit invoice response:', JSON.stringify(invoice, null, 2));
      logger.info(`Created Xendit invoice: ${invoice.id}`);

      return invoice;
    } catch (error) {
      logger.error('Error creating Xendit invoice:', error);
      throw error;
    }
  }

  static async getInvoice(invoiceId) {
    try {
      if (!xendit) {
        throw new Error('Xendit client not available or not properly initialized');
      }

      const Invoice = xendit.Invoice;

      if (!Invoice) {
        throw new Error('Xendit Invoice API not available');
      }

      const invoice = await Invoice.getInvoice({
        invoiceID: invoiceId
      });

      return invoice;
    } catch (error) {
      logger.error(`Error getting Xendit invoice ${invoiceId}:`, error);
      throw error;
    }
  }

  static async expireInvoice(invoiceId) {
    try {
      if (!xendit) {
        throw new Error('Xendit client not available or not properly initialized');
      }

      const Invoice = xendit.Invoice;

      if (!Invoice) {
        throw new Error('Xendit Invoice API not available');
      }

      const invoice = await Invoice.expireInvoice({
        invoiceID: invoiceId
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
      if (!xendit || !xendit.Disbursement) {
        throw new Error('Xendit client not available or not properly initialized');
      }

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
      if (!xendit || !xendit.Disbursement) {
        throw new Error('Xendit client not available or not properly initialized');
      }

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

  static mapXenditStatus(xenditStatus) {
    const statusMap = {
      'PENDING': 'PENDING',
      'PAID': 'LUNAS',
      'SETTLED': 'LUNAS',
      'EXPIRED': 'KADALUARSA',
      'FAILED': 'DIBATALKAN'
    };

    return statusMap[xenditStatus] || 'PENDING';
  }

  static validateCallbackSignature(rawBody, callbackToken, xenditCallbackToken) {
    return callbackToken === xenditCallbackToken;
  }

  static processInvoiceCallback(callbackData) {
    return {
      xenditInvoiceId: callbackData.id,
      externalId: callbackData.external_id,
      status: callbackData.status,
      paidAt: callbackData.paid_at,
      paymentMethod: callbackData.payment_method,
      amount: callbackData.amount
    };
  }

  static processDisbursementCallback(callbackData) {
    if (!callbackData) {
      throw new Error('Invalid callback data');
    }

    return {
      disbursementId: callbackData.id,
      externalId: callbackData.external_id,
      status: callbackData.status,
      amount: callbackData.amount,
      bankCode: callbackData.bank_code,
      accountHolderName: callbackData.account_holder_name,
      eventType: 'disbursement.completed'
    };
  }
}

module.exports = XenditUtils;