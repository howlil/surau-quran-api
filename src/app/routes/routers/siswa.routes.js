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
  validationMiddleware.validateQuery(siswaValidation.getAllSiswa()),
  siswaController.getAll
);

router.get(
  '/v1/siswa/me',
  authMiddleware.authenticate,
  authMiddleware.authorize(['SISWA']),
  validationMiddleware.validateQuery(siswaValidation.getProfileQuery()),
  siswaController.getProfile
);

router.patch(
  '/v1/siswa/:id',
  authMiddleware.authenticate,
  authMiddleware.authorize(['ADMIN']),
  validationMiddleware.validateBody(siswaValidation.adminUpdateSiswa()),
  siswaController.adminUpdateSiswa
);

router.patch(
  '/v1/siswa/:id/status',
  authMiddleware.authenticate,
  authMiddleware.authorize(['ADMIN']),
  validationMiddleware.validateBody(siswaValidation.updateStatusSiswa()),
  siswaController.updateStatusSiswa
);

router.post(
  '/v1/pendaftaran',
  validationMiddleware.validateBody(siswaValidation.pendaftaranSiswa()),
  siswaController.pendaftaranSiswa
);

router.get(
  '/v1/pendaftaran/invoice',
  authMiddleware.authenticate,
  authMiddleware.authorize(['ADMIN']),
  siswaController.getPendaftaranInvoice
)

router.get(
  '/v1/jadwal/siswa',
  validationMiddleware.validateQuery(siswaValidation.getJadwalSiswa()),
  siswaController.getJadwalSiswa
);

router.patch(
  '/v1/siswa/:id/pindah-program',
  authMiddleware.authenticate,
  authMiddleware.authorize(['ADMIN']),
  validationMiddleware.validateBody(siswaValidation.pindahProgram()),
  siswaController.pindahProgram
);


module.exports = router;