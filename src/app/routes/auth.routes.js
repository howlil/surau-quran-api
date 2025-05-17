const express = require('express');
const router = express.Router();
const authController = require('../controller/auth.controller');
const validationMiddleware = require('../middleware/validation.middleware');
const authValidation = require('../validation/auth.validation');
const authMiddleware = require('../middleware/auth.middleware');

router.post('/v1/login', 
  validationMiddleware.validateBody(authValidation.login()),
  authController.login
);

router.post('/v1/logout', 
  authMiddleware.authenticate,
  authController.logout
);

router.post('/v1/guru', 
  authMiddleware.authenticate,
  authMiddleware.authorize(['ADMIN']),
  validationMiddleware.validateBody(authValidation.createGuru()),
  authController.createGuru
);

module.exports = router;