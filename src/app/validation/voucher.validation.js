
const Joi = require('joi');
const ValidatorFactory = require('./factory.validation');

class VoucherValidation {
  static create() {
    return ValidatorFactory.create({
      kodeVoucher: Joi.string().uppercase().required()
        .messages({
          'string.empty': 'Kode voucher tidak boleh kosong',
          'any.required': 'Kode voucher wajib diisi'
        }),
      tipe: Joi.string().valid('PERSENTASE', 'NOMINAL').required()
        .messages({
          'any.only': 'Tipe voucher harus PERSENTASE atau NOMINAL',
          'any.required': 'Tipe voucher wajib diisi'
        }),
      nominal: Joi.number().precision(2).positive().required()
        .messages({
          'number.base': 'Nominal harus berupa angka',
          'number.positive': 'Nominal harus lebih dari 0',
          'any.required': 'Nominal wajib diisi'
        }),
      isActive: Joi.boolean().default(true)
        .messages({
          'boolean.base': 'Status aktif harus berupa boolean'
        }),
      jumlahPenggunaan: Joi.number().integer().positive().required()
        .messages({
          'number.base': 'Jumlah penggunaan harus berupa angka',
          'number.integer': 'Jumlah penggunaan harus berupa bilangan bulat',
          'number.positive': 'Jumlah penggunaan harus lebih dari 0',
          'any.required': 'Jumlah penggunaan wajib diisi'
        })
    });
  }

  static update() {
    return ValidatorFactory.create({
      kodeVoucher: Joi.string().uppercase().optional()
        .messages({
          'string.empty': 'Kode voucher tidak boleh kosong'
        }),
      tipe: Joi.string().valid('PERSENTASE', 'NOMINAL').optional()
        .messages({
          'any.only': 'Tipe voucher harus PERSENTASE atau NOMINAL'
        }),
      nominal: Joi.number().precision(2).positive().optional()
        .messages({
          'number.base': 'Nominal harus berupa angka',
          'number.positive': 'Nominal harus lebih dari 0'
        }),
      isActive: Joi.boolean().optional()
        .messages({
          'boolean.base': 'Status aktif harus berupa boolean'
        }),
      jumlahPenggunaan: Joi.number().integer().positive().optional()
        .messages({
          'number.base': 'Jumlah penggunaan harus berupa angka',
          'number.integer': 'Jumlah penggunaan harus berupa bilangan bulat',
          'number.positive': 'Jumlah penggunaan harus lebih dari 0'
        })
    });
  }

 
}

module.exports = VoucherValidation;