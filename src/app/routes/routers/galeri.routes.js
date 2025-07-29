const express = require('express');
const router = express.Router();
const validationMiddleware = require('../../middleware/validation.middleware');
const authMiddleware = require('../../middleware/auth.middleware');
const { uploadCoverGaleriMiddleware } = require('../../middleware/upload.middleware');
const GaleriController = require('../../controller/galeri.controller');
const GaleriValidation = require('../../validation/galeri.validation');

// GET all galeri
router.get(
    '/v1/galeri',
    validationMiddleware.validateQuery(GaleriValidation.getGaleriQuery()),
    GaleriController.getAll
);



// POST create galeri
router.post(
    '/v1/galeri',
    authMiddleware.authenticate,
    authMiddleware.authorize(['ADMIN']),
    uploadCoverGaleriMiddleware,
    validationMiddleware.validateBody(GaleriValidation.create()),
    GaleriController.create
);

// PATCH update galeri
router.patch(
    '/v1/galeri/:id',
    authMiddleware.authenticate,
    authMiddleware.authorize(['ADMIN']),
    uploadCoverGaleriMiddleware,
    validationMiddleware.validateBody(GaleriValidation.update()),
    GaleriController.update
);

// DELETE galeri
router.delete(
    '/v1/galeri/:id',
    authMiddleware.authenticate,
    authMiddleware.authorize(['ADMIN']),
    GaleriController.delete
);

module.exports = router; 