const Joi = require('joi');
const ValidatorFactory = require('./factory.validation');

class SiswaValidation {
  static preRegisterSiswa() {
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

  static registerSiswa() {
    return ValidatorFactory.create({
      // User credentials
      email: Joi.string().email().max(191).required()
        .messages({
          'string.email': 'Email harus valid',
          'string.max': 'Email maksimal 191 karakter',
          'any.required': 'Email wajib diisi'
        }),
      password: Joi.string()
        .min(6)
        .max(100)
        .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+])[A-Za-z\d!@#$%^&*()_+]/)
        .required()
        .messages({
          'string.min': 'Password minimal 6 karakter',
          'string.max': 'Password maksimal 100 karakter',
          'string.pattern.base': 'Password harus mengandung huruf besar, huruf kecil, angka, dan karakter khusus',
          'any.required': 'Password wajib diisi'
        }),

      // Siswa data
      siswaData: Joi.object({
        noWhatsapp: Joi.string().pattern(/^(\+62|62|0)[0-9]{9,12}$/).max(20).optional()
          .messages({
            'string.pattern.base': 'Format nomor WhatsApp tidak valid (contoh: 081234567890)',
            'string.max': 'Nomor WhatsApp maksimal 20 karakter'
          }),
        namaMurid: Joi.string().min(2).max(191).required()
          .messages({
            'string.min': 'Nama murid minimal 2 karakter',
            'string.max': 'Nama murid maksimal 191 karakter',
            'any.required': 'Nama murid wajib diisi'
          }),
        namaPanggilan: Joi.string().min(2).max(191).optional()
          .messages({
            'string.min': 'Nama panggilan minimal 2 karakter',
            'string.max': 'Nama panggilan maksimal 191 karakter'
          }),
        tanggalLahir: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).optional()
          .messages({
            'string.pattern.base': 'Format tanggal lahir harus YYYY-MM-DD (contoh: 2000-12-31)'
          }),
        jenisKelamin: Joi.string().valid('LAKI_LAKI', 'PEREMPUAN').required()
          .messages({
            'any.only': 'Jenis kelamin harus LAKI_LAKI atau PEREMPUAN',
            'any.required': 'Jenis kelamin wajib diisi'
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
        namaOrangTua: Joi.string().min(2).max(191).optional()
          .messages({
            'string.min': 'Nama orang tua minimal 2 karakter',
            'string.max': 'Nama orang tua maksimal 191 karakter'
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

  static updateProfile() {
    return ValidatorFactory.create({
      email: Joi.string().email().max(191).optional()
        .messages({
          'string.email': 'Email harus valid',
          'string.max': 'Email maksimal 191 karakter'
        }),
      noWhatsapp: Joi.string().pattern(/^(\+62|62|0)[0-9]{9,12}$/).max(20).optional()
        .messages({
          'string.pattern.base': 'Format nomor WhatsApp tidak valid (contoh: 081234567890)',
          'string.max': 'Nomor WhatsApp maksimal 20 karakter'
        }),
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
      tanggalLahir: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).optional()
        .messages({
          'string.pattern.base': 'Format tanggal lahir harus YYYY-MM-DD (contoh: 2000-12-31)'
        }),
      jenisKelamin: Joi.string().valid('LAKI_LAKI', 'PEREMPUAN').optional()
        .messages({
          'any.only': 'Jenis kelamin harus LAKI_LAKI atau PEREMPUAN'
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
      namaOrangTua: Joi.string().min(2).max(191).optional()
        .messages({
          'string.min': 'Nama orang tua minimal 2 karakter',
          'string.max': 'Nama orang tua maksimal 191 karakter'
        }),
      namaPenjemput: Joi.string().min(2).max(191).optional()
        .messages({
          'string.min': 'Nama penjemput minimal 2 karakter',
          'string.max': 'Nama penjemput maksimal 191 karakter'
        })
    });
  }

  static getById() {
    return ValidatorFactory.create({
      id: Joi.string().guid({ version: 'uuidv4' }).required()
        .messages({
          'string.guid': 'ID siswa harus berupa UUID yang valid',
          'any.required': 'ID siswa wajib diisi'
        })
    });
  }

  static getRegistrationStatus() {
    return ValidatorFactory.create({
      tempId: Joi.number().integer().positive().required()
        .messages({
          'number.base': 'Temp ID harus berupa angka',
          'number.integer': 'Temp ID harus berupa bilangan bulat',
          'number.positive': 'Temp ID harus lebih dari 0',
          'any.required': 'Temp ID wajib diisi'
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
      namaMurid: Joi.string().min(1).max(191).allow('', null)
        .messages({
          'string.min': 'Nama murid minimal 1 karakter untuk pencarian',
          'string.max': 'Nama murid maksimal 191 karakter'
        }),
      isRegistered: Joi.string().valid('true', 'false').allow('', null)
        .messages({
          'any.only': 'isRegistered harus berupa "true" atau "false"'
        }),
      strataPendidikan: Joi.string().valid('PAUD', 'TK', 'SD', 'SMP', 'SMA', 'KULIAH', 'UMUM').allow('', null)
        .messages({
          'any.only': 'Strata pendidikan harus salah satu dari: PAUD, TK, SD, SMP, SMA, KULIAH, UMUM'
        }),
      jenisKelamin: Joi.string().valid('LAKI_LAKI', 'PEREMPUAN').allow('', null)
        .messages({
          'any.only': 'Jenis kelamin harus LAKI_LAKI atau PEREMPUAN'
        })
    });
  }

  static delete() {
    return ValidatorFactory.create({
      id: Joi.string().guid({ version: 'uuidv4' }).required()
        .messages({
          'string.guid': 'ID siswa harus berupa UUID yang valid',
          'any.required': 'ID siswa wajib diisi'
        })
    });
  }

  // Add new validation methods for admin functionality
  static getAllDetailed() {
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
      search: Joi.string().min(1).max(100).optional()
        .messages({
          'string.min': 'Pencarian minimal 1 karakter',
          'string.max': 'Pencarian maksimal 100 karakter'
        }),
      programId: Joi.string().guid({ version: 'uuidv4' }).optional()
        .messages({
          'string.guid': 'Program ID harus berupa UUID yang valid'
        }),
      strataPendidikan: Joi.string().valid('PAUD', 'TK', 'SD', 'SMP', 'SMA', 'KULIAH', 'UMUM').optional()
        .messages({
          'any.only': 'Strata pendidikan harus salah satu dari: PAUD, TK, SD, SMP, SMA, KULIAH, UMUM'
        }),
      jenisKelamin: Joi.string().valid('LAKI_LAKI', 'PEREMPUAN').optional()
        .messages({
          'any.only': 'Jenis kelamin harus LAKI_LAKI atau PEREMPUAN'
        }),
      status: Joi.string().valid('AKTIF', 'TIDAK_AKTIF', 'CUTI').optional()
        .messages({
          'any.only': 'Status harus salah satu dari: AKTIF, TIDAK_AKTIF, CUTI'
        })
    });
  }

  static updateDetailedSiswa() {
    return ValidatorFactory.create({
      // Email (optional)
      email: Joi.string().email().max(191).optional()
        .messages({
          'string.email': 'Email harus valid',
          'string.max': 'Email maksimal 191 karakter'
        }),

      // Siswa data (optional)
      siswaData: Joi.object({
        noWhatsapp: Joi.string().pattern(/^(\+62|62|0)[0-9]{9,12}$/).max(20).optional()
          .messages({
            'string.pattern.base': 'Format nomor WhatsApp tidak valid (contoh: 081234567890)',
            'string.max': 'Nomor WhatsApp maksimal 20 karakter'
          }),
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
        tanggalLahir: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).optional()
          .messages({
            'string.pattern.base': 'Format tanggal lahir harus YYYY-MM-DD (contoh: 2000-12-31)'
          }),
        jenisKelamin: Joi.string().valid('LAKI_LAKI', 'PEREMPUAN').optional()
          .messages({
            'any.only': 'Jenis kelamin harus LAKI_LAKI atau PEREMPUAN'
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
        isRegistered: Joi.boolean().optional()
      }).optional(),

      // Pendaftaran data (optional)
      pendaftaranData: Joi.object({
        biayaPendaftaran: Joi.number().precision(2).positive().min(10000).max(100000000).optional()
          .messages({
            'number.base': 'Biaya pendaftaran harus berupa angka',
            'number.positive': 'Biaya pendaftaran harus lebih dari 0',
            'number.min': 'Biaya pendaftaran minimal Rp 10.000',
            'number.max': 'Biaya pendaftaran maksimal Rp 100.000.000'
          }),
        diskon: Joi.number().precision(2).min(0).max(100000000).optional()
          .messages({
            'number.base': 'Diskon harus berupa angka',
            'number.min': 'Diskon minimal 0',
            'number.max': 'Diskon maksimal Rp 100.000.000'
          }),
        totalBiaya: Joi.number().precision(2).min(0).max(100000000).optional()
          .messages({
            'number.base': 'Total biaya harus berupa angka',
            'number.min': 'Total biaya minimal 0',
            'number.max': 'Total biaya maksimal Rp 100.000.000'
          }),
        statusVerifikasi: Joi.string().valid('MENUNGGU', 'DIVERIFIKASI').optional()
          .messages({
            'any.only': 'Status verifikasi harus MENUNGGU atau DIVERIFIKASI'
          })
      }).optional(),

      // Pendaftaran jadwal data (optional, as array)
      pendaftaranJadwalData: Joi.array().items(
        Joi.object({
          id: Joi.string().guid({ version: 'uuidv4' }).optional()
            .messages({
              'string.guid': 'Jadwal ID harus berupa UUID yang valid'
            }),
          pendaftaranId: Joi.string().guid({ version: 'uuidv4' }).optional()
            .messages({
              'string.guid': 'Pendaftaran ID harus berupa UUID yang valid'
            }),
          hari: Joi.string().valid('Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu').optional()
            .messages({
              'any.only': 'Hari harus salah satu dari: Senin, Selasa, Rabu, Kamis, Jumat, Sabtu, Minggu'
            }),
          jamMengajarId: Joi.string().guid({ version: 'uuidv4' }).optional()
            .messages({
              'string.guid': 'Jam Mengajar ID harus berupa UUID yang valid'
            })
        })
      ).optional()
    });
  }
}

module.exports = SiswaValidation;