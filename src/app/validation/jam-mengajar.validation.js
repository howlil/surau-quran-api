const Joi = require('joi');
const ValidatorFactory = require('./factory.validation');

class JamMengajarValidation {
  static create() {
    return ValidatorFactory.create({
      jamMulai: Joi.string().required()
        .messages({
          'string.empty': 'Jam mulai tidak boleh kosong',
          'any.required': 'Jam mulai wajib diisi'
        }),
      jamSelesai: Joi.string().required()
        .messages({
          'string.empty': 'Jam selesai tidak boleh kosong',
          'any.required': 'Jam selesai wajib diisi'
        })
    });
  }

  static update() {
    return ValidatorFactory.create({
      jamMulai: Joi.string().required()
        .messages({
          'string.empty': 'Jam mulai tidak boleh kosong',
          'any.required': 'Jam mulai wajib diisi'
        }),
      jamSelesai: Joi.string().required()
        .messages({
          'string.empty': 'Jam selesai tidak boleh kosong',
          'any.required': 'Jam selesai wajib diisi'
        })
    });
  }

  static getById() {
    return ValidatorFactory.create({
      id: Joi.string().required()
        .messages({
          'string.empty': 'ID jam mengajar tidak boleh kosong',
          'any.required': 'ID jam mengajar wajib diisi'
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
      jamMulai: Joi.string().allow('', null),
      jamSelesai: Joi.string().allow('', null)
    });
  }
}

module.exports = JamMengajarValidation;