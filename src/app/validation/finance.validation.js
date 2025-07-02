const Joi = require('joi');
const ValidatorFactory = require('./factory.validation');

// Define valid categories based on type
const INCOME_CATEGORIES = ['SPP', 'ENROLLMENT', 'DONATION', 'OTHER_INCOME'];
const EXPENSE_CATEGORIES = ['PAYROLL_SALARY', 'OPERATIONAL', 'UTILITIES', 'MAINTENANCE', 'MARKETING', 'SUPPLIES', 'OTHER_EXPENSE'];
const ALL_CATEGORIES = [...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES];

class FinanceValidation {
    static create() {
        return ValidatorFactory.create({
            tanggal: Joi.string()
                .pattern(/^\d{2}-\d{2}-\d{4}$/)
                .required()
                .messages({
                    'string.pattern.base': 'Format tanggal harus DD-MM-YYYY',
                    'any.required': 'Tanggal wajib diisi'
                }),
            deskripsi: Joi.string().required()
                .messages({
                    'string.empty': 'Deskripsi tidak boleh kosong',
                    'any.required': 'Deskripsi wajib diisi'
                }),
            type: Joi.string().valid('INCOME', 'EXPENSE').required()
                .messages({
                    'any.only': 'Type harus INCOME atau EXPENSE',
                    'any.required': 'Type wajib diisi'
                }),
            category: Joi.string().valid(...ALL_CATEGORIES).required()
                .messages({
                    'any.only': 'Category tidak valid',
                    'any.required': 'Category wajib diisi'
                }),
            total: Joi.number().positive().required()
                .messages({
                    'number.base': 'Total harus berupa angka',
                    'number.positive': 'Total harus lebih dari 0',
                    'any.required': 'Total wajib diisi'
                }),
            evidence: Joi.string().optional()
                .messages({
                    'string.base': 'Evidence harus berupa string'
                })
        });
    }

    static update() {
        return ValidatorFactory.create({
            tanggal: Joi.string()
                .pattern(/^\d{2}-\d{2}-\d{4}$/)
                .optional()
                .messages({
                    'string.pattern.base': 'Format tanggal harus DD-MM-YYYY'
                }),
            deskripsi: Joi.string().optional()
                .messages({
                    'string.empty': 'Deskripsi tidak boleh kosong'
                }),
            type: Joi.string().valid('INCOME', 'EXPENSE').optional()
                .messages({
                    'any.only': 'Type harus INCOME atau EXPENSE'
                }),
            category: Joi.string().valid(...ALL_CATEGORIES).optional()
                .messages({
                    'any.only': 'Category tidak valid'
                }),
            total: Joi.number().positive().optional()
                .messages({
                    'number.base': 'Total harus berupa angka',
                    'number.positive': 'Total harus lebih dari 0'
                }),
            evidence: Joi.string().optional()
                .messages({
                    'string.base': 'Evidence harus berupa string'
                })
        });
    }

    static getFinanceQuery() {
        return ValidatorFactory.create({
            startDate: Joi.string()
                .pattern(/^\d{2}-\d{2}-\d{4}$/)
                .optional()
                .messages({
                    'string.pattern.base': 'Format startDate harus DD-MM-YYYY'
                }),
            endDate: Joi.string()
                .pattern(/^\d{2}-\d{2}-\d{4}$/)
                .optional()
                .messages({
                    'string.pattern.base': 'Format endDate harus DD-MM-YYYY'
                }),
            type: Joi.string().valid('INCOME', 'EXPENSE').required()
                .messages({
                    'any.only': 'Type harus INCOME atau EXPENSE',
                    'any.required': 'Type wajib diisi'
                })
        });
    }
}

module.exports = FinanceValidation; 