const Joi = require('joi');
const ValidatorFactory = require('./factory.validation');

class PayrollValidation {
    static getAllPayrollsForAdmin() {
        return ValidatorFactory.create({
            page: Joi.number().integer().min(1).default(1).optional(),
            limit: Joi.number().integer().min(1).max(100).default(10).optional(),
            monthYear: Joi.string().pattern(/^(0[1-9]|1[0-2])-\d{4}$/).optional()
                .messages({
                    'string.pattern.base': 'Format monthYear harus MM-YYYY (contoh: 06-2025)'
                })
        });
    }

    static getAllPayrollsForGuru() {
        return ValidatorFactory.create({
            page: Joi.number().integer().min(1).default(1).optional(),
            limit: Joi.number().integer().min(1).max(100).default(10).optional(),
            monthYear: Joi.string().pattern(/^(0[1-9]|1[0-2])-\d{4}$/).optional()
                .messages({
                    'string.pattern.base': 'Format monthYear harus MM-YYYY (contoh: 06-2025)'
                })
        });
    }

    static updatePayroll() {
        return ValidatorFactory.create({
            tanggalKalkulasi: Joi.string().pattern(/^(0[1-9]|[12][0-9]|3[01])-(0[1-9]|1[0-2])-\d{4}$/).optional()
                .messages({
                    'string.pattern.base': 'Tanggal harus dalam format DD-MM-YYYY'
                }),
            bulan: Joi.string().pattern(/^(0[1-9]|1[0-2])$/).optional()
                .messages({
                    'string.pattern.base': 'Bulan harus dalam format MM (01-12)'
                }),
            detail: Joi.object({
                mengajar: Joi.object({
                    jumlah: Joi.number().integer().min(0).optional(),
                    rate: Joi.number().min(0).optional()
                }).optional(),
                insentif: Joi.object({
                    jumlah: Joi.number().integer().min(0).optional(),
                    rate: Joi.number().min(0).optional()
                }).optional(),
                potongan: Joi.object({
                    telat: Joi.object({
                        jumlah: Joi.number().integer().min(0).optional(),
                        rate: Joi.number().min(0).optional()
                    }).optional(),
                    izin: Joi.object({
                        jumlah: Joi.number().integer().min(0).optional(),
                        rate: Joi.number().min(0).optional()
                    }).optional(),
                    dll: Joi.object({
                        jumlah: Joi.number().integer().min(0).optional(),
                        rate: Joi.number().min(0).optional()
                    }).optional()
                }).optional()
            }).optional()
        });
    }

    static batchPayrollDisbursement() {
        return ValidatorFactory.create({
            payrollIds: Joi.array().items(
                Joi.string().guid({ version: 'uuidv4' }).required()
            ).min(1).required()
                .messages({
                    'array.min': 'Minimal harus memilih 1 payroll',
                    'any.required': 'Payroll IDs wajib diisi'
                })
        });
    }
}

module.exports = PayrollValidation;