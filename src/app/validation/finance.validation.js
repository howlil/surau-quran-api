const Joi = require('joi');
const moment = require('moment');

// Define valid categories based on type
const INCOME_CATEGORIES = ['SPP', 'ENROLLMENT', 'DONATION', 'OTHER_INCOME'];
const EXPENSE_CATEGORIES = ['PAYROLL_SALARY', 'OPERATIONAL', 'UTILITIES', 'MAINTENANCE', 'MARKETING', 'SUPPLIES', 'OTHER_EXPENSE'];
const ALL_CATEGORIES = [...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES];

class FinanceValidation {
    static create() {
        return Joi.object({
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
        return Joi.object({
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
        return ValidatorFactory.create(
            Joi.object({
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
                type: Joi.string().valid('INCOME', 'EXPENSE').optional()
                    .messages({
                        'any.only': 'Type harus INCOME atau EXPENSE'
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
            }).custom((value, helpers) => {
                const { startDate, endDate } = value;

                // Jika ada endDate, harus ada startDate
                if (endDate && !startDate) {
                    return helpers.error('any.invalid', {
                        message: 'Jika menggunakan endDate, startDate juga harus diisi'
                    });
                }

                // Jika ada kedua tanggal, validasi startDate < endDate
                if (startDate && endDate) {
                    const start = moment(startDate, 'DD-MM-YYYY');
                    const end = moment(endDate, 'DD-MM-YYYY');

                    if (!start.isValid() || !end.isValid()) {
                        return helpers.error('any.invalid', {
                            message: 'Format tanggal tidak valid'
                        });
                    }

                    if (start.isAfter(end)) {
                        return helpers.error('any.invalid', {
                            message: 'StartDate harus lebih kecil atau sama dengan endDate'
                        });
                    }
                }

                return value;
            }).messages({
                'any.invalid': '{{#message}}'
            })
        );
    }
}

module.exports = FinanceValidation; 