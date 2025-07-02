const express = require('express');
const router = express.Router();
const validationMiddleware = require('../../middleware/validation.middleware');
const authMiddleware = require('../../middleware/auth.middleware');
const { uploadFotoUrlMiddleware } = require('../../middleware/upload.middleware');
const TestimoniController = require('../../controller/testimoni.controller');
const TestimoniValidation = require('../../validation/testimoni.validation');

// GET all testimoni
router.get(
    '/v1/testimoni',
    TestimoniController.getAll
);



// POST create testimoni
router.post(
    '/v1/testimoni',
    authMiddleware.authenticate,
    authMiddleware.authorize(['ADMIN']),
    uploadFotoUrlMiddleware,
    (req, res, next) => {
        // Validate that file was uploaded
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'Foto wajib diisi'
            });
        }
        next();
    },
    validationMiddleware.validateBody(TestimoniValidation.create()),
    TestimoniController.create
);

// PATCH update testimoni
router.patch(
    '/v1/testimoni/:id',
    authMiddleware.authenticate,
    authMiddleware.authorize(['ADMIN']),
    uploadFotoUrlMiddleware,
    validationMiddleware.validateBody(TestimoniValidation.update()),
    TestimoniController.update
);

// DELETE testimoni
router.delete(
    '/v1/testimoni/:id',
    authMiddleware.authenticate,
    authMiddleware.authorize(['ADMIN']),
    TestimoniController.delete
);

module.exports = router; 