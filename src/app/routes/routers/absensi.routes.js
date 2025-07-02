const express = require('express');
const router = express.Router();
const absensiController = require('../../controller/absensi.controller');
const authMiddleware = require('../../middleware/auth.middleware');
const validationMiddleware = require('../../middleware/validation.middleware');
const absensiValidation = require('../../validation/absensi.validation');
const uploadMiddleware = require('../../middleware/upload.middleware');


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

router.patch('/v1/absensi/guru/:id',
    authMiddleware.authenticate,
    authMiddleware.authorize(['ADMIN']),
    uploadMiddleware.uploadSuratIzinMiddleware,
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

router.post('/v1/absensi/:kelasId/students',
    authMiddleware.authenticate,
    authMiddleware.authorize(['GURU']),
    validationMiddleware.validateBody(absensiValidation.createAbsensiSiswa()),
    absensiController.createAbsensiSiswa
);


router.get(
    '/v1/absensi/students',
    authMiddleware.authenticate,
    authMiddleware.authorize(['GURU']),
    validationMiddleware.validateQuery(absensiValidation.getSiswaByKelasProgram()),
    absensiController.getSiswaByKelasProgram
);

module.exports = router; 