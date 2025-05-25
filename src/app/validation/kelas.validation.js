
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

}

module.exports = KelasValidation;