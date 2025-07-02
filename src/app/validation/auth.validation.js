const Joi = require('joi');
const ValidatorFactory = require('./factory.validation');

class AuthValidation {
  static login() {
    return ValidatorFactory.create({
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
        })
    });
  }

  static createGuru() {
    return ValidatorFactory.create({
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
      nama: Joi.string().required()
        .messages({
          'any.required': 'Nama wajib diisi'
        }),
      noWhatsapp: Joi.string().pattern(/^[0-9]+$/).optional()
        .messages({
          'string.pattern.base': 'Nomor WhatsApp hanya boleh berisi angka'
        }),
      alamat: Joi.string().optional(),
      jenisKelamin: Joi.string().valid('LAKI_LAKI', 'PEREMPUAN').optional(),
      keahlian: Joi.string().optional(),
      pendidikanTerakhir: Joi.string().optional(),
      noRekening: Joi.string().pattern(/^[0-9]+$/).optional()
        .messages({
          'string.pattern.base': 'Nomor rekening hanya boleh berisi angka'
        }),
      namaBank: Joi.string().optional(),
      tarifPerJam: Joi.number().precision(2).positive().required()
        .messages({
          'number.base': 'Tarif per jam harus berupa angka',
          'number.positive': 'Tarif per jam harus lebih dari 0',
          'any.required': 'Tarif per jam wajib diisi'
        })
    });
  }

  static createAdmin() {
    return ValidatorFactory.create({
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
      nama: Joi.string().required()
        .messages({
          'any.required': 'Nama wajib diisi'
        })
    });
  }

  static updateAdmin() {
    return ValidatorFactory.create({
      email: Joi.string().email().optional()
        .messages({
          'string.email': 'Email harus valid'
        }),
      password: Joi.string()
        .min(6)
        .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+])[A-Za-z\d!@#$%^&*()_+]/)
        .optional()
        .messages({
          'string.min': 'Password minimal 6 karakter',
          'string.pattern.base': 'Password harus mengandung huruf besar, huruf kecil, angka, dan karakter khusus',
        }),
      nama: Joi.string().optional()
    });
  }

  static forgotPassword() {
    return ValidatorFactory.create({
      email: Joi.string()
        .email()
        .required()
        .messages({
          'string.email': 'Format email tidak valid',
          'any.required': 'Email harus diisi'
        })
    });
  }

  static resetPassword() {
    return ValidatorFactory.create({
      token: Joi.string()
        .required()
        .messages({
          'any.required': 'Token reset password harus diisi'
        }),
      newPassword: Joi.string()
        .min(8)
        .required()
        .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .messages({
          'string.min': 'Password minimal 8 karakter',
          'string.pattern.base': 'Password harus mengandung huruf besar, huruf kecil, dan angka',
          'any.required': 'Password baru harus diisi'
        })
    });
  }

  static changePassword() {
    return ValidatorFactory.create({
      oldPassword: Joi.string()
        .required()
        .messages({
          'any.required': 'Password lama harus diisi'
        }),
      newPassword: Joi.string()
        .min(6)
        .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+])[A-Za-z\d!@#$%^&*()_+]/)
        .required()
        .messages({
          'string.min': 'Password baru minimal 6 karakter',
          'string.pattern.base': 'Password baru harus mengandung huruf besar, huruf kecil, angka, dan karakter khusus',
          'any.required': 'Password baru harus diisi'
        })
    });
  }
}

module.exports = AuthValidation;