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
        customer,
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

      // Validasi amount minimal 1000 (requirement Xendit)
      if (Number(amount) < 1000) {
        throw new Error('Amount minimal Rp 1.000 untuk pembayaran Xendit');
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

      // Add customer data if provided
      if (customer) {
        invoiceParams.customer = {
          givenNames: customer.givenNames || 'Customer',
          email: customer.email || payerEmail,
          mobileNumber: customer.phoneNumber || customer.mobileNumber || '08123456789',
          address: customer.address || 'Alamat tidak tersedia'
        };
      }

      // Log invoice params untuk debugging
      logger.info('Sending invoice params to Xendit:', {
        externalId: invoiceParams.externalId,
        amount: invoiceParams.amount,
        customer: invoiceParams.customer || 'No customer data',
        description: invoiceParams.description,
        items: invoiceParams.items || 'No items',
        paymentMethods: invoiceParams.paymentMethods || 'Default methods'
      });

      let invoice;

      try {
        logger.info('Calling Xendit API with params:', JSON.stringify(invoiceParams, null, 2));
        invoice = await xendit.Invoice.createInvoice({ data: invoiceParams });
      } catch (err) {
        logger.error('Error creating Xendit invoice:', {
          message: err.message,
          status: err.status,
          errorCode: err.errorCode,
          errorMessage: err.errorMessage,
          response: err.response ? JSON.stringify(err.response, null, 2) : 'No response'
        });
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

}

module.exports = XenditUtils;