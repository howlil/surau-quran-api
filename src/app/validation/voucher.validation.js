
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

  static getById() {
    return ValidatorFactory.create({
      id: Joi.string().required()
        .messages({
          'string.empty': 'ID voucher tidak boleh kosong',
          'any.required': 'ID voucher wajib diisi'
        })
    });
  }

  static getByCode() {
    return ValidatorFactory.create({
      kodeVoucher: Joi.string().required()
        .messages({
          'string.empty': 'Kode voucher tidak boleh kosong',
          'any.required': 'Kode voucher wajib diisi'
        })
    });
  }

  static getAll() {
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
      kodeVoucher: Joi.string().allow('', null),
      tipe: Joi.string().valid('PERSENTASE', 'NOMINAL').allow('', null),
      isActive: Joi.string().valid('true', 'false').allow('', null)
    });
  }

  static toggleStatus() {
    return ValidatorFactory.create({
      id: Joi.string().required()
        .messages({
          'string.empty': 'ID voucher tidak boleh kosong',
          'any.required': 'ID voucher wajib diisi'
        })
    });
  }

  static getUsageReport() {
    return ValidatorFactory.create({
      id: Joi.string().required()
        .messages({
          'string.empty': 'ID voucher tidak boleh kosong',
          'any.required': 'ID voucher wajib diisi'
        })
    });
  }
}

module.exports = VoucherValidation;