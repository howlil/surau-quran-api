const express = require('express');
const router = express.Router();
const validationMiddleware = require('../../middleware/validation.middleware');
const authMiddleware = require('../../middleware/auth.middleware');
const { uploadCoverMiddleware } = require('../../middleware/upload.middleware');
const ProgramController = require('../../controller/program.controller');
const ProgramValidation = require('../../validation/program.validation');

router.post(
    '/v1/program',
    authMiddleware.authenticate,
    authMiddleware.authorize(['SUPER_ADMIN', 'ADMIN_SURAU', 'ADMIN']),
    uploadCoverMiddleware,
    validationMiddleware.validateBody(ProgramValidation.create()),
    ProgramController.create
);

router.patch(
    '/v1/program/:id',
    authMiddleware.authenticate,
    authMiddleware.authorize(['SUPER_ADMIN', 'ADMIN_SURAU', 'ADMIN']),
    uploadCoverMiddleware,
    validationMiddleware.validateBody(ProgramValidation.update()),
    ProgramController.update
);

router.delete(
    '/v1/program/:id',
    authMiddleware.authenticate,
    authMiddleware.authorize(['SUPER_ADMIN', 'ADMIN_SURAU', 'ADMIN']),
    ProgramController.delete
);

router.get(
    '/v1/program',
    validationMiddleware.validateQuery(ProgramValidation.getProgramQuery()),
    ProgramController.getAll
);

router.get(
    '/v1/program/:programId/siswa',
    authMiddleware.authenticate,
    authMiddleware.authorize(['SUPER_ADMIN', 'ADMIN_SURAU', 'ADMIN']),
    ProgramController.getProgramStudents
);

// API v2 - Public (tanpa authentication)
router.get(
    '/v2/program',
    ProgramController.getAllPublic
);


module.exports = router;
