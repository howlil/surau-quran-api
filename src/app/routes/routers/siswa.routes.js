const express = require('express');
const router = express.Router();
const validationMiddleware = require('../../middleware/validation.middleware');
const authMiddleware = require('../../middleware/auth.middleware');
const { uploadKartuKeluargaMiddleware, uploadEvidenceMiddleware } = require('../../middleware/upload.middleware');
const siswaController = require('../../controller/siswa.controller');
const siswaValidation = require('../../validation/siswa.validation');

router.get(
  '/v1/siswa',
  authMiddleware.authenticate,
  authMiddleware.authorize(['SUPER_ADMIN', 'ADMIN_SURAU', 'ADMIN', 'GURU']),
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
  authMiddleware.authorize(['SUPER_ADMIN', 'ADMIN_SURAU', 'ADMIN']),
  validationMiddleware.validateBody(siswaValidation.adminUpdateSiswa()),
  siswaController.adminUpdateSiswa
);

router.patch(
  '/v1/siswa/:id/status',
  authMiddleware.authenticate,
  authMiddleware.authorize(['SUPER_ADMIN', 'ADMIN_SURAU', 'ADMIN']),
  validationMiddleware.validateBody(siswaValidation.updateStatusSiswa()),
  siswaController.updateStatusSiswa
);

router.post(
  '/v1/pendaftaran',
  uploadEvidenceMiddleware,
  validationMiddleware.validateBody(siswaValidation.pendaftaranSiswa()),
  siswaController.pendaftaranSiswa
);

// Pendaftaran V2 dengan support private program (multipart/form-data)
router.post(
  '/v2/pendaftaran',
  uploadKartuKeluargaMiddleware,
  validationMiddleware.validateBody(siswaValidation.pendaftaranSiswaV2()),
  siswaController.pendaftaranSiswaV2
);


// nanti  tambahin siswa baru yang status bayarnya pending
router.get(
  '/v1/pendaftaran/invoice',
  authMiddleware.authenticate,
  authMiddleware.authorize(['SUPER_ADMIN', 'ADMIN_SURAU', 'ADMIN']),
  validationMiddleware.validateQuery(siswaValidation.getPendaftaranInvoiceQuery()),
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
  authMiddleware.authorize(['SUPER_ADMIN', 'ADMIN_SURAU', 'ADMIN']),
  validationMiddleware.validateBody(siswaValidation.pindahProgram()),
  siswaController.pindahProgram
);


module.exports = router;