const Joi = require('joi');

class GaleriValidation {
    static create() {
        return Joi.object({
            judulFoto: Joi.string().required()
                .messages({
                    'string.empty': 'Judul foto tidak boleh kosong',
                    'any.required': 'Judul foto wajib diisi'
                }),
            coverGaleri: Joi.any().optional()
                .messages({
                    'string.empty': 'Cover galeri tidak boleh kosong'
                })
        });
    }

    static update() {
        return Joi.object({
            judulFoto: Joi.string().optional()
                .messages({
                    'string.empty': 'Judul foto tidak boleh kosong'
                }),
            coverGaleri: Joi.any().optional()
        });
    }

    static getGaleriQuery() {
        return Joi.object({
            judul: Joi.string().min(1).max(191).optional()
                .messages({
                    'string.min': 'Judul minimal 1 karakter',
                    'string.max': 'Judul maksimal 191 karakter'
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

module.exports = GaleriValidation; 