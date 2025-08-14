const express = require('express');
const router = express.Router();
const validationMiddleware = require('../../middleware/validation.middleware');
const authMiddleware = require('../../middleware/auth.middleware');
const { uploadEvidenceMiddleware } = require('../../middleware/upload.middleware');
const FinanceController = require('../../controller/finance.controller');
const FinanceValidation = require('../../validation/finance.validation');

// GET finance records with filters
router.get(
    '/v1/finance',
    authMiddleware.authenticate,
    authMiddleware.authorize(['SUPER_ADMIN']),
    validationMiddleware.validateQuery(FinanceValidation.getFinanceQuery()),
    FinanceController.getAll
);

// POST create finance record
router.post(
    '/v1/finance',
    authMiddleware.authenticate,
    authMiddleware.authorize(['SUPER_ADMIN']),
    uploadEvidenceMiddleware,
    validationMiddleware.validateBody(FinanceValidation.create()),
    FinanceController.create
);

// PATCH update finance record
router.patch(
    '/v1/finance/:id',
    authMiddleware.authenticate,
    authMiddleware.authorize(['SUPER_ADMIN']),
    uploadEvidenceMiddleware,
    validationMiddleware.validateBody(FinanceValidation.update()),
    FinanceController.update
);

// DELETE finance record
router.delete(
    '/v1/finance/:id',
    authMiddleware.authenticate,
    authMiddleware.authorize(['SUPER_ADMIN']),
    FinanceController.delete
);

module.exports = router; 