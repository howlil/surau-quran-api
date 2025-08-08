const express = require('express');
const router = express.Router();
const validationMiddleware = require('../../middleware/validation.middleware');
const authMiddleware = require('../../middleware/auth.middleware');
const jamMengajarController = require('../../controller/jam-mengajar.controller');
const jamMengajarValidation = require('../../validation/jam-mengajar.validation');

router.post(
    '/v1/jam',
    authMiddleware.authenticate,
    authMiddleware.authorize(['SUPER_ADMIN', 'ADMIN_SURAU', 'ADMIN']),
    validationMiddleware.validateBody(jamMengajarValidation.create()),
    jamMengajarController.create
);

router.patch(
    '/v1/jam/:id',
    authMiddleware.authenticate,
    authMiddleware.authorize(['SUPER_ADMIN', 'ADMIN_SURAU', 'ADMIN']),
    validationMiddleware.validateBody(jamMengajarValidation.update()),
    jamMengajarController.update
);

router.delete(
    '/v1/jam/:id',
    authMiddleware.authenticate,
    authMiddleware.authorize(['SUPER_ADMIN', 'ADMIN_SURAU', 'ADMIN']),
    jamMengajarController.delete
);


router.get(
    '/v1/jam',
    jamMengajarController.getAll
);

module.exports = router;
