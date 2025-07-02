const Joi = require('joi');
const ValidatorFactory = require('./factory.validation');

class ProgramValidation {
  static create() {
    return ValidatorFactory.create({
      namaProgram: Joi.string().required()
        .messages({
          'string.empty': 'Nama program tidak boleh kosong',
          'any.required': 'Nama program wajib diisi'
        }),
      deskripsi: Joi.string().required()
        .messages({
          'string.empty': 'Deskripsi tidak boleh kosong',
          'any.required': 'Deskripsi wajib diisi'
        }),
      cover: Joi.string().optional()
        .messages({
          'string.base': 'Cover harus berupa string'
        })
    });
  }

  static update() {
    return ValidatorFactory.create({
      namaProgram: Joi.string().optional()
        .messages({
          'string.empty': 'Nama program tidak boleh kosong'
        }),
      deskripsi: Joi.string().optional()
        .messages({
          'string.empty': 'Deskripsi tidak boleh kosong'
        }),
      cover: Joi.string().optional()
        .messages({
          'string.base': 'Cover harus berupa string'
        })
    });
  }

}

module.exports = ProgramValidation;