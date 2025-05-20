const Joi = require('joi');
const ValidatorFactory = require('./factory.validation');

class StatisticsValidation {
    static getStudentCounts() {
        return ValidatorFactory.create({
            startDate: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).optional()
                .messages({
                    'string.pattern.base': 'Format tanggal mulai harus YYYY-MM-DD (contoh: 2023-01-01)'
                }),
            endDate: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).optional()
                .messages({
                    'string.pattern.base': 'Format tanggal akhir harus YYYY-MM-DD (contoh: 2023-01-31)'
                })
        });
    }

    static getFinancialStatistics() {
        return ValidatorFactory.create({
            startDate: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).optional()
                .messages({
                    'string.pattern.base': 'Format tanggal mulai harus YYYY-MM-DD (contoh: 2023-01-01)'
                }),
            endDate: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).optional()
                .messages({
                    'string.pattern.base': 'Format tanggal akhir harus YYYY-MM-DD (contoh: 2023-01-31)'
                }),
            groupBy: Joi.string().valid('month', 'year').default('month')
                .messages({
                    'any.only': 'Group by harus bernilai month atau year'
                })
        });
    }
}

module.exports = StatisticsValidation; 