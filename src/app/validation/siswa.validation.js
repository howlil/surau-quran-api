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
      alamat: Joi.string().min(10).max(500).required()
        .messages({
          'string.min': 'Alamat minimal 10 karakter',
          'string.max': 'Alamat maksimal 500 karakter',
          'any.required': 'Alamat wajib diisi'
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
      noWhatsapp: Joi.string().pattern(/^(\+62|62|0)[0-9]{9,12}$/).max(20).required()
        .messages({
          'string.pattern.base': 'Format nomor WhatsApp tidak valid (contoh: 081234567890)',
          'string.max': 'Nomor WhatsApp maksimal 20 karakter',
          'any.required': 'Nomor WhatsApp wajib diisi'
        }),
      programId: Joi.string().guid({ version: 'uuidv4' }).required()
        .messages({
          'string.guid': 'Program ID harus berupa UUID yang valid',
          'any.required': 'Program ID wajib diisi'
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
      totalBiaya: Joi.number().precision(2).positive()
        .when('kodeVoucher', {
          is: Joi.exist(),
          then: Joi.optional(),
          otherwise: Joi.required()
        })
        .messages({
          'number.base': 'Total biaya harus berupa angka',
          'number.positive': 'Total biaya harus lebih dari 0',
          'any.required': 'Total biaya wajib diisi jika tidak menggunakan voucher'
        }),
    });
  }

  static updateStatusSiswa() {
    return Joi.object({
      programId: Joi.string().guid({ version: 'uuidv4' }).optional()
        .messages({
          'string.guid': 'Program ID harus berupa UUID yang valid'
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
      tanggalLahir: Joi.string().pattern(/^\d{2}-\d{2}-\d{4}$/).optional()
        .messages({
          'string.pattern.base': 'Format tanggal lahir harus DD-MM-YYYY (contoh: 31-12-2000)'
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
      // RFID field
      rfid: Joi.string().min(8).max(50).optional()
        .messages({
          'string.min': 'RFID minimal 8 karakter',
          'string.max': 'RFID maksimal 50 karakter'
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
      // Schedule array for the current program - with identification for updates
      jadwal: Joi.array().items(
        Joi.object({
          id: Joi.string().guid({ version: 'uuidv4' }).optional()
            .messages({
              'string.guid': 'Jadwal ID harus berupa UUID yang valid'
            }),
          hari: Joi.string().valid('SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU').optional()
            .messages({
              'any.only': 'Hari harus salah satu dari: SENIN, SELASA, RABU, KAMIS, JUMAT, SABTU'
            }),
          jamMengajarId: Joi.string().guid({ version: 'uuidv4' }).optional()
            .messages({
              'string.guid': 'Jam Mengajar ID harus berupa UUID yang valid'
            }),
          urutan: Joi.number().integer().valid(1, 2).optional()
            .messages({
              'number.base': 'Urutan harus berupa angka',
              'number.integer': 'Urutan harus berupa bilangan bulat',
              'any.only': 'Urutan harus 1 atau 2'
            }),
          isDeleted: Joi.boolean().optional()
        }).or('hari', 'jamMengajarId', 'id', 'isDeleted')
          .messages({
            'object.missing': 'Jadwal harus memiliki setidaknya salah satu: id, hari, jamMengajarId, urutan, atau isDeleted'
          })
      ).max(2).optional()
        .messages({
          'array.max': 'Jadwal maksimal 2 pilihan'
        })
    });
  }

  static getProfileQuery() {
    return ValidatorFactory.create({
      bulan: Joi.string().pattern(/^\d{2}-\d{4}$/).optional()
        .messages({
          'string.pattern.base': 'Format bulan harus MM-YYYY (contoh: 07-2025)'
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

  static getAllSiswa() {
    return ValidatorFactory.create({
      nama: Joi.string().min(1).max(191).optional()
        .messages({
          'string.min': 'Nama minimal 1 karakter',
          'string.max': 'Nama maksimal 191 karakter'
        }),
      programId: Joi.string().guid({ version: 'uuidv4' }).optional()
        .messages({
          'string.guid': 'Program ID harus berupa UUID yang valid'
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

  static getJadwalSiswa() {
    return ValidatorFactory.create({
      rfid: Joi.string().min(1).max(191).required()
        .messages({
          'string.min': 'RFID minimal 1 karakter',
          'string.max': 'RFID maksimal 191 karakter'
        })
    });
  }

  static pindahProgram() {
    return ValidatorFactory.create({
      programBaruId: Joi.string().guid({ version: 'uuidv4' }).required()
        .messages({
          'string.guid': 'Program Baru ID harus berupa UUID yang valid',
          'any.required': 'Program Baru ID wajib diisi'
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
      ).max(2).optional()
        .messages({
          'array.max': 'Jadwal maksimal 2 pilihan'
        })
    });
  }

  static getPendaftaranInvoiceQuery() {
    return ValidatorFactory.create({
      tanggal: Joi.string().pattern(/^\d{2}-\d{2}-\d{4}$/).optional()
        .messages({
          'string.pattern.base': 'Format tanggal harus DD-MM-YYYY'
        }),
      status: Joi.string().valid('PENDING', 'PAID', 'EXPIRED', 'FAILED').optional()
        .messages({
          'any.only': 'Status harus salah satu dari: PENDING, PAID, EXPIRED, FAILED'
        }),
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

  // Validation untuk pendaftaran V2 dengan support private program
  static pendaftaranSiswaV2() {
    return ValidatorFactory.create({
      siswa: Joi.array().items(
        Joi.object({
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
          alamat: Joi.string().min(10).max(500).required()
            .messages({
              'string.min': 'Alamat minimal 10 karakter',
              'string.max': 'Alamat maksimal 500 karakter',
              'any.required': 'Alamat wajib diisi'
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
      
          noWhatsapp: Joi.string().pattern(/^(\+62|62|0)[0-9]{9,12}$/).max(20).required()
            .messages({
              'string.pattern.base': 'Format nomor WhatsApp tidak valid (contoh: 081234567890)',
              'string.max': 'Nomor WhatsApp maksimal 20 karakter',
              'any.required': 'Nomor WhatsApp wajib diisi'
            })
        })
      ).min(1).max(4).required()
        .messages({
          'array.min': 'Minimal 1 siswa',
          'array.max': 'Maksimal 4 siswa untuk private bersaudara',
          'any.required': 'Data siswa wajib diisi'
        }),

      programId: Joi.string().guid({ version: 'uuidv4' }).required()
        .messages({
          'string.guid': 'Program ID harus berupa UUID yang valid',
          'any.required': 'Program ID wajib diisi'
        }),

      biayaPendaftaran: Joi.number().precision(2).positive().required()
        .messages({
          'number.base': 'Biaya pendaftaran harus berupa angka',
          'number.positive': 'Biaya pendaftaran harus lebih dari 0',
          'any.required': 'Biaya pendaftaran wajib diisi'
        }),

      isFamily: Joi.boolean().default(false)
        .messages({
          'boolean.base': 'isFamily harus berupa boolean'
        }),

      hubunganKeluarga: Joi.string()
        .when('isFamily', {
          is: true,
          then: Joi.string().valid('SEDARAH', 'TIDAK_SEDARAH').required(),
          otherwise: Joi.optional()
        })
        .messages({
          'any.only': 'Hubungan keluarga harus SEDARAH atau TIDAK_SEDARAH',
          'any.required': 'Hubungan keluarga wajib diisi untuk private bersaudara'
        }),

      jenisHubungan: Joi.string()
        .when('hubunganKeluarga', {
          is: 'TIDAK_SEDARAH',
          then: Joi.string().valid('SEPUPU', 'KEPONAKAN', 'TETANGGA', 'TEMAN', 'LAINNYA').required(),
          otherwise: Joi.optional()
        })
        .messages({
          'any.only': 'Jenis hubungan harus salah satu dari: SEPUPU, KEPONAKAN, TETANGGA, TEMAN, LAINNYA',
          'any.required': 'Jenis hubungan wajib diisi untuk hubungan tidak sedarah'
        }),

      kodeVoucher: Joi.string().uppercase().min(3).max(50).optional()
        .messages({
          'string.min': 'Kode voucher minimal 3 karakter',
          'string.max': 'Kode voucher maksimal 50 karakter'
        }),

      totalBiaya: Joi.number().precision(2).positive().required()
        .messages({
          'number.base': 'Total biaya harus berupa angka',
          'number.positive': 'Total biaya harus lebih dari 0',
          'any.required': 'Total biaya wajib diisi'
        })
    });
  }
}

module.exports = SiswaValidation;