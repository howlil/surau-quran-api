const Joi = require('joi');
const ValidatorFactory = require('./base.validation');

class PayrollValidation {
  static create() {
    return ValidatorFactory.create({
      guruId: Joi.string().guid({ version: 'uuidv4' }).required()
        .messages({
          'string.guid': 'Guru ID harus berupa UUID yang valid',
          'any.required': 'Guru ID wajib diisi'
        }),
      periode: Joi.string().min(3).max(50).required()
        .messages({
          'string.min': 'Periode minimal 3 karakter',
          'string.max': 'Periode maksimal 50 karakter',
          'any.required': 'Periode wajib diisi'
        }),
      bulan: Joi.string().min(3).max(20).required()
        .messages({
          'string.min': 'Bulan minimal 3 karakter',
          'string.max': 'Bulan maksimal 20 karakter',
          'any.required': 'Bulan wajib diisi'
        }),
      tahun: Joi.number().integer().min(2020).max(2050).required()
        .messages({
          'number.base': 'Tahun harus berupa angka',
          'number.integer': 'Tahun harus berupa bilangan bulat',
          'number.min': 'Tahun minimal 2020',
          'number.max': 'Tahun maksimal 2050',
          'any.required': 'Tahun wajib diisi'
        }),
      gajiPokok: Joi.number().precision(2).min(0).required()
        .messages({
          'number.base': 'Gaji pokok harus berupa angka',
          'number.min': 'Gaji pokok tidak boleh negatif',
          'any.required': 'Gaji pokok wajib diisi'
        }),
      insentif: Joi.number().precision(2).min(0).default(0)
        .messages({
          'number.base': 'Insentif harus berupa angka',
          'number.min': 'Insentif tidak boleh negatif'
        }),
      potongan: Joi.number().precision(2).min(0).default(0)
        .messages({
          'number.base': 'Potongan harus berupa angka',
          'number.min': 'Potongan tidak boleh negatif'
        })
    });
  }

  static update() {
    return ValidatorFactory.create({
      gajiPokok: Joi.number().precision(2).min(0).optional()
        .messages({
          'number.base': 'Gaji pokok harus berupa angka',
          'number.min': 'Gaji pokok tidak boleh negatif'
        }),
      insentif: Joi.number().precision(2).min(0).optional()
        .messages({
          'number.base': 'Insentif harus berupa angka',
          'number.min': 'Insentif tidak boleh negatif'
        }),
      potongan: Joi.number().precision(2).min(0).optional()
        .messages({
          'number.base': 'Potongan harus berupa angka',
          'number.min': 'Potongan tidak boleh negatif'
        }),
      status: Joi.string().valid('DRAFT', 'DIPROSES', 'SELESAI', 'GAGAL').optional()
        .messages({
          'any.only': 'Status harus salah satu dari: DRAFT, DIPROSES, SELESAI, GAGAL'
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
      periode: Joi.string().optional(),
      status: Joi.string().valid('DRAFT', 'DIPROSES', 'SELESAI', 'GAGAL').optional()
        .messages({
          'any.only': 'Status harus salah satu dari: DRAFT, DIPROSES, SELESAI, GAGAL'
        }),
      guruId: Joi.string().guid({ version: 'uuidv4' }).optional()
        .messages({
          'string.guid': 'Guru ID harus berupa UUID yang valid'
        })
    });
  }

  static generateMonthly() {
    return ValidatorFactory.create({
      bulan: Joi.string().min(3).max(20).required()
        .messages({
          'string.min': 'Bulan minimal 3 karakter',
          'string.max': 'Bulan maksimal 20 karakter',
          'any.required': 'Bulan wajib diisi'
        }),
      tahun: Joi.number().integer().min(2020).max(2050).required()
        .messages({
          'number.base': 'Tahun harus berupa angka',
          'number.integer': 'Tahun harus berupa bilangan bulat',
          'number.min': 'Tahun minimal 2020',
          'number.max': 'Tahun maksimal 2050',
          'any.required': 'Tahun wajib diisi'
        }),
      guruIds: Joi.array().items(
        Joi.string().guid({ version: 'uuidv4' })
      ).optional()
        .messages({
          'string.guid': 'Setiap Guru ID harus berupa UUID yang valid'
        })
    });
  }

  static getSummary() {
    return ValidatorFactory.create({
      periode: Joi.string().optional(),
      tahun: Joi.number().integer().min(2020).max(2050).optional()
        .messages({
          'number.base': 'Tahun harus berupa angka',
          'number.integer': 'Tahun harus berupa bilangan bulat',
          'number.min': 'Tahun minimal 2020',
          'number.max': 'Tahun maksimal 2050'
        })
    });
  }

  static disburseBatch() {
    return ValidatorFactory.create({
      payrollIds: Joi.array().items(
        Joi.string().guid({ version: 'uuidv4' }).required()
      ).min(1).max(50).required()
        .messages({
          'array.min': 'Minimal harus memilih 1 payroll',
          'array.max': 'Maksimal dapat memproses 50 payroll sekaligus',
          'any.required': 'Payroll IDs wajib diisi',
          'string.guid': 'Setiap Payroll ID harus berupa UUID yang valid'
        })
    });
  }
}

module.exports = PayrollValidation;