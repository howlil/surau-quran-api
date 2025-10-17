const Joi = require('joi');

class KelasValidation {
  static create() {
    return Joi.object({
      namaKelas: Joi.string().required()
        .messages({
          'string.empty': 'Nama kelas tidak boleh kosong',
          'any.required': 'Nama kelas wajib diisi'
        }),
      warnaCard: Joi.string().pattern(/^#[0-9A-Fa-f]{6}$/).optional()
        .messages({
          'string.pattern.base': 'Warna card harus berupa hex color code yang valid (contoh: #FF5733)'
        }),
      ipAddressHikvision: Joi.string().ip({ version: ['ipv4', 'ipv6'], cidr: 'optional' }).optional()
        .messages({
          'string.ip': 'IP Address Hikvision harus berupa alamat IP yang valid. Contoh: 192.168.1.100 atau 2001:db8::1',
          'string.base': 'IP Address Hikvision harus berupa teks'
        })
    });
  }

  static update() {
    return Joi.object({
      namaKelas: Joi.string().optional()
        .messages({
          'string.empty': 'Nama kelas tidak boleh kosong'
        }),
      warnaCard: Joi.string().pattern(/^#[0-9A-Fa-f]{6}$/).optional()
        .messages({
          'string.pattern.base': 'Warna card harus berupa hex color code yang valid (contoh: #FF5733)'
        }),
      ipAddressHikvision: Joi.string().ip({ version: ['ipv4', 'ipv6'], cidr: 'optional' }).optional()
        .messages({
          'string.ip': 'IP Address Hikvision harus berupa alamat IP yang valid. Contoh: 192.168.1.100 atau 2001:db8::1',
          'string.base': 'IP Address Hikvision harus berupa teks'
        })
    });
  }


  static createKelasProgram() {
    return Joi.object({
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
    return Joi.object({
      programId: Joi.string().guid({ version: 'uuidv4' }).optional()
        .messages({
          'string.guid': 'Program ID harus berupa UUID yang valid'
        }),
      hari: Joi.string().valid('SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU').optional()
        .messages({
          'any.only': 'Hari harus salah satu dari: SENIN, SELASA, RABU, KAMIS, JUMAT, SABTU'
        }),
      jamMengajarId: Joi.string().guid({ version: 'uuidv4' }).optional()
        .messages({
          'string.guid': 'Jam Mengajar ID harus berupa UUID yang valid'
        }),
      guruId: Joi.string().guid({ version: 'uuidv4' }).optional()
        .messages({
          'string.guid': 'Guru ID harus berupa UUID yang valid'
        }),
      tambahSiswaIds: Joi.array().items(
        Joi.string().guid({ version: 'uuidv4' })
          .messages({
            'string.guid': 'Setiap Siswa ID harus berupa UUID yang valid'
          })
      ).default([]).optional()
        .messages({
          'array.base': 'Daftar tambah siswa harus berupa array'
        }),
      hapusSiswaIds: Joi.array().items(
        Joi.string().guid({ version: 'uuidv4' })
          .messages({
            'string.guid': 'Setiap Siswa ID harus berupa UUID yang valid'
          })
      ).default([]).optional()
        .messages({
          'array.base': 'Daftar hapus siswa harus berupa array'
        })
    });
  }

  static getInitialStudentQuery() {
    return Joi.object({
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

}

module.exports = KelasValidation;