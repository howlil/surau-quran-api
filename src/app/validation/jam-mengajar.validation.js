const Joi = require('joi');
const ValidatorFactory = require('./factory.validation');

class JamMengajarValidation {
  static create() {
    return ValidatorFactory.create(
      Joi.object({
        jamMulai: Joi.string()
          .pattern(/^([01]\d|2[0-3]):([0-5]\d)$/)
          .required()
          .messages({
            'string.empty': 'Jam mulai tidak boleh kosong',
            'any.required': 'Jam mulai wajib diisi',
            'string.pattern.base': 'Format jam mulai harus HH:MM (24 jam)'
          }),

        jamSelesai: Joi.string()
          .pattern(/^([01]\d|2[0-3]):([0-5]\d)$/)
          .required()
          .messages({
            'string.empty': 'Jam selesai tidak boleh kosong',
            'any.required': 'Jam selesai wajib diisi',
            'string.pattern.base': 'Format jam selesai harus HH:MM (24 jam)'
          })
      }).custom((value, helpers) => {
        const [startHour, startMinute] = value.jamMulai.split(':').map(Number);
        const [endHour, endMinute] = value.jamSelesai.split(':').map(Number);
        const start = startHour * 60 + startMinute;
        const end = endHour * 60 + endMinute;

        if (start >= end) {
          return helpers.error('any.invalid', { message: 'Jam mulai harus lebih kecil dari jam selesai' });
        }

        return value;
      }).messages({
        'any.invalid': '{{#message}}'
      })
    );
  }


  static update() {
    return ValidatorFactory.create(
      Joi.object({
        jamMulai: Joi.string()
          .pattern(/^([01]\d|2[0-3]):([0-5]\d)$/)
          .optional()
          .messages({
            'string.empty': 'Jam mulai tidak boleh kosong',
            'any.required': 'Jam mulai wajib diisi',
            'string.pattern.base': 'Format jam mulai harus HH:MM (24 jam)'
          }),

        jamSelesai: Joi.string()
          .pattern(/^([01]\d|2[0-3]):([0-5]\d)$/)
          .optional()
          .messages({
            'string.empty': 'Jam selesai tidak boleh kosong',
            'any.required': 'Jam selesai wajib diisi',
            'string.pattern.base': 'Format jam selesai harus HH:MM (24 jam)'
          })
      }).custom((value, helpers) => {
        const [startHour, startMinute] = value.jamMulai.split(':').map(Number);
        const [endHour, endMinute] = value.jamSelesai.split(':').map(Number);
        const start = startHour * 60 + startMinute;
        const end = endHour * 60 + endMinute;

        if (start >= end) {
          return helpers.error('any.invalid', { message: 'Jam mulai harus lebih kecil dari jam selesai' });
        }

        return value;
      }).messages({
        'any.invalid': '{{#message}}'
      })
    );
  }

}

module.exports = JamMengajarValidation;