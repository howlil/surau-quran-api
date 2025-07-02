const Joi = require('joi');
const ValidatorFactory = require('./factory.validation');

class KelasValidation {
  static create() {
    return ValidatorFactory.create({
      namaKelas: Joi.string().required()
        .messages({
          'string.empty': 'Nama kelas tidak boleh kosong',
          'any.required': 'Nama kelas wajib diisi'
        }),
      ipAddressHikvision: Joi.string().ip({ version: ['ipv4', 'ipv6'], cidr: 'optional' }).optional()
        .messages({
          'string.ip': 'IP Address Hikvision harus berupa alamat IP yang valid. Contoh: 192.168.1.100 atau 2001:db8::1',
          'string.base': 'IP Address Hikvision harus berupa teks'
        })
    });
  }

  static update() {
    return ValidatorFactory.create({
      namaKelas: Joi.string().optional()
        .messages({
          'string.empty': 'Nama kelas tidak boleh kosong'
        }),
      ipAddressHikvision: Joi.string().ip({ version: ['ipv4', 'ipv6'], cidr: 'optional' }).optional()
        .messages({
          'string.ip': 'IP Address Hikvision harus berupa alamat IP yang valid. Contoh: 192.168.1.100 atau 2001:db8::1',
          'string.base': 'IP Address Hikvision harus berupa teks'
        })
    });
  }


  static createKelasProgram() {
    return ValidatorFactory.create({
      kelasId: Joi.string().guid({ version: 'uuidv4' }).required()
        .messages({
          'string.guid': 'Kelas ID harus berupa UUID yang valid',
          'any.required': 'Kelas ID wajib diisi'
        }),
      programId: Joi.string().guid({ version: 'uuidv4' }).required()
        .messages({
          'string.guid': 'Program ID harus berupa UUID yang valid',
          'any.required': 'Program ID wajib diisi'
        }),
      hari: Joi.string().valid('SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU').required()
        .messages({
          'any.only': 'Hari harus salah satu dari: SENIN, SELASA, RABU, KAMIS, JUMAT, SABTU',
          'any.required': 'Hari wajib diisi'
        }),
      jamMengajarId: Joi.string().guid({ version: 'uuidv4' }).required()
        .messages({
          'string.guid': 'Jam Mengajar ID harus berupa UUID yang valid',
          'any.required': 'Jam Mengajar ID wajib diisi'
        }),
      guruId: Joi.string().guid({ version: 'uuidv4' }).required()
        .messages({
          'string.guid': 'Guru ID harus berupa UUID yang valid',
          'any.required': 'Guru ID wajib diisi'
        }),
      siswaIds: Joi.array().items(
        Joi.string().guid({ version: 'uuidv4' })
          .messages({
            'string.guid': 'Setiap Siswa ID harus berupa UUID yang valid'
          })
      ).optional()
        .messages({
          'array.base': 'Daftar siswa harus berupa array'
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

  static getCCTVQuery() {
    return ValidatorFactory.create({
      kelasId: Joi.string().guid({ version: 'uuidv4' }).required()
        .messages({
          'string.guid': 'Kelas ID harus berupa UUID yang valid',
          'any.required': 'Kelas ID wajib diisi'
        })
    });
  }
}

module.exports = KelasValidation;