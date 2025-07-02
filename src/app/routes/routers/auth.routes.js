const express = require('express');
const router = express.Router();
const authController = require('../../controller/auth.controller');
const validationMiddleware = require('../../middleware/validation.middleware');
const authValidation = require('../../validation/auth.validation');
const authMiddleware = require('../../middleware/auth.middleware');


router.post('/v1/login',
  validationMiddleware.validateBody(authValidation.login()),
  authController.login
);

router.post('/v1/logout',
  authMiddleware.authenticate,
  authController.logout
);

// Admin management routes - only accessible by admins
router.post('/v1/admin',
  authMiddleware.authenticate,
  validationMiddleware.validateBody(authValidation.createAdmin()),
  authController.createAdmin
);

router.get('/v1/admin',
  authMiddleware.authenticate,
  authController.getAllAdmins
);


router.patch('/v1/admin/:id',
  authMiddleware.authenticate,
  validationMiddleware.validateBody(authValidation.updateAdmin()),
  authController.updateAdmin
);

router.delete('/v1/admin/:id',
  authMiddleware.authenticate,
  authController.deleteAdmin
);

router.post('/v1/forgot-password',
  validationMiddleware.validateBody(authValidation.forgotPassword()),
  authController.forgotPassword
);

router.post('/v1/reset-password',
  validationMiddleware.validateBody(authValidation.resetPassword()),
  authController.resetPassword
);

router.patch('/v1/change-password',
  authMiddleware.authenticate,
  validationMiddleware.validateBody(authValidation.changePassword()),
  authController.changePassword
);

module.exports = router;