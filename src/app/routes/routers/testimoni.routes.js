const express = require('express');
const router = express.Router();
const validationMiddleware = require('../../middleware/validation.middleware');
const authMiddleware = require('../../middleware/auth.middleware');
const { uploadFotoUrlMiddleware } = require('../../middleware/upload.middleware');
const TestimoniController = require('../../controller/testimoni.controller');
const TestimoniValidation = require('../../validation/testimoni.validation');

router.get(
    '/v1/testimoni',
    validationMiddleware.validateQuery(TestimoniValidation.getTestimoniQuery()),
    TestimoniController.getAll
);

router.post(
    '/v1/testimoni',
    authMiddleware.authenticate,
    authMiddleware.authorize(['SUPER_ADMIN', 'ADMIN_SURAU', 'ADMIN']),
    uploadFotoUrlMiddleware,
    validationMiddleware.validateBody(TestimoniValidation.create()),
    TestimoniController.create
);

router.patch(
    '/v1/testimoni/:id',
    authMiddleware.authenticate,
    authMiddleware.authorize(['SUPER_ADMIN', 'ADMIN_SURAU', 'ADMIN']),
    uploadFotoUrlMiddleware,
    validationMiddleware.validateBody(TestimoniValidation.update()),
    TestimoniController.update
);

router.delete(
    '/v1/testimoni/:id',
    authMiddleware.authenticate,
    authMiddleware.authorize(['SUPER_ADMIN', 'ADMIN_SURAU', 'ADMIN']),
    TestimoniController.delete
);

module.exports = router; 