const Joi = require('joi');

class StatisticsValidation {
    static getStudentCounts() {
        return Joi.object({
            startDate: Joi.string().pattern(/^\d{2}-\d{2}-\d{4}$/).optional()
                .messages({
                    'string.pattern.base': 'Format tanggal mulai harus DD-MM-YYYY (contoh: 01-01-2023)'
                }),
            endDate: Joi.string().pattern(/^\d{2}-\d{2}-\d{4}$/).optional()
                .messages({
                    'string.pattern.base': 'Format tanggal akhir harus DD-MM-YYYY (contoh: 31-01-2023)'
                })
        });
    }

    static getFinancialStatistics() {
        return Joi.object({
            startDate: Joi.string().pattern(/^\d{2}-\d{2}-\d{4}$/).optional()
                .messages({
                    'string.pattern.base': 'Format tanggal mulai harus DD-MM-YYYY (contoh: 01-01-2023)'
                }),
            endDate: Joi.string().pattern(/^\d{2}-\d{2}-\d{4}$/).optional()
                .messages({
                    'string.pattern.base': 'Format tanggal akhir harus DD-MM-YYYY (contoh: 31-01-2023)'
                }),
            groupBy: Joi.string().valid('month', 'year').default('month')
                .messages({
                    'any.only': 'Group by harus bernilai month atau year'
                })
        });
    }
}

module.exports = StatisticsValidation; 