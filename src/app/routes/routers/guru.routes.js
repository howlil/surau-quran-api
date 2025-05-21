const express = require('express');
const router = express.Router();
const validationMiddleware = require('../../middleware/validation.middleware');
const authMiddleware = require('../../middleware/auth.middleware');
const guruController = require('../../controller/guru.controller');
const guruValidation = require('../../validation/guru.validation');

// Admin routes for managing teachers

// TODO : IMPLEMENTASI MULTER UNTUK UPLOAD GAMBAR
router.post(
  '/v1/guru',
  authMiddleware.authenticate,
  authMiddleware.authorize(['ADMIN']),
  validationMiddleware.validateBody(guruValidation.create()),
  guruController.create
);
// TODO : IMPLEMENTASI MULTER UNTUK UPLOAD GAMBAR
router.patch(
  '/v1/guru/:id',
  authMiddleware.authenticate,
  authMiddleware.authorize(['ADMIN']),
  validationMiddleware.validateBody(guruValidation.update()),
  guruController.update
);

router.delete(
  '/v1/guru/:id',
  authMiddleware.authenticate,
  authMiddleware.authorize(['ADMIN']),
  guruController.delete
);

router.get(
  '/v1/guru',
  authMiddleware.authenticate,
  authMiddleware.authorize(['ADMIN']),
  guruController.getAll
);

// Admin routes for teacher schedules
router.get(
  '/v1/guru/jadwal',
  authMiddleware.authenticate,
  authMiddleware.authorize(['ADMIN']),
  guruController.getAllWithSchedules
);

// Get all class programs with enrolled students
router.get(
  '/v1/guru/jadwal/siswa',
  authMiddleware.authenticate,
  authMiddleware.authorize(['GURU']),
  guruController.getKelasProgramWithStudents
);



module.exports = router;