const express = require('express');
const router = express.Router();
const sppController = require('../../controller/spp.controller');
const authMiddleware = require('../../middleware/auth.middleware');
const validationMiddleware = require('../../middleware/validation.middleware');
const sppValidation = require('../../validation/spp.validation');

router.get(
    '/v1/spp',
    authMiddleware.authenticate,
    authMiddleware.authorize(['SUPER_ADMIN', 'ADMIN_SURAU']),
    validationMiddleware.validateQuery(sppValidation.getSppForAdmin()),
    sppController.getSppForAdmin
);

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
