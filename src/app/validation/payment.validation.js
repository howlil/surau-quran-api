const Joi = require('joi');
const ValidatorFactory = require('./factory.validation');

class PaymentValidation {
  static invoiceCallback() {
    return ValidatorFactory.create({
      id: Joi.string().required(),
      external_id: Joi.string().required(),
      status: Joi.string().valid('PENDING', 'PAID', 'SETTLED', 'EXPIRED', 'FAILED').required(),
      paid_amount: Joi.number().optional(),
      paid_at: Joi.string().optional(),
      payment_channel: Joi.string().optional(),
      payment_method: Joi.string().optional(),
      payment_destination: Joi.string().optional(),
      bank_code: Joi.string().optional()
    });
  }

  static retryPayment() {
    return ValidatorFactory.create({
      paymentId: Joi.string().required()
        .messages({
          'string.empty': 'Payment ID tidak boleh kosong',
          'any.required': 'Payment ID wajib diisi'
        })
    });
  }

  static getPaymentHistory() {
    return ValidatorFactory.create({
      page: Joi.number().integer().min(1).default(1)
        .messages({
          'number.base': 'Halaman harus berupa angka',
          'number.integer': 'Halaman harus berupa bilangan bulat',
          'number.min': 'Halaman minimal 1'
        }),
      limit: Joi.number().integer().min(1).max(100).default(10)
        .messages({
          'number.base': 'Batas harus berupa angka',
          'number.integer': 'Batas harus berupa bilangan bulat',
          'number.min': 'Batas minimal 1',
          'number.max': 'Batas maksimal 100'
        }),
      status: Joi.string().valid('UNPAID', 'PENDING', 'PAID', 'SETTLED', 'EXPIRED', 'INACTIVE', 'ACTIVE', 'STOPPED').optional(),
      tipePembayaran: Joi.string().valid('PENDAFTARAN', 'SPP').optional(),
      metodePembayaran: Joi.string().valid('TUNAI', 'VIRTUAL_ACCOUNT', 'EWALLET', 'RETAIL_OUTLET', 'CREDIT_CARD', 'QR_CODE').optional()
    });
  }

  static getPaymentDetails() {
    return ValidatorFactory.create({
      paymentId: Joi.string().required()
        .messages({
          'string.empty': 'Payment ID tidak boleh kosong',
          'any.required': 'Payment ID wajib diisi'
        })
    });
  }

  static getCallbackHistory() {
    return ValidatorFactory.create({
      externalId: Joi.string().required()
        .messages({
          'string.empty': 'External ID tidak boleh kosong',
          'any.required': 'External ID wajib diisi'
        })
    });
  }

  static checkPaymentStatus() {
    return ValidatorFactory.create({
      invoiceId: Joi.string().required()
        .messages({
          'string.empty': 'Invoice ID tidak boleh kosong',
          'any.required': 'Invoice ID wajib diisi'
        })
    });
  }

  static expirePayment() {
    return ValidatorFactory.create({
      invoiceId: Joi.string().required()
        .messages({
          'string.empty': 'Invoice ID tidak boleh kosong',
          'any.required': 'Invoice ID wajib diisi'
        })
    });
  }
}

module.exports = PaymentValidation;