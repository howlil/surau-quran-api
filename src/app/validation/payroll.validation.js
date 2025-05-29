const Joi = require('joi');
const ValidatorFactory = require('./factory.validation');

class PayrollValidation {
    static updatePayroll() {
        return ValidatorFactory.create({
            gajiPokok: Joi.number().min(0).optional(),
            insentif: Joi.number().min(0).optional(),
            potongan: Joi.number().min(0).optional(),
            status: Joi.string().valid('DRAFT', 'DIPROSES', 'SELESAI', 'GAGAL').optional()
        });
    }
}

module.exports = PayrollValidation;