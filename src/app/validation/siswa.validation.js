const Joi = require('joi');
const ValidatorFactory = require('./factory.validation');

class SiswaValidation {
  static pendaftaranSiswa() {
    return ValidatorFactory.create({
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
      tanggalLahir: Joi.string().pattern(/^\d{2}-\d{2}-\d{4}$/).optional()
        .messages({
          'string.pattern.base': 'Format tanggal lahir harus DD-MM-YYYY'
        }),
      jenisKelamin: Joi.string().valid('LAKI_LAKI', 'PEREMPUAN').required()
        .messages({
          'any.only': 'Jenis kelamin harus LAKI_LAKI atau PEREMPUAN',
          'any.required': 'Jenis kelamin wajib diisi'
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
      email: Joi.string().email().max(191).required()
        .messages({
          'string.email': 'Format email tidak valid',
          'string.max': 'Email maksimal 191 karakter',
          'any.required': 'Email wajib diisi'
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
        }),
      noWhatsapp: Joi.string().min(10).max(15).optional()
        .messages({
          'string.min': 'Nomor WhatsApp minimal 10 karakter',
          'string.max': 'Nomor WhatsApp maksimal 15 karakter'
        }),
      programId: Joi.string().guid({ version: 'uuidv4' }).required()
        .messages({
          'string.guid': 'Program ID harus berupa UUID yang valid',
          'any.required': 'Program ID wajib diisi'
        }),
      jadwal: Joi.array().items(
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
      ).min(1).required()
        .messages({
          'array.min': 'Jadwal harus memilih minimal 1 pilihan',
          'any.required': 'Jadwal wajib diisi'
        }),
      kodeVoucher: Joi.string().uppercase().min(3).max(50).optional()
        .messages({
          'string.min': 'Kode voucher minimal 3 karakter',
          'string.max': 'Kode voucher maksimal 50 karakter'
        }),
      jumlahPembayaran: Joi.number().precision(2).positive().required()
        .messages({
          'number.base': 'Jumlah pembayaran harus berupa angka',
          'number.positive': 'Jumlah pembayaran harus lebih dari 0',
          'any.required': 'Jumlah pembayaran wajib diisi'
        }),
      totalBiaya: Joi.number().precision(2).positive().required()
        .messages({
          'number.base': 'Total biaya harus berupa angka',
          'number.positive': 'Total biaya harus lebih dari 0',
          'any.required': 'Total biaya wajib diisi'
        }),
    });
  }


  
  static updateStatusSiswa() {
    return ValidatorFactory.create({
      programId: Joi.string().guid({ version: 'uuidv4' }).required()
        .messages({
          'string.guid': 'Program ID harus berupa UUID yang valid',
          'any.required': 'Program ID wajib diisi'
        }),
      status: Joi.string().valid('AKTIF', 'TIDAK_AKTIF', 'CUTI').required()
        .messages({
          'any.only': 'Status harus salah satu dari: AKTIF, TIDAK_AKTIF, CUTI',
          'any.required': 'Status wajib diisi'
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