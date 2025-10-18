const express = require('express');
const router = express.Router();
const validationMiddleware = require('../../middleware/validation.middleware');
const authMiddleware = require('../../middleware/auth.middleware');
const { uploadKartuKeluargaMiddleware, uploadEvidencePendaftaranMiddleware } = require('../../middleware/upload.middleware');
const pendaftaranController = require('../../controller/pendaftaran.controller');
const pendaftaranValidation = require('../../validation/pendaftaran.validation');

router.post(
  '/v1/pendaftaran',
  uploadEvidencePendaftaranMiddleware,
  validationMiddleware.validateBody(pendaftaranValidation.pendaftaranSiswa()),
  pendaftaranController.pendaftaranSiswa
);

// Pendaftaran V2 dengan support private program (multipart/form-data)
router.post(
  '/v2/pendaftaran',
  uploadKartuKeluargaMiddleware,
  validationMiddleware.validateBody(pendaftaranValidation.pendaftaranSiswaV2()),
  pendaftaranController.pendaftaranSiswaV2
);

router.get(
  '/v1/pendaftaran/invoice',
  authMiddleware.authenticate,
  authMiddleware.authorize(['SUPER_ADMIN', 'ADMIN_SURAU', 'ADMIN']),
  validationMiddleware.validateQuery(pendaftaranValidation.getPendaftaranInvoiceQuery()),
  pendaftaranController.getPendaftaranInvoice
);

module.exports = router;
