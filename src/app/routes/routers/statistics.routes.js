const express = require('express');
const router = express.Router();
const validationMiddleware = require('../../middleware/validation.middleware');
const authMiddleware = require('../../middleware/auth.middleware');
const statisticsController = require('../../controller/statistics.controller');
const statisticsValidation = require('../../validation/statistics.validation');

// Admin: Get student counts with date filtering
router.get(
    '/v1/statistics/student-counts',
    authMiddleware.authenticate,
    authMiddleware.authorize(['ADMIN']),
    validationMiddleware.validateQuery(statisticsValidation.getStudentCounts()),
    statisticsController.getStudentCounts
);

// Admin: Get financial statistics for graphs
router.get(
    '/v1/statistics/financial',
    authMiddleware.authenticate,
    authMiddleware.authorize(['ADMIN']),
    validationMiddleware.validateQuery(statisticsValidation.getFinancialStatistics()),
    statisticsController.getFinancialStatistics
);

// Admin: Get student distribution across classes
router.get(
    '/v1/statistics/student-distribution',
    authMiddleware.authenticate,
    authMiddleware.authorize(['ADMIN']),
    statisticsController.getStudentDistribution
);

module.exports = router; 