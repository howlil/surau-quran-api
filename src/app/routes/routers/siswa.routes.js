const express = require('express');
const router = express.Router();
const validationMiddleware = require('../../middleware/validation.middleware');
const authMiddleware = require('../../middleware/auth.middleware');
const siswaController = require('../../controller/siswa.controller');
const siswaValidation = require('../../validation/siswa.validation');




router.get(
  '/v1/siswa',
  authMiddleware.authenticate,
  authMiddleware.authorize(['ADMIN', 'GURU']),
  siswaController.getAll
);

router.get(
  '/v1/siswa/me',
  authMiddleware.authenticate,
  authMiddleware.authorize(['SISWA']),
  siswaController.getProfile
);


router.patch(
  '/v1/siswa/:id',
  authMiddleware.authenticate,
  authMiddleware.authorize(['ADMIN']),
  validationMiddleware.validateBody(siswaValidation.adminUpdateSiswa()),
  siswaController.adminUpdateSiswa
);

module.exports = router;