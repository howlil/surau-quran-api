const express = require('express');
const router = express.Router();
const validationMiddleware = require('../../middleware/validation.middleware');
const authMiddleware = require('../../middleware/auth.middleware');
const kelasProgramController = require('../../controller/kelas-program.controller');
const kelasProgramValidation = require('../../validation/kelas-program.validation');

// Admin: Get kelas programs by kelasId
router.get(
    '/v1/kelas/:kelasId/programs',
    authMiddleware.authenticate,
    authMiddleware.authorize(['ADMIN']),
    validationMiddleware.validateParams(kelasProgramValidation.getByKelasId()),
    validationMiddleware.validateQuery(kelasProgramValidation.getByKelasId()),
    kelasProgramController.getByKelasId
);

// Admin: Get detailed kelas program info including enrolled students
router.get(
    '/v1/kelas-program/:id/detail',
    authMiddleware.authenticate,
    authMiddleware.authorize(['ADMIN']),
    validationMiddleware.validateParams(kelasProgramValidation.getDetailById()),
    kelasProgramController.getDetailById
);

// Admin: Update kelas program details and enrolled students
router.patch(
    '/v1/kelas-program/:id/detail',
    authMiddleware.authenticate,
    authMiddleware.authorize(['ADMIN']),
    validationMiddleware.validateParams(kelasProgramValidation.getDetailById()),
    validationMiddleware.validateBody(kelasProgramValidation.updateKelasProgramDetail()),
    kelasProgramController.updateKelasProgramDetail
);

module.exports = router; 