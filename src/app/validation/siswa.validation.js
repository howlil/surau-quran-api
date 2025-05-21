const Joi = require('joi');
const ValidatorFactory = require('./factory.validation');

class SiswaValidation {
  static RegisterSiswa() {
    return ValidatorFactory.create({
      // User account data
      email: Joi.string().email().max(191).required()
        .messages({
          'string.email': 'Format email tidak valid',
          'string.max': 'Email maksimal 191 karakter',
          'any.required': 'Email wajib diisi'
        }),

      // Siswa data
      siswaData: Joi.object({
        namaMurid: Joi.string().min(3).max(191).required()
          .messages({
            'string.min': 'Nama murid minimal 3 karakter',
            'string.max': 'Nama murid maksimal 191 karakter',
            'any.required': 'Nama murid wajib diisi'
          }),
        namaPanggilan: Joi.string().min(2).max(50).optional()
          .messages({
            'string.min': 'Nama panggilan minimal 2 karakter',
            'string.max': 'Nama panggilan maksimal 50 karakter'
          }),
        tanggalLahir: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).optional()
          .messages({
            'string.pattern.base': 'Format tanggal lahir harus YYYY-MM-DD'
          }),
        jenisKelamin: Joi.string().valid('LAKI_LAKI', 'PEREMPUAN').required()
          .messages({
            'any.only': 'Jenis kelamin harus LAKI_LAKI atau PEREMPUAN',
            'any.required': 'Jenis kelamin wajib diisi'
          }),
        noWhatsapp: Joi.string().min(10).max(15).optional()
          .messages({
            'string.min': 'Nomor WhatsApp minimal 10 karakter',
            'string.max': 'Nomor WhatsApp maksimal 15 karakter'
          }),
        alamat: Joi.string().min(5).max(500).optional()
          .messages({
            'string.min': 'Alamat minimal 5 karakter',
            'string.max': 'Alamat maksimal 500 karakter'
          }),
        strataPendidikan: Joi.string().valid('PAUD', 'TK', 'SD', 'SMP', 'SMA', 'KULIAH', 'UMUM').optional()
          .messages({
            'any.only': 'Strata pendidikan harus salah satu dari: PAUD, TK, SD, SMP, SMA, KULIAH, UMUM'
          }),
        kelasSekolah: Joi.string().min(1).max(191).optional()
          .messages({
            'string.min': 'Kelas sekolah minimal 1 karakter',
            'string.max': 'Kelas sekolah maksimal 191 karakter'
          }),
        namaSekolah: Joi.string().min(3).max(191).optional()
          .messages({
            'string.min': 'Nama sekolah minimal 3 karakter',
            'string.max': 'Nama sekolah maksimal 191 karakter'
          }),
        namaOrangTua: Joi.string().min(2).max(191).required()
          .messages({
            'string.min': 'Nama orang tua minimal 2 karakter',
            'string.max': 'Nama orang tua maksimal 191 karakter',
            'any.required': 'Nama orang tua wajib diisi'
          }),
        namaPenjemput: Joi.string().min(2).max(191).optional()
          .messages({
            'string.min': 'Nama penjemput minimal 2 karakter',
            'string.max': 'Nama penjemput maksimal 191 karakter'
          })
      }).required()
        .messages({
          'any.required': 'Data siswa wajib diisi'
        }),

      // Program registration
      programId: Joi.string().guid({ version: 'uuidv4' }).required()
        .messages({
          'string.guid': 'Program ID harus berupa UUID yang valid',
          'any.required': 'Program ID wajib diisi'
        }),

      // Schedule preferences (at least 2 preferred schedules)
      jadwalPreferences: Joi.array().items(
        Joi.object({
          hari: Joi.string().valid('SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU').required()
            .messages({
              'any.only': 'Hari harus salah satu dari: SENIN, SELASA, RABU, KAMIS, JUMAT, SABTU',
              'any.required': 'Hari wajib diisi'
            }),
          jamMengajarId: Joi.string().guid({ version: 'uuidv4' }).required()
            .messages({
              'string.guid': 'Jam Mengajar ID harus berupa UUID yang valid',
              'any.required': 'Jam Mengajar ID wajib diisi'
            })
        })
      ).min(2).max(2).required()
        .messages({
          'array.min': 'Jadwal preferences harus memilih 2 pilihan',
          'array.max': 'Jadwal preferences maksimal 2 pilihan',
          'any.required': 'Jadwal preferences wajib diisi'
        }),

      // Payment data
      biayaPendaftaran: Joi.number().precision(2).positive().min(10000).max(100000000).required()
        .messages({
          'number.base': 'Biaya pendaftaran harus berupa angka',
          'number.positive': 'Biaya pendaftaran harus lebih dari 0',
          'number.min': 'Biaya pendaftaran minimal Rp 10.000',
          'number.max': 'Biaya pendaftaran maksimal Rp 100.000.000',
          'any.required': 'Biaya pendaftaran wajib diisi'
        }),

      // Optional voucher
      kodeVoucher: Joi.string().uppercase().min(3).max(50).optional()
        .messages({
          'string.min': 'Kode voucher minimal 3 karakter',
          'string.max': 'Kode voucher maksimal 50 karakter'
        }),

      // Payment URLs (optional)
      successRedirectUrl: Joi.string().uri().max(500).optional()
        .messages({
          'string.uri': 'Success redirect URL harus berupa URL yang valid',
          'string.max': 'Success redirect URL maksimal 500 karakter'
        }),
      failureRedirectUrl: Joi.string().uri().max(500).optional()
        .messages({
          'string.uri': 'Failure redirect URL harus berupa URL yang valid',
          'string.max': 'Failure redirect URL maksimal 500 karakter'
        })
    });
  }


  static adminUpdateSiswa() {
    return ValidatorFactory.create({
      // Basic student information
      namaMurid: Joi.string().min(2).max(191).optional()
        .messages({
          'string.min': 'Nama murid minimal 2 karakter',
          'string.max': 'Nama murid maksimal 191 karakter'
        }),
      namaPanggilan: Joi.string().min(2).max(191).optional()
        .messages({
          'string.min': 'Nama panggilan minimal 2 karakter',
          'string.max': 'Nama panggilan maksimal 191 karakter'
        }),
      jenisKelamin: Joi.string().valid('LAKI_LAKI', 'PEREMPUAN').optional()
        .messages({
          'any.only': 'Jenis kelamin harus LAKI_LAKI atau PEREMPUAN'
        }),
      tanggalLahir: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).optional()
        .messages({
          'string.pattern.base': 'Format tanggal lahir harus YYYY-MM-DD (contoh: 2000-12-31)'
        }),
      noWhatsapp: Joi.string().pattern(/^(\+62|62|0)[0-9]{9,12}$/).max(20).optional()
        .messages({
          'string.pattern.base': 'Format nomor WhatsApp tidak valid (contoh: 081234567890)',
          'string.max': 'Nomor WhatsApp maksimal 20 karakter'
        }),
      alamat: Joi.string().min(10).max(500).optional()
        .messages({
          'string.min': 'Alamat minimal 10 karakter',
          'string.max': 'Alamat maksimal 500 karakter'
        }),
      strataPendidikan: Joi.string().valid('PAUD', 'TK', 'SD', 'SMP', 'SMA', 'KULIAH', 'UMUM').optional()
        .messages({
          'any.only': 'Strata pendidikan harus salah satu dari: PAUD, TK, SD, SMP, SMA, KULIAH, UMUM'
        }),
      namaOrangTua: Joi.string().min(2).max(191).optional()
        .messages({
          'string.min': 'Nama orang tua minimal 2 karakter',
          'string.max': 'Nama orang tua maksimal 191 karakter'
        }),
      namaPenjemput: Joi.string().min(2).max(191).optional()
        .messages({
          'string.min': 'Nama penjemput minimal 2 karakter',
          'string.max': 'Nama penjemput maksimal 191 karakter'
        }),
      namaSekolah: Joi.string().min(3).max(191).optional()
        .messages({
          'string.min': 'Nama sekolah minimal 3 karakter',
          'string.max': 'Nama sekolah maksimal 191 karakter'
        }),
      kelasSekolah: Joi.string().min(1).max(191).optional()
        .messages({
          'string.min': 'Kelas sekolah minimal 1 karakter',
          'string.max': 'Kelas sekolah maksimal 191 karakter'
        }),

      // User information (email)
      email: Joi.string().email().max(191).optional()
        .messages({
          'string.email': 'Format email tidak valid',
          'string.max': 'Email maksimal 191 karakter'
        }),

      // Single program with status
      programId: Joi.string().guid({ version: 'uuidv4' }).optional()
        .messages({
          'string.guid': 'Program ID harus berupa UUID yang valid'
        }),
      programStatus: Joi.string().valid('AKTIF', 'TIDAK_AKTIF', 'CUTI').optional()
        .messages({
          'any.only': 'Status harus salah satu dari: AKTIF, TIDAK_AKTIF, CUTI'
        }),

      // Schedule array for the program - with identification for updates
      jadwal: Joi.array().items(
        Joi.object({
         
          hari: Joi.string().valid('SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU').optional()
            .messages({
              'any.only': 'Hari harus salah satu dari: SENIN, SELASA, RABU, KAMIS, JUMAT, SABTU'
            }),
          jamMengajarId: Joi.string().guid({ version: 'uuidv4' }).optional()
            .messages({
              'string.guid': 'Jam Mengajar ID harus berupa UUID yang valid'
            }),
        }).or('hari', 'jamMengajarId')
          .messages({
            'object.missing': 'Jadwal harus memiliki setidaknya salah satu: id, hari, jamMengajarId, atau isDeleted'
          })
      ).optional()
    });
  }
}

module.exports = SiswaValidation;