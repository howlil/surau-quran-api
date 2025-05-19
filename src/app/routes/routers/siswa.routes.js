const express = require('express');
const router = express.Router();
const validationMiddleware = require('../../middleware/validation.middleware');
const authMiddleware = require('../../middleware/auth.middleware');
const siswaController = require('../../controller/siswa.controller');
const siswaValidation = require('../../validation/siswa.validation');

router.post(
  '/v1/siswa/register',
  validationMiddleware.validateBody(siswaValidation.registerSiswa()),
  siswaController.registerSiswa
);

router.post(
  '/v1/siswa/pre-register',
  validationMiddleware.validateBody(siswaValidation.preRegisterSiswa()),
  siswaController.preRegisterSiswa
);

router.get(
  '/v1/siswa/registration-status/:tempId',
  siswaController.getRegistrationStatus
);

router.get(
  '/v1/siswa/:id',
  authMiddleware.authenticate,
  authMiddleware.authorize(['ADMIN', 'GURU']),
  siswaController.getById
);

router.get(
  '/v1/siswa',
  authMiddleware.authenticate,
  authMiddleware.authorize(['ADMIN', 'GURU']),
  siswaController.getAll
);

router.get(
  '/v1/siswa/profile/me',
  authMiddleware.authenticate,
  authMiddleware.authorize(['SISWA']),
  siswaController.getProfile
);

router.patch(
  '/v1/siswa/profile/me',
  authMiddleware.authenticate,
  authMiddleware.authorize(['SISWA']),
  validationMiddleware.validateBody(siswaValidation.updateProfile()),
  siswaController.updateProfile
);

router.delete(
  '/v1/siswa/:id',
  authMiddleware.authenticate,
  authMiddleware.authorize(['ADMIN']),
  siswaController.delete
);

module.exports = router;