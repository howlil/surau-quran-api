const Joi = require('joi');
const ValidatorFactory = require('./factory.validation');

class TestimoniValidation {
    static create() {
        return ValidatorFactory.create({
            nama: Joi.string().required()
                .messages({
                    'string.empty': 'Nama tidak boleh kosong',
                    'any.required': 'Nama wajib diisi'
                }),
            posisi: Joi.string().required()
                .messages({
                    'string.empty': 'Posisi tidak boleh kosong',
                    'any.required': 'Posisi wajib diisi'
                }),
            isi: Joi.string().required()
                .messages({
                    'string.empty': 'Isi testimoni tidak boleh kosong',
                    'any.required': 'Isi testimoni wajib diisi'
                }),
            fotoUrl: Joi.string().optional()
                .messages({
                    'string.base': 'FotoUrl harus berupa string'
                })
        });
    }

    static update() {
        return ValidatorFactory.create({
            nama: Joi.string().optional()
                .messages({
                    'string.empty': 'Nama tidak boleh kosong'
                }),
            posisi: Joi.string().optional()
                .messages({
                    'string.empty': 'Posisi tidak boleh kosong'
                }),
            isi: Joi.string().optional()
                .messages({
                    'string.empty': 'Isi testimoni tidak boleh kosong'
                }),
            fotoUrl: Joi.string().optional()
                .messages({
                    'string.base': 'FotoUrl harus berupa string'
                })
        });
    }
}

module.exports = TestimoniValidation; 