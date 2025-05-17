
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

  static getById() {
    return ValidatorFactory.create({
      id: Joi.string().required()
        .messages({
          'string.empty': 'ID kelas tidak boleh kosong',
          'any.required': 'ID kelas wajib diisi'
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
      namaKelas: Joi.string().allow('', null)
    });
  }
}

module.exports = KelasValidation;