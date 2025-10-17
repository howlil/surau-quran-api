const express = require('express');
const router = express.Router();
const adminController = require('../../controller/admin.controller');
const validationMiddleware = require('../../middleware/validation.middleware');
const adminValidation = require('../../validation/admin.validation');
const authMiddleware = require('../../middleware/auth.middleware');

router.post('/v1/admin',
  authMiddleware.authenticate,
  authMiddleware.authorize(['SUPER_ADMIN', 'ADMIN_SURAU']),
  validationMiddleware.validateBody(adminValidation.createAdmin()),
  adminController.createAdmin
);

router.get('/v1/admin',
  authMiddleware.authenticate,
  authMiddleware.authorize(['SUPER_ADMIN', 'ADMIN_SURAU']),
  validationMiddleware.validateQuery(adminValidation.getAdminQuery()),
  adminController.getAllAdmins
);

router.patch('/v1/admin/:id',
  authMiddleware.authenticate,
  authMiddleware.authorize(['SUPER_ADMIN', 'ADMIN_SURAU']),
  validationMiddleware.validateBody(adminValidation.updateAdmin()),
  adminController.updateAdmin
);

router.delete('/v1/admin/:id',
  authMiddleware.authenticate,
  authMiddleware.authorize(['SUPER_ADMIN', 'ADMIN_SURAU']),
  adminController.deleteAdmin
);


module.exports = router;
