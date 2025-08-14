const Joi = require('joi');
const ValidatorFactory = require('./factory.validation');

class GuruValidation {
  static create() {
    return ValidatorFactory.create({
      email: Joi.string().email().required()
        .messages({
          'string.email': 'Email harus valid',
          'any.required': 'Email wajib diisi'
        }),

      nama: Joi.string().required()
        .messages({
          'any.required': 'Nama wajib diisi'
        }),
      noWhatsapp: Joi.string().pattern(/^(\+62|62|0)[0-9]{9,12}$/).optional()
        .messages({
          'string.pattern.base': 'Format nomor WhatsApp tidak valid'
        }),
      alamat: Joi.string().optional(),
      jenisKelamin: Joi.string().valid('LAKI_LAKI', 'PEREMPUAN').optional()
        .messages({
          'any.only': 'Jenis kelamin harus LAKI_LAKI atau PEREMPUAN'
        }),
      tanggalLahir: Joi.string().pattern(/^\d{2}-\d{2}-\d{4}$/).optional()
        .messages({
          'string.pattern.base': 'Format tanggal lahir harus DD-MM-YYYY'
        }),
      fotoProfile: Joi.any().optional(),
      keahlian: Joi.string().optional(),
      pendidikanTerakhir: Joi.string().optional(),
      noRekening: Joi.string().pattern(/^[0-9]+$/).optional()
        .messages({
          'string.pattern.base': 'Nomor rekening hanya boleh berisi angka'
        }),
      namaBank: Joi.string().optional(),
      suratKontrak: Joi.any().optional(),
      rfid: Joi.string().min(8).max(50).optional()
        .messages({
          'string.min': 'RFID minimal 8 karakter',
          'string.max': 'RFID maksimal 50 karakter'
        })
    });
  }

  static update() {
    return ValidatorFactory.create({
      email: Joi.string().email().optional()
        .messages({
          'string.email': 'Email harus valid'
        }),

      nama: Joi.string().optional(),
      noWhatsapp: Joi.string().pattern(/^(\+62|62|0)[0-9]{9,12}$/).optional()
        .messages({
          'string.pattern.base': 'Format nomor WhatsApp tidak valid'
        }),
      alamat: Joi.string().optional(),
      jenisKelamin: Joi.string().valid('LAKI_LAKI', 'PEREMPUAN').optional()
        .messages({
          'any.only': 'Jenis kelamin harus LAKI_LAKI atau PEREMPUAN'
        }),
      tanggalLahir: Joi.string().pattern(/^\d{2}-\d{2}-\d{4}$/).optional()
        .messages({
          'string.pattern.base': 'Format tanggal lahir harus DD-MM-YYYY'
        }),
      fotoProfile: Joi.any().optional(),
      keahlian: Joi.string().optional(),
      pendidikanTerakhir: Joi.string().optional(),
      noRekening: Joi.string().pattern(/^[0-9]+$/).optional()
        .messages({
          'string.pattern.base': 'Nomor rekening hanya boleh berisi angka'
        }),
      namaBank: Joi.string().optional(),
      suratKontrak: Joi.any().optional(),
      rfid: Joi.string().min(8).max(50).optional()
        .messages({
          'string.min': 'RFID minimal 8 karakter',
          'string.max': 'RFID maksimal 50 karakter'
        })
    });
  }

  static getGuruQuery() {
    return ValidatorFactory.create({
      nama: Joi.string().min(1).max(191).optional()
        .messages({
          'string.min': 'Nama minimal 1 karakter',
          'string.max': 'Nama maksimal 191 karakter'
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

  static getJadwalGuruQuery() {
    return ValidatorFactory.create({
      nama: Joi.string().min(1).max(191).optional()
        .messages({
          'string.min': 'Nama minimal 1 karakter',
          'string.max': 'Nama maksimal 191 karakter'
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

module.exports = GuruValidation;