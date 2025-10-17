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


}

module.exports = KelasValidation;