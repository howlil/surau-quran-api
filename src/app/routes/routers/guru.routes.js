const express = require('express');
const router = express.Router();
const validationMiddleware = require('../../middleware/validation.middleware');
const authMiddleware = require('../../middleware/auth.middleware');
const guruController = require('../../controller/guru.controller');
const guruValidation = require('../../validation/guru.validation');

// Admin routes for managing teachers
router.post(
  '/v1/guru',
  authMiddleware.authenticate,
  authMiddleware.authorize(['ADMIN']),
  validationMiddleware.validateBody(guruValidation.create()),
  guruController.create
);

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

router.get(
  '/v1/guru/:id/jadwal',
  authMiddleware.authenticate,
  authMiddleware.authorize(['ADMIN']),
  guruController.getGuruScheduleAdmin
);

// Teacher route for viewing own schedule
router.get(
  '/v1/guru/jadwal/saya',
  authMiddleware.authenticate,
  authMiddleware.authorize(['GURU']),
  guruController.getOwnSchedule
);

module.exports = router;