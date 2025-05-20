const Joi = require('joi');
const ValidatorFactory = require('./factory.validation');

class PaymentValidation {
  static createPayment() {
    return ValidatorFactory.create({
      tipePembayaran: Joi.string().valid('PENDAFTARAN', 'SPP').required()
        .messages({
          'any.only': 'Tipe pembayaran harus PENDAFTARAN atau SPP',
          'any.required': 'Tipe pembayaran wajib diisi'
        }),
      metodePembayaran: Joi.string().valid('TUNAI', 'VIRTUAL_ACCOUNT', 'EWALLET', 'RETAIL_OUTLET', 'CREDIT_CARD', 'QRIS').required()
        .messages({
          'any.only': 'Metode pembayaran tidak valid',
          'any.required': 'Metode pembayaran wajib diisi'
        }),
      jumlahTagihan: Joi.number().precision(2).positive().required()
        .messages({
          'number.base': 'Jumlah tagihan harus berupa angka',
          'number.positive': 'Jumlah tagihan harus lebih dari 0',
          'any.required': 'Jumlah tagihan wajib diisi'
        }),
      payerEmail: Joi.string().email().optional()
        .messages({
          'string.email': 'Email pembayar harus valid'
        }),
      description: Joi.string().optional(),
      externalId: Joi.string().optional()
    });
  }

  static updateStatus() {
    return ValidatorFactory.create({
      status: Joi.string().valid('PENDING', 'MENUNGGU_PEMBAYARAN', 'LUNAS', 'BELUM_BAYAR', 'KADALUARSA', 'DIBATALKAN').required()
        .messages({
          'any.only': 'Status pembayaran tidak valid',
          'any.required': 'Status pembayaran wajib diisi'
        })
    });
  }

  static getById() {
    return ValidatorFactory.create({
      id: Joi.string().required()
        .messages({
          'string.empty': 'ID pembayaran tidak boleh kosong',
          'any.required': 'ID pembayaran wajib diisi'
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
      tipePembayaran: Joi.string().valid('PENDAFTARAN', 'SPP').allow('', null),
      statusPembayaran: Joi.string().valid('PENDING', 'MENUNGGU_PEMBAYARAN', 'LUNAS', 'BELUM_BAYAR', 'KADALUARSA', 'DIBATALKAN').allow('', null),
      metodePembayaran: Joi.string().valid('TUNAI', 'VIRTUAL_ACCOUNT', 'EWALLET', 'RETAIL_OUTLET', 'CREDIT_CARD', 'QRIS').allow('', null)
    });
  }

  static verifyPayment() {
    return ValidatorFactory.create({
      id: Joi.string().required()
        .messages({
          'string.empty': 'ID pembayaran tidak boleh kosong',
          'any.required': 'ID pembayaran wajib diisi'
        })
    });
  }

  static cancelPayment() {
    return ValidatorFactory.create({
      id: Joi.string().required()
        .messages({
          'string.empty': 'ID pembayaran tidak boleh kosong',
          'any.required': 'ID pembayaran wajib diisi'
        })
    });
  }

  static validateCallback() {
    return ValidatorFactory.create({
      id: Joi.string().required()
        .messages({
          'string.empty': 'ID invoice tidak boleh kosong',
          'any.required': 'ID invoice wajib diisi'
        }),
      external_id: Joi.string().required()
        .messages({
          'any.required': 'External ID wajib diisi'
        }),
      status: Joi.string().required()
        .messages({
          'any.required': 'Status wajib diisi'
        }),
      paid_amount: Joi.number().optional(),
      paid_at: Joi.string().optional(),
      payment_method: Joi.string().optional(),
      payment_channel: Joi.string().optional()
    });
  }

  static getCurrentMonthSpp() {
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
      statusPembayaran: Joi.string().valid('UNPAID', 'PENDING', 'PAID', 'SETTLED', 'EXPIRED', 'INACTIVE', 'ACTIVE', 'STOPPED').allow('', null)
        .messages({
          'any.only': 'Status pembayaran tidak valid'
        }),
      bulan: Joi.string().allow('', null)
        .messages({
          'string.empty': 'Bulan tidak boleh kosong'
        }),
      tahun: Joi.number().integer().min(2000).max(2100).allow('', null)
        .messages({
          'number.base': 'Tahun harus berupa angka',
          'number.integer': 'Tahun harus berupa bilangan bulat',
          'number.min': 'Tahun minimal 2000',
          'number.max': 'Tahun maksimal 2100'
        }),
      search: Joi.string().allow('', null)
        .messages({
          'string.empty': 'Pencarian tidak boleh kosong'
        })
    });
  }

  static getStudentSpp() {
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
      statusPembayaran: Joi.string().valid('UNPAID', 'PENDING', 'PAID', 'SETTLED', 'EXPIRED', 'INACTIVE', 'ACTIVE', 'STOPPED').allow('', null)
        .messages({
          'any.only': 'Status pembayaran tidak valid'
        }),
      bulan: Joi.string().allow('', null)
        .messages({
          'string.empty': 'Bulan tidak boleh kosong'
        }),
      tahun: Joi.number().integer().min(2000).max(2100).allow('', null)
        .messages({
          'number.base': 'Tahun harus berupa angka',
          'number.integer': 'Tahun harus berupa bilangan bulat',
          'number.min': 'Tahun minimal 2000',
          'number.max': 'Tahun maksimal 2100'
        })
    });
  }

  static paySpp() {
    return ValidatorFactory.create({
      periodeSppId: Joi.string().guid({ version: 'uuidv4' }).required()
        .messages({
          'string.guid': 'ID periode SPP harus berupa UUID yang valid',
          'any.required': 'ID periode SPP wajib diisi'
        }),
      metodePembayaran: Joi.string().valid('VIRTUAL_ACCOUNT', 'EWALLET', 'RETAIL_OUTLET', 'CREDIT_CARD', 'QR_CODE').required()
        .messages({
          'any.only': 'Metode pembayaran tidak valid',
          'any.required': 'Metode pembayaran wajib diisi'
        })
    });
  }

  static batchPaySpp() {
    return ValidatorFactory.create({
      periodeSppIds: Joi.array().items(
        Joi.string().guid({ version: 'uuidv4' }).required()
      ).min(1).required()
        .messages({
          'array.min': 'Minimal 1 SPP harus dipilih',
          'array.base': 'Daftar SPP harus berupa array',
          'any.required': 'Daftar SPP wajib diisi',
          'string.guid': 'ID periode SPP harus berupa UUID yang valid'
        }),
      paymentData: Joi.object({
        metodePembayaran: Joi.string().valid('VIRTUAL_ACCOUNT', 'EWALLET', 'RETAIL_OUTLET', 'CREDIT_CARD', 'QR_CODE').required()
          .messages({
            'any.only': 'Metode pembayaran tidak valid',
            'any.required': 'Metode pembayaran wajib diisi'
          })
      }).required()
        .messages({
          'any.required': 'Data pembayaran wajib diisi'
        })
    });
  }
}

module.exports = PaymentValidation;