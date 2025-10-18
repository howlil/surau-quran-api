const Joi = require('joi');

class VoucherValidation {
  static create() {
    return Joi.object({
      kodeVoucher: Joi.string().uppercase().required()
        .messages({
          'string.empty': 'Kode voucher tidak boleh kosong',
          'any.required': 'Kode voucher wajib diisi'
        }),
      namaVoucher: Joi.string().required()
        .messages({
          'string.empty': 'Nama voucher tidak boleh kosong',
          'any.required': 'Nama voucher wajib diisi'
        }),
      tipe: Joi.string().valid('PERSENTASE', 'NOMINAL').required()
        .messages({
          'any.only': 'Tipe voucher harus PERSENTASE atau NOMINAL',
          'any.required': 'Tipe voucher wajib diisi'
        }),
      nominal: Joi.number().precision(2).positive().required()
        .custom((value, helpers) => {
          const tipe = helpers.state.ancestors[0].tipe;
          if (tipe === 'PERSENTASE') {
            if (value < 0 || value > 100) {
              return helpers.error('number.range', { min: 0, max: 100 });
            }
          }
          return value;
        })
        .messages({
          'number.base': 'Nominal harus berupa angka',
          'number.positive': 'Nominal harus lebih dari 0',
          'number.range': 'Persentase harus antara 0-100%',
          'any.required': 'Nominal wajib diisi'
        }),
      isActive: Joi.boolean().default(true)
        .messages({
          'boolean.base': 'Status aktif harus berupa boolean'
        })
    });
  }

  static update() {
    return Joi.object({
      kodeVoucher: Joi.string().uppercase().optional()
        .messages({
          'string.empty': 'Kode voucher tidak boleh kosong'
        }),
      namaVoucher: Joi.string().optional()
        .messages({
          'string.empty': 'Nama voucher tidak boleh kosong'
        }),
      tipe: Joi.string().valid('PERSENTASE', 'NOMINAL').optional()
        .messages({
          'any.only': 'Tipe voucher harus PERSENTASE atau NOMINAL'
        }),
      nominal: Joi.number().precision(2).positive().optional()
        .custom((value, helpers) => {
          const tipe = helpers.state.ancestors[0].tipe;
          if (tipe === 'PERSENTASE' && value !== undefined) {
            if (value < 0 || value > 100) {
              return helpers.error('number.range', { min: 0, max: 100 });
            }
          }
          return value;
        })
        .messages({
          'number.base': 'Nominal harus berupa angka',
          'number.positive': 'Nominal harus lebih dari 0',
          'number.range': 'Persentase harus antara 0-100%'
        }),
      isActive: Joi.boolean().optional()
        .messages({
          'boolean.base': 'Status aktif harus berupa boolean'
        })
    });
  }

  static getVoucherQuery() {
    return Joi.object({
      nama: Joi.string().min(1).max(191).optional()
        .messages({
          'string.min': 'Nama minimal 1 karakter',
          'string.max': 'Nama maksimal 191 karakter'
        }),
      page: Joi.number().integer().min(1).default(1)
        .messages({
          'number.base': 'Page harus berupa angka',
          'number.integer': 'Page harus berupa bilangan bulat',
          'number.min': 'Page minimal 1'
        }),
      limit: Joi.number().integer().min(1).max(100).default(10)
        .messages({
          'number.base': 'Limit harus berupa angka',
          'number.integer': 'Limit harus berupa bilangan bulat',
          'number.min': 'Limit minimal 1',
          'number.max': 'Limit maksimal 100'
        })
    });
  }

  static getVoucherByKode() {
    return Joi.object({
      kodeVoucher: Joi.string().uppercase().required()
        .messages({
          'string.empty': 'Kode voucher tidak boleh kosong',
          'any.required': 'Kode voucher wajib diisi'
        })
    });
  }


}

module.exports = VoucherValidation;