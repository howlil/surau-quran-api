const express = require('express');
const router = express.Router();
const validationMiddleware = require('../../middleware/validation.middleware');
const authMiddleware = require('../../middleware/auth.middleware');
const ProgramController = require('../../controller/program.controller');
const ProgramValidation = require('../../validation/program.validation');

router.post(
    '/v1/program',
    authMiddleware.authenticate,
    authMiddleware.authorize(['ADMIN']),
    validationMiddleware.validateBody(ProgramValidation.create()),
    ProgramController.create
);

router.put(
    '/v1/program/:id',
    authMiddleware.authenticate,
    authMiddleware.authorize(['ADMIN']),
    validationMiddleware.validateBody(ProgramValidation.update()),
    ProgramController.update
);

router.delete(
    '/v1/program/:id',
    authMiddleware.authenticate,
    authMiddleware.authorize(['ADMIN']),
    ProgramController.delete
);


router.get(
    '/v1/program',
    ProgramController.getAll
);

router.get(
    '/v1/program/:kelasProgramId/siswa',
    authMiddleware.authenticate,
    authMiddleware.authorize(['ADMIN']),
    ProgramController.getProgramStudents
);

module.exports = router;
