const Joi = require('joi');
const ValidatorFactory = require('./factory.validation');

class SppValidation {
    static getSppForAdmin() {
        return ValidatorFactory.create({
            status: Joi.string().valid(
                'UNPAID',
                'PENDING',
                'PAID',
                'SETTLED',
                'EXPIRED',
                'INACTIVE',
                'ACTIVE',
                'STOPPED'
            ).optional()
                .messages({
                    'any.only': 'Status pembayaran tidak valid'
                }),
            bulan: Joi.string().pattern(/^(0[1-9]|1[0-2])-\d{4}$/).optional()
                .messages({
                    'string.pattern.base': 'Format bulan harus MM-YYYY (contoh: 01-2025, 12-2024)'
                }),
            namaSiswa: Joi.string().min(1).optional()
                .messages({
                    'string.min': 'Nama siswa minimal 1 karakter'
                }),
            page: Joi.number().integer().min(1).optional()
                .messages({
                    'number.base': 'Halaman harus berupa angka',
                    'number.integer': 'Halaman harus berupa angka bulat',
                    'number.min': 'Halaman minimal 1'
                }),
            limit: Joi.number().integer().min(1).max(100).optional()
                .messages({
                    'number.base': 'Limit harus berupa angka',
                    'number.integer': 'Limit harus berupa angka bulat',
                    'number.min': 'Limit minimal 1',
                    'number.max': 'Limit maksimal 100'
                })
        });
    }

    static getSppForSiswa() {
        return ValidatorFactory.create({

            page: Joi.number().integer().min(1).optional()
                .messages({
                    'number.base': 'Halaman harus berupa angka',
                    'number.integer': 'Halaman harus berupa angka bulat',
                    'number.min': 'Halaman minimal 1'
                }),
            limit: Joi.number().integer().min(1).max(100).optional()
                .messages({
                    'number.base': 'Limit harus berupa angka',
                    'number.integer': 'Limit harus berupa angka bulat',
                    'number.min': 'Limit minimal 1',
                    'number.max': 'Limit maksimal 100'
                })
        });
    }
}

module.exports = SppValidation; 