const Joi = require('joi');
const ValidatorFactory = require('./factory.validation');

class KelasValidation {
  static create() {
    return ValidatorFactory.create({
      namaKelas: Joi.string().required()
        .messages({
          'string.empty': 'Nama kelas tidak boleh kosong',
          'any.required': 'Nama kelas wajib diisi'
        })
    });
  }

  static update() {
    return ValidatorFactory.create({
      namaKelas: Joi.string().required()
        .messages({
          'string.empty': 'Nama kelas tidak boleh kosong',
          'any.required': 'Nama kelas wajib diisi'
        })
    });
  }

  static patchInitialStudentIntoClass() {
    return ValidatorFactory.create({
      programId: Joi.string().optional(),
      hari: Joi.string().valid('SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU').optional(),
      jamMengajarId: Joi.string().optional(),
      guruId: Joi.string().optional(),
      tambahSiswaIds: Joi.array().items(Joi.string()).optional()
        .messages({
          'array.base': 'Daftar siswa harus berupa array',
        })
    });
  }

  static getInitialStudentQuery() {
    return ValidatorFactory.create({
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
        }),

    });
  }
}

module.exports = KelasValidation;