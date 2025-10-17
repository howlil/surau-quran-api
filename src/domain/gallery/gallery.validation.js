const joi = require('joi')

class GalleryValidation {
    static createSchema() {
        return joi.object({
            name: joi.string()
                .min(2)
                .max(100)
                .required()
                .messages({
                    'string.min': 'Nama minimal 2 karakter',
                    'string.max': 'Nama maksimal 100 karakter',
                    'any.required': 'Nama wajib diisi'
                })
        })
    }

    static updateSchema() {
        return joi.object({
            name: joi.string()
                .min(2)
                .max(100)
                .optional()
                .messages({
                    'string.min': 'Nama minimal 2 karakter',
                    'string.max': 'Nama maksimal 100 karakter'
                })
        })
    }
}

module.exports = GalleryValidation