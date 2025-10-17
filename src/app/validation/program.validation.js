const Joi = require('joi');

class ProgramValidation {
  static create() {
    return Joi.object({
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
      tipeProgram: Joi.string().valid('GROUP', 'PRIVATE').required()
        .messages({
          'string.empty': 'Tipe program tidak boleh kosong',
          'any.required': 'Tipe program wajib diisi',
          'any.only': 'Tipe program harus GROUP atau PRIVATE'
        }),
      cover: Joi.string().optional()
        .messages({
          'string.base': 'Cover harus berupa string'
        })
    });
  }

  static update() {
    return Joi.object({
      namaProgram: Joi.string().optional()
        .messages({
          'string.empty': 'Nama program tidak boleh kosong'
        }),
      deskripsi: Joi.string().optional()
        .messages({
          'string.empty': 'Deskripsi tidak boleh kosong'
        }),
      tipeProgram: Joi.string().valid('GROUP', 'PRIVATE').optional()
        .messages({
          'string.empty': 'Tipe program tidak boleh kosong',
          'any.only': 'Tipe program harus GROUP atau PRIVATE'
        }),
      cover: Joi.string().optional()
        .messages({
          'string.base': 'Cover harus berupa string'
        })
    });
  }

  static getProgramQuery() {
    return Joi.object({
      namaProgram: Joi.string().min(1).max(191).optional()
        .messages({
          'string.min': 'Nama program minimal 1 karakter',
          'string.max': 'Nama program maksimal 191 karakter'
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

}


module.exports = ProgramValidation;