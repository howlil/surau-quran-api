// src/app/validation/payment.validation.js
const Joi = require('joi');
const ValidatorFactory = require('./factory.validation');

class PaymentValidation {
  static createSppPayment() {
    return ValidatorFactory.create({
      periodeSppIds: Joi.array().items(
        Joi.string().guid({ version: 'uuidv4' }).required()
          .messages({
            'string.guid': 'ID periode SPP harus berupa UUID yang valid'
          })
      ).min(1).max(12).required()
        .messages({
          'array.min': 'Minimal harus memilih 1 periode SPP',
          'array.max': 'Maksimal dapat memilih 12 periode SPP sekaligus',
          'any.required': 'Periode SPP wajib dipilih'
        }),
      kodeVoucher: Joi.string().uppercase().min(3).max(50).optional()
        .messages({
          'string.min': 'Kode voucher minimal 3 karakter',
          'string.max': 'Kode voucher maksimal 50 karakter'
        })
    });
  }

  static xenditCallback() {
    return ValidatorFactory.create({
      id: Joi.string().required()
        .messages({
          'any.required': 'Invoice ID wajib diisi'
        }),
      external_id: Joi.string().required()
        .messages({
          'any.required': 'External ID wajib diisi'
        }),
      status: Joi.string().valid('PENDING', 'PAID', 'SETTLED', 'EXPIRED', 'FAILED').required()
        .messages({
          'any.only': 'Status harus salah satu dari: PENDING, PAID, SETTLED, EXPIRED, FAILED',
          'any.required': 'Status wajib diisi'
        }),
      amount: Joi.number().positive().required()
        .messages({
          'number.positive': 'Amount harus lebih dari 0',
          'any.required': 'Amount wajib diisi'
        }),
      paid_at: Joi.string().optional(),
      payment_method: Joi.string().optional(),
      payment_channel: Joi.string().optional()
    });
  }
}

module.exports = PaymentValidation;