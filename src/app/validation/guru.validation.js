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
      tanggalLahir: Joi.date().iso().required()
        .messages({
          'date.base': 'Format tanggal lahir tidak valid',
          'date.format': 'Format tanggal lahir harus ISO (YYYY-MM-DD)',
          'any.required': 'Tanggal lahir wajib diisi'
        }),
      fotoProfile: Joi.any().optional(),
      keahlian: Joi.string().optional(),
      pendidikanTerakhir: Joi.string().optional(),
      noRekening: Joi.string().pattern(/^[0-9]+$/).optional()
        .messages({
          'string.pattern.base': 'Nomor rekening hanya boleh berisi angka'
        }),
      namaBank: Joi.string().optional(),
      suratKontrak: Joi.any().optional()
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
      tanggalLahir: Joi.date().iso().optional()
        .messages({
          'date.base': 'Format tanggal lahir tidak valid',
          'date.format': 'Format tanggal lahir harus ISO (YYYY-MM-DD)'
        }),
      fotoProfile: Joi.any().optional(),
      keahlian: Joi.string().optional(),
      pendidikanTerakhir: Joi.string().optional(),
      noRekening: Joi.string().pattern(/^[0-9]+$/).optional()
        .messages({
          'string.pattern.base': 'Nomor rekening hanya boleh berisi angka'
        }),
      namaBank: Joi.string().optional(),
      suratKontrak: Joi.any().optional()
    });
  }
}

module.exports = GuruValidation;