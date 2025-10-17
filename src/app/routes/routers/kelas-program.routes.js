const express = require('express');
const router = express.Router();
const validationMiddleware = require('../../middleware/validation.middleware');
const authMiddleware = require('../../middleware/auth.middleware');
const kelasProgramController = require('../../controller/kelas-program.controller');
const kelasProgramValidation = require('../../validation/kelas-program.validation');

router.patch(
    '/v1/kelas-program/:kelasProgramId/initial-student',
    authMiddleware.authenticate,
    authMiddleware.authorize(['SUPER_ADMIN', 'ADMIN_SURAU', 'ADMIN']),
    validationMiddleware.validateBody(kelasProgramValidation.patchInitialStudentIntoClass()),
    kelasProgramController.patchInitialStudentIntoClass
);

router.post(
    '/v1/kelas-program',
    authMiddleware.authenticate,
    authMiddleware.authorize(['SUPER_ADMIN', 'ADMIN_SURAU', 'ADMIN']),
    validationMiddleware.validateBody(kelasProgramValidation.createKelasProgram()),
    kelasProgramController.createKelasProgram
);

router.delete(
    '/v1/kelas-program/:kelasProgramId',
    authMiddleware.authenticate,
    authMiddleware.authorize(['SUPER_ADMIN', 'ADMIN_SURAU', 'ADMIN']),
    kelasProgramController.deleteKelasProgram
);


router.get('/v1/kelas/initial-student',
    authMiddleware.authenticate,
    authMiddleware.authorize(['SUPER_ADMIN', 'ADMIN_SURAU', 'ADMIN']),
    validationMiddleware.validateQuery(kelasProgramValidation.getInitialStudentQuery()),
    kelasProgramController.getInitialStudentIntoClass
);

// API untuk kelas pengganti (hanya untuk guru)
router.post(
    '/v1/program/kelas-pengganti',
    authMiddleware.authenticate,
    authMiddleware.authorize(['GURU']),
    validationMiddleware.validateBody(kelasProgramValidation.addKelasPengganti()),
    kelasProgramController.addKelasPengganti
);

router.delete(
    '/v1/program/kelas-pengganti/:kelasProgramId',
    authMiddleware.authenticate,
    authMiddleware.authorize(['GURU']),
    validationMiddleware.validateParams(kelasProgramValidation.removeKelasPengganti()),
    kelasProgramController.removeKelasPengganti
);

router.get(
    '/v1/program/siswa',
    authMiddleware.authenticate,
    authMiddleware.authorize(['GURU']),
    kelasProgramController.getSiswaKelasPengganti
);

module.exports = router;
