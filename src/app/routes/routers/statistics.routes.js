const express = require('express');
const router = express.Router();
const validationMiddleware = require('../../middleware/validation.middleware');
const authMiddleware = require('../../middleware/auth.middleware');
const statisticsController = require('../../controller/statistics.controller');
const statisticsValidation = require('../../validation/statistics.validation');

router.get(
    '/v1/statistics/student-counts',
    authMiddleware.authenticate,
    authMiddleware.authorize(['SUPER_ADMIN', 'ADMIN_SURAU', 'ADMIN']),
    validationMiddleware.validateQuery(statisticsValidation.getStudentCounts()),
    statisticsController.getStudentCounts
);

router.get(
    '/v1/statistics/financial',
    authMiddleware.authenticate,
    authMiddleware.authorize(['SUPER_ADMIN', 'ADMIN_SURAU', 'ADMIN']),
    validationMiddleware.validateQuery(statisticsValidation.getFinancialStatistics()),
    statisticsController.getFinancialStatistics
);

router.get(
    '/v1/statistics/student-distribution',
    authMiddleware.authenticate,
    authMiddleware.authorize(['SUPER_ADMIN', 'ADMIN_SURAU', 'ADMIN']),
    statisticsController.getStudentDistribution
);

router.get(
    '/v1/schedules/today',
    statisticsController.getTodaySchedule
);

module.exports = router; 