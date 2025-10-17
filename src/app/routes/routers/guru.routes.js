const express = require('express');
const router = express.Router();
const validationMiddleware = require('../../middleware/validation.middleware');
const authMiddleware = require('../../middleware/auth.middleware');
const ErrorMiddleware = require('../../middleware/error.middleware');
const guruController = require('../../controller/guru.controller');
const guruValidation = require('../../validation/guru.validation');
const multer = require('multer');
const { storage, imageFileFilter, documentFileFilter } = require('../../middleware/upload.middleware');

const uploadGuruFiles = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.fieldname === 'fotoProfile') {
      imageFileFilter(req, file, cb);
    } else if (file.fieldname === 'suratKontrak') {
      documentFileFilter(req, file, cb);
    } else {
      cb(null, false);
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024
  }
});

const handleFileUpload = (req, res, next) => {
  const upload = uploadGuruFiles.fields([
    { name: 'fotoProfile', maxCount: 1 },
    { name: 'suratKontrak', maxCount: 1 }
  ]);

  upload(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        return next();
      }
      return ErrorMiddleware.handleMulterError(err, req, res, next);
    }
    next();
  });
};

/**
==================== 
MANAJEMEN GURU
====================
 */

router.post(
  '/v1/guru',
  authMiddleware.authenticate,
  authMiddleware.authorize(['SUPER_ADMIN', 'ADMIN_SURAU', 'ADMIN']),
  handleFileUpload,
  validationMiddleware.validateBody(guruValidation.create()),
  guruController.create
);

router.patch(
  '/v1/guru/:id',
  authMiddleware.authenticate,
  authMiddleware.authorize(['SUPER_ADMIN', 'ADMIN_SURAU', 'ADMIN']),
  handleFileUpload,
  validationMiddleware.validateBody(guruValidation.update()),
  guruController.update
);

router.delete(
  '/v1/guru/:id',
  authMiddleware.authenticate,
  authMiddleware.authorize(['SUPER_ADMIN', 'ADMIN_SURAU', 'ADMIN']),
  guruController.delete
);

router.get(
  '/v1/guru',
  authMiddleware.authenticate,
  authMiddleware.authorize(['SUPER_ADMIN', 'ADMIN_SURAU', 'ADMIN']),
  validationMiddleware.validateQuery(guruValidation.getGuruQuery()),
  guruController.getAll
);



/**
==================== 
 Data Guru
====================
 */

router.get(
  '/v1/guru/jadwal',
  authMiddleware.authenticate,
  authMiddleware.authorize(['SUPER_ADMIN', 'ADMIN_SURAU', 'ADMIN']),
  validationMiddleware.validateQuery(guruValidation.getJadwalGuruQuery()),
  guruController.getAllWithSchedules
);

// Get all class programs with enrolled students
router.get(
  '/v2/guru/jadwal',
  authMiddleware.authenticate,
  authMiddleware.authorize(['GURU']),
  guruController.getKelasProgramWithStudents
);

router.get(
  '/v1/guru/contract',
  authMiddleware.authenticate,
  authMiddleware.authorize(['GURU']),
  guruController.downloadContract
);

module.exports = router;