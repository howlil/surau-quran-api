const express = require('express');
const router = express.Router();
const absensiController = require('../../controller/absensi.controller');
const authMiddleware = require('../../middleware/auth.middleware');
const validationMiddleware = require('../../middleware/validation.middleware');
const absensiValidation = require('../../validation/absensi.validation');

// Admin routes

// TODO: FILTER TANGGAL MASIH GAJALAN
router.get('/v1/absensi/siswa',
    authMiddleware.authenticate,
    authMiddleware.authorize(['ADMIN']),
    validationMiddleware.validateQuery(absensiValidation.tanggal()),
    absensiController.getAbsensiSiswaForAdmin
);

// Redesigned API for teacher attendance grouped by date
router.get('/v1/absensi/guru',
    authMiddleware.authenticate,
    authMiddleware.authorize(['ADMIN']),
    validationMiddleware.validateQuery(absensiValidation.getAbsensiGuru()),
    absensiController.getAbsensiGuruByDate
);

router.put('/v1/absensi/guru/:id',
    authMiddleware.authenticate,
    authMiddleware.authorize(['ADMIN']),
    validationMiddleware.validateBody(absensiValidation.updateAbsensiGuru()),
    absensiController.updateAbsensiGuru
);

module.exports = router; 