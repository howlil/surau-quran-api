const express = require('express');
const router = express.Router();
const absensiController = require('../../controller/absensi.controller');
const authMiddleware = require('../../middleware/auth.middleware');
const validationMiddleware = require('../../middleware/validation.middleware');
const absensiValidation = require('../../validation/absensi.validation');

// Admin routes
router.get('/v1/admin/absensi/siswa',
    authMiddleware.authenticate,
    authMiddleware.authorize(['ADMIN']),
    validationMiddleware.validateQuery(absensiValidation.getAbsensiSiswa()),
    absensiController.getAbsensiSiswaForAdmin
);

router.get('/v1/admin/absensi/guru',
    authMiddleware.authenticate,
    authMiddleware.authorize(['ADMIN']),
    validationMiddleware.validateQuery(absensiValidation.getAbsensiGuru()),
    absensiController.getAbsensiGuruForAdmin
);

router.put('/v1/admin/absensi/guru/:id',
    authMiddleware.authenticate,
    authMiddleware.authorize(['ADMIN']),
    validationMiddleware.validateBody(absensiValidation.updateAbsensiGuru()),
    absensiController.updateAbsensiGuru
);

// Teacher routes
router.post('/v1/guru/absensi/siswa',
    authMiddleware.authenticate,
    authMiddleware.authorize(['GURU']),
    validationMiddleware.validateBody(absensiValidation.markAbsensiSiswa()),
    absensiController.markAbsensiSiswa
);

// Student routes
router.get('/v1/siswa/absensi/count',
    authMiddleware.authenticate,
    authMiddleware.authorize(['SISWA']),
    absensiController.getAbsensiCountForSiswa
);

router.get('/v1/siswa/absensi/detail',
    authMiddleware.authenticate,
    authMiddleware.authorize(['SISWA']),
    validationMiddleware.validateQuery(absensiValidation.getAbsensiSiswa()),
    absensiController.getAbsensiDetailForSiswa
);

module.exports = router; 