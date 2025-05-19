const Joi = require('joi');
const ValidatorFactory = require('./factory.validation');

class SiswaValidation {
  static registerSiswa() {
    return ValidatorFactory.create({
      // User credentials
      email: Joi.string().email().required()
        .messages({
          'string.email': 'Email harus valid',
          'any.required': 'Email wajib diisi'
        }),
      password: Joi.string()
        .min(6)
        .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+])[A-Za-z\d!@#$%^&*()_+]/)
        .required()
        .messages({
          'string.min': 'Password minimal 6 karakter',
          'string.pattern.base': 'Password harus mengandung huruf besar, huruf kecil, angka, dan karakter khusus',
          'any.required': 'Password wajib diisi'
        }),
      
      // Siswa data
      siswaData: Joi.object({
        noWhatsapp: Joi.string().pattern(/^(\+62|62|0)[0-9]{9,12}$/).optional()
          .messages({
            'string.pattern.base': 'Format nomor WhatsApp tidak valid'
          }),
        namaMurid: Joi.string().required()
          .messages({
            'any.required': 'Nama murid wajib diisi'
          }),
        namaPanggilan: Joi.string().optional(),
        tanggalLahir: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).optional()
          .messages({
            'string.pattern.base': 'Format tanggal lahir harus YYYY-MM-DD'
          }),
        jenisKelamin: Joi.string().valid('LAKI_LAKI', 'PEREMPUAN').required()
          .messages({
            'any.only': 'Jenis kelamin harus LAKI_LAKI atau PEREMPUAN',
            'any.required': 'Jenis kelamin wajib diisi'
          }),
        alamat: Joi.string().optional(),
        strataPendidikan: Joi.string().valid('PAUD', 'TK', 'SD', 'SMP', 'SMA', 'KULIAH', 'UMUM').optional()
          .messages({
            'any.only': 'Strata pendidikan harus salah satu dari: PAUD, TK, SD, SMP, SMA, KULIAH, UMUM'
          }),
        kelasSekolah: Joi.string().optional(),
        namaSekolah: Joi.string().optional(),
        namaOrangTua: Joi.string().optional(),
        namaPenjemput: Joi.string().optional()
      }).required(),

      // Program registration
      programId: Joi.string().required()
        .messages({
          'any.required': 'Program ID wajib diisi'
        }),

      // Payment data
      biayaPendaftaran: Joi.number().precision(2).positive().required()
        .messages({
          'number.base': 'Biaya pendaftaran harus berupa angka',
          'number.positive': 'Biaya pendaftaran harus lebih dari 0',
          'any.required': 'Biaya pendaftaran wajib diisi'
        }),
      
      // Optional voucher
      kodeVoucher: Joi.string().optional(),

      // Payment URLs (optional)
      successRedirectUrl: Joi.string().uri().optional()
        .messages({
          'string.uri': 'Success redirect URL harus berupa URL yang valid'
        }),
      failureRedirectUrl: Joi.string().uri().optional()
        .messages({
          'string.uri': 'Failure redirect URL harus berupa URL yang valid'
        })
    });
  }

  static updateProfile() {
    return ValidatorFactory.create({
      email: Joi.string().email().optional()
        .messages({
          'string.email': 'Email harus valid'
        }),
      noWhatsapp: Joi.string().pattern(/^(\+62|62|0)[0-9]{9,12}$/).optional()
        .messages({
          'string.pattern.base': 'Format nomor WhatsApp tidak valid'
        }),
      namaMurid: Joi.string().optional(),
      namaPanggilan: Joi.string().optional(),
      tanggalLahir: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).optional()
        .messages({
          'string.pattern.base': 'Format tanggal lahir harus YYYY-MM-DD'
        }),
      jenisKelamin: Joi.string().valid('LAKI_LAKI', 'PEREMPUAN').optional()
        .messages({
          'any.only': 'Jenis kelamin harus LAKI_LAKI atau PEREMPUAN'
        }),
      alamat: Joi.string().optional(),
      strataPendidikan: Joi.string().valid('PAUD', 'TK', 'SD', 'SMP', 'SMA', 'KULIAH', 'UMUM').optional()
        .messages({
          'any.only': 'Strata pendidikan harus salah satu dari: PAUD, TK, SD, SMP, SMA, KULIAH, UMUM'
        }),
      kelasSekolah: Joi.string().optional(),
      namaSekolah: Joi.string().optional(),
      namaOrangTua: Joi.string().optional(),
      namaPenjemput: Joi.string().optional()
    });
  }

  static getById() {
    return ValidatorFactory.create({
      id: Joi.string().required()
        .messages({
          'string.empty': 'ID siswa tidak boleh kosong',
          'any.required': 'ID siswa wajib diisi'
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
      namaMurid: Joi.string().allow('', null),
      isRegistered: Joi.string().valid('true', 'false').allow('', null),
      strataPendidikan: Joi.string().valid('PAUD', 'TK', 'SD', 'SMP', 'SMA', 'KULIAH', 'UMUM').allow('', null),
      jenisKelamin: Joi.string().valid('LAKI_LAKI', 'PEREMPUAN').allow('', null)
    });
  }

  static delete() {
    return ValidatorFactory.create({
      id: Joi.string().required()
        .messages({
          'string.empty': 'ID siswa tidak boleh kosong',
          'any.required': 'ID siswa wajib diisi'
        })
    });
  }
}

module.exports = SiswaValidation;