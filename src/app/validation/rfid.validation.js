const Joi = require('joi');
const ValidatorFactory = require('./factory.validation');

class RfidValidation {
    static searchUser() {
        return ValidatorFactory.create({
            search: Joi.string().min(1).max(191).optional()
                .messages({
                    'string.min': 'Search minimal 1 karakter',
                    'string.max': 'Search maksimal 191 karakter'
                }),
            role: Joi.string().valid('GURU', 'SISWA').optional()
                .messages({
                    'any.only': 'Role harus GURU atau SISWA'
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

    static registerRfid() {
        return ValidatorFactory.create({
            userId: Joi.string().guid({ version: 'uuidv4' }).required()
                .messages({
                    'string.guid': 'User ID harus berupa UUID yang valid',
                    'any.required': 'User ID wajib diisi'
                }),
            rfid: Joi.string().min(8).max(50).required()
                .messages({
                    'string.min': 'RFID minimal 8 karakter',
                    'string.max': 'RFID maksimal 50 karakter',
                    'any.required': 'RFID wajib diisi'
                })
        });
    }

    static updateRfid() {
        return ValidatorFactory.create({
            rfid: Joi.string().min(8).max(50).required()
                .messages({
                    'string.min': 'RFID minimal 8 karakter',
                    'string.max': 'RFID maksimal 50 karakter',
                    'any.required': 'RFID wajib diisi'
                })
        });
    }

    static getRfidList() {
        return ValidatorFactory.create({
            search: Joi.string().min(1).max(191).optional()
                .messages({
                    'string.min': 'Search minimal 1 karakter',
                    'string.max': 'Search maksimal 191 karakter'
                }),
            role: Joi.string().valid('GURU', 'SISWA').optional()
                .messages({
                    'any.only': 'Role harus GURU atau SISWA'
                }),
            hasRfid: Joi.boolean().optional()
                .messages({
                    'boolean.base': 'Has RFID harus berupa boolean'
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

module.exports = RfidValidation; 