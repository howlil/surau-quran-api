const Joi = require('joi');

class TestimoniValidation {
    static create() {
        return Joi.object({
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
        return Joi.object({
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

    static getTestimoniQuery() {
        return Joi.object({
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
}

module.exports = TestimoniValidation; 