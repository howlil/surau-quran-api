const { xendit } = require('../config/xendit.config');
const { logger } = require('../config/logger.config');

class XenditUtils {
  static async createInvoice(data) {
    try {

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
        paymentMethods = [
          "CREDIT_CARD", "BCA", "BNI", "BRI",
          "MANDIRI", "BSI", "PERMATA",
          "ALFAMART", "INDOMARET"
        ],
      } = data;

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


      const invoiceParams = {
        externalId: externalId,
        amount: Number(amount),
        payerEmail: payerEmail,
        description: description,
        invoiceDuration: 7200,
        currency: 'IDR',
        reminderTime: 1,
        shouldSendEmail: true
      };

      if (successRedirectUrl) {
        invoiceParams.successRedirectUrl = successRedirectUrl;  // camelCase
      }

      if (failureRedirectUrl) {
        invoiceParams.failureRedirectUrl = failureRedirectUrl;  // camelCase
      }

      if (items && items.length > 0) {
        invoiceParams.items = items.map(item => ({
          name: item.name,
          quantity: Number(item.quantity),
          price: Number(item.price),
          category: item.category || 'FEES'
        }));
      }

      if (paymentMethods && paymentMethods.length > 0) {
        invoiceParams.paymentMethods = paymentMethods;
      }

      let invoice;

      try {
        invoice = await xendit.Invoice.createInvoice({ data: invoiceParams });
      } catch (err) {
        logger.error('Error creating Xendit invoice:', err);
        throw new Error(`Failed to create Xendit invoice: ${err.message}`);
      }

      logger.info(`Created Xendit invoice: ${invoice.id}`);

      return invoice;

    } catch (error) {
      logger.error(`Error creating Xendit invoice: ${error.message}`);

      if (error.response) {
        logger.error('Xendit API Response:', {
          status: error.status,
          errorCode: error.errorCode,
          errorMessage: error.errorMessage,
          errors: error.response.errors,
          rawResponse: JSON.stringify(error.response, null, 2)
        });

        if (error.response.errors && Array.isArray(error.response.errors)) {
          error.response.errors.forEach((err, index) => {
            logger.error(`Validation Error ${index + 1}:`, {
              field: err.field || err.path || 'unknown',
              message: err.message || 'no message',
              code: err.code || 'no code',
              fullError: JSON.stringify(err, null, 2)
            });
          });
        }
      }

      throw error;
    }
  }

  static async getAllInvoice() {
    try {
      const invoice = await xendit.Invoice.getInvoices();

      return invoice;
    } catch (error) {
      logger.error(`Error getting Xendit invoice `, error);
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