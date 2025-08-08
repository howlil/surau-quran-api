const express = require('express');
const router = express.Router();
const validationMiddleware = require('../../middleware/validation.middleware');
const authMiddleware = require('../../middleware/auth.middleware');
const kelasController = require('../../controller/kelas.controller');
const kelasValidation = require('../../validation/kelas.validation');

router.post('/v1/kelas',
    authMiddleware.authenticate,
    authMiddleware.authorize(['SUPER_ADMIN', 'ADMIN_SURAU', 'ADMIN']),
    validationMiddleware.validateBody(kelasValidation.create()),
    kelasController.create
);

router.put('/v1/kelas/:id',
    authMiddleware.authenticate,
    authMiddleware.authorize(['SUPER_ADMIN', 'ADMIN_SURAU', 'ADMIN']),
    validationMiddleware.validateBody(kelasValidation.update()),
    kelasController.update
);
router.delete('/v1/kelas/:id',
    authMiddleware.authenticate,
    authMiddleware.authorize(['SUPER_ADMIN', 'ADMIN_SURAU', 'ADMIN']),
    kelasController.delete
);



router.get('/v1/kelas',
    kelasController.getAll
);


router.get('/v1/kelas/initial-student',
    authMiddleware.authenticate,
    authMiddleware.authorize(['SUPER_ADMIN', 'ADMIN_SURAU', 'ADMIN']),
    validationMiddleware.validateQuery(kelasValidation.getInitialStudentQuery()),
    kelasController.getInitialStudentIntoClass
);


router.patch(
    '/v1/kelas-program/:kelasProgramId/initial-student',
    authMiddleware.authenticate,
    authMiddleware.authorize(['SUPER_ADMIN', 'ADMIN_SURAU', 'ADMIN']),
    validationMiddleware.validateBody(kelasValidation.patchInitialStudentIntoClass()),
    kelasController.patchInitialStudentIntoClass
);

router.post(
    '/v1/kelas-program',
    authMiddleware.authenticate,
    authMiddleware.authorize(['SUPER_ADMIN', 'ADMIN_SURAU', 'ADMIN']),
    validationMiddleware.validateBody(kelasValidation.createKelasProgram()),
    kelasController.createKelasProgram
);

router.delete(
    '/v1/kelas-program/:kelasProgramId',
    authMiddleware.authenticate,
    authMiddleware.authorize(['SUPER_ADMIN', 'ADMIN_SURAU', 'ADMIN']),
    kelasController.deleteKelasProgram
);

// Route untuk CCTV - hanya untuk SISWA
router.get('/v1/cctv',
    authMiddleware.authenticate,
    authMiddleware.authorize(['SISWA']),
    kelasController.getCCTV
);






module.exports = router;
