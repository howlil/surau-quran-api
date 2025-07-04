const Joi = require('joi');
const ValidatorFactory = require('./factory.validation');

class GaleriValidation {
    static create() {
        return ValidatorFactory.create({
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
        return ValidatorFactory.create({
            judulFoto: Joi.string().optional()
                .messages({
                    'string.empty': 'Judul foto tidak boleh kosong'
                }),
            coverGaleri: Joi.any().optional()
        });
    }
}

module.exports = GaleriValidation; 