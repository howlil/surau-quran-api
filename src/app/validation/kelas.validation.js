
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
 
}

module.exports = KelasValidation;