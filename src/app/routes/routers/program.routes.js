const express = require('express');
const router = express.Router();
const validationMiddleware = require('../../middleware/validation.middleware');
const authMiddleware = require('../../middleware/auth.middleware');
const { uploadCoverMiddleware } = require('../../middleware/upload.middleware');
const ProgramController = require('../../controller/program.controller');
const ProgramValidation = require('../../validation/program.validation');

// API v1 - Internal (dengan authentication)
router.post(
    '/v1/program',
    authMiddleware.authenticate,
    authMiddleware.authorize(['ADMIN']),
    uploadCoverMiddleware,
    (req, res, next) => {
        // Validate that file was uploaded
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'Cover wajib diisi'
            });
        }
        next();
    },
    validationMiddleware.validateBody(ProgramValidation.create()),
    ProgramController.create
);

router.patch(
    '/v1/program/:id',
    authMiddleware.authenticate,
    authMiddleware.authorize(['ADMIN']),
    uploadCoverMiddleware,
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
    authMiddleware.authenticate,
    authMiddleware.authorize(['ADMIN']),
    ProgramController.getAll
);

router.get(
    '/v1/program/:programId/siswa',
    authMiddleware.authenticate,
    authMiddleware.authorize(['ADMIN']),
    ProgramController.getProgramStudents
);

// API v2 - Public (tanpa authentication)
router.get(
    '/v2/program',
    ProgramController.getAllPublic
);

module.exports = router;
