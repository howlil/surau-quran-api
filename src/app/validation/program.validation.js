const Joi = require('joi');
const ValidatorFactory = require('./factory.validation');

class ProgramValidation {
  static create() {
    return ValidatorFactory.create({
      namaProgram: Joi.string().required()
        .messages({
          'string.empty': 'Nama program tidak boleh kosong',
          'any.required': 'Nama program wajib diisi'
        }),
      deskripsi: Joi.string().required()
        .messages({
          'string.empty': 'Deskripsi tidak boleh kosong',
          'any.required': 'Deskripsi wajib diisi'
        }),
      cover: Joi.string().optional()
        .messages({
          'string.base': 'Cover harus berupa string'
        })
    });
  }

  static update() {
    return ValidatorFactory.create({
      namaProgram: Joi.string().optional()
        .messages({
          'string.empty': 'Nama program tidak boleh kosong'
        }),
      deskripsi: Joi.string().optional()
        .messages({
          'string.empty': 'Deskripsi tidak boleh kosong'
        }),
      cover: Joi.string().optional()
        .messages({
          'string.base': 'Cover harus berupa string'
        })
    });
  }

  static addKelasPengganti() {
    return ValidatorFactory.create({
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
    return ValidatorFactory.create({
      kelasProgramId: Joi.string().guid({ version: 'uuidv4' }).required().messages({
        'string.guid': 'Kelas Program ID harus berupa UUID yang valid',
        'any.required': 'Kelas Program ID wajib diisi'
      })
    });
  }
}


module.exports = ProgramValidation;