const express = require('express');
const router = express.Router();
const absensiController = require('../../controller/absensi.controller');
const authMiddleware = require('../../middleware/auth.middleware');
const validationMiddleware = require('../../middleware/validation.middleware');
const absensiValidation = require('../../validation/absensi.validation');
const {
    uploadSuratIzinMiddleware,
} = require('../../middleware/upload.middleware');


router.get('/v1/absensi/siswa/:kelasId',
    authMiddleware.authenticate,
    authMiddleware.authorize(['ADMIN']),
    validationMiddleware.validateQuery(absensiValidation.tanggal()),
    absensiController.getAbsensiSiswaForAdmin
);

router.get('/v1/absensi/guru',
    authMiddleware.authenticate,
    authMiddleware.authorize(['ADMIN']),
    validationMiddleware.validateQuery(absensiValidation.getAbsensiGuru()),
    absensiController.getAbsensiGuruByDate
);

router.put('/v1/absensi/guru/:id',
    authMiddleware.authenticate,
    authMiddleware.authorize(['ADMIN']),
    uploadSuratIzinMiddleware,
    validationMiddleware.validateBody(absensiValidation.updateAbsensiGuru()),
    absensiController.updateAbsensiGuru
);

router.patch('/v1/absensi/siswa/:siswaId',
    authMiddleware.authenticate,
    authMiddleware.authorize(['GURU']),
    validationMiddleware.validateBody(absensiValidation.updateAbsensiSiswa()),
    absensiController.updateAbsensiSiswa
);

router.get('/v1/guru/absensi/siswa',
    authMiddleware.authenticate,
    authMiddleware.authorize(['GURU']),
    validationMiddleware.validateQuery(absensiValidation.tanggal()),
    absensiController.getAbsensiSiswaForGuru
);

module.exports = router; 