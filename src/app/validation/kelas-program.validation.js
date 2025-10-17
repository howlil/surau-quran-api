const Joi = require('joi');

class KelasProgramValidation {

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

  static addKelasPengganti() {
    return Joi.object({
      kelasProgramId: Joi.string().required().messages({
        'string.empty': 'ID Kelas Program wajib diisi',
        'any.required': 'ID Kelas Program wajib diisi'
      }),
      siswaId: Joi.string().required().messages({
        'string.empty': 'ID Siswa wajib diisi',
        'any.required': 'ID Siswa wajib diisi'
      }),
      tanggal: Joi.string()
        .pattern(/^([0-2][0-9]|(3)[0-1])-(0[1-9]|1[0-2])-[0-9]{4}$/)
        .required()
        .messages({
          'string.empty': 'Tanggal wajib diisi',
          'any.required': 'Tanggal wajib diisi',
          'string.pattern.base': 'Tanggal harus dalam format DD-MM-YYYY'
        })
    });
  }

  static removeKelasPengganti() {
    return Joi.object({
      kelasProgramId: Joi.string().guid({ version: 'uuidv4' }).required().messages({
        'string.guid': 'Kelas Program ID harus berupa UUID yang valid',
        'any.required': 'Kelas Program ID wajib diisi'
      })
    });
  }
}

module.exports = KelasProgramValidation;
