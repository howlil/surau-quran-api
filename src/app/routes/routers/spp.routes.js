const express = require('express');
const router = express.Router();
const sppController = require('../../controller/spp.controller');
const authMiddleware = require('../../middleware/auth.middleware');
const validationMiddleware = require('../../middleware/validation.middleware');
const sppValidation = require('../../validation/spp.validation');

// Get SPP data for admin
router.get(
    '/v1/spp',
    authMiddleware.authenticate,
    authMiddleware.authorize(['ADMIN']),
    validationMiddleware.validateQuery(sppValidation.getSppForAdmin()),
    sppController.getSppForAdmin
);

// Get SPP data for student
router.get(
    '/v1/siswa/spp',
    authMiddleware.authenticate,
    authMiddleware.authorize(['SISWA']),
    validationMiddleware.validateQuery(sppValidation.getSppForSiswa()),
    sppController.getSppForSiswa
);

router.get(
    '/v1/spp/invoice/:pembayaranId',
    authMiddleware.authenticate,
    authMiddleware.authorize(['SISWA']),
    sppController.getSppInvoice
);

module.exports = router;
