const express = require('express');
const router = express.Router();
const validationMiddleware = require('../../middleware/validation.middleware');
const authMiddleware = require('../../middleware/auth.middleware');
const paymentController = require('../../controller/payment.controller');
const paymentValidation = require('../../validation/payment.validation');

// Public endpoint for Xendit callbacks
router.post(
  '/v1/payment/callback/invoice',
  paymentController.handleInvoiceCallback
);

// Protected endpoints
router.get(
  '/v1/payment/:id',
  authMiddleware.authenticate,
  authMiddleware.authorize(['ADMIN']),
  paymentController.getById
);

router.get(
  '/v1/payment',
  authMiddleware.authenticate,
  authMiddleware.authorize(['ADMIN']),
  paymentController.getAll
);

router.post(
  '/v1/payment/verify/:id',
  authMiddleware.authenticate,
  authMiddleware.authorize(['ADMIN']),
  paymentController.verifyPayment
);

router.post(
  '/v1/payment',
  authMiddleware.authenticate,
  authMiddleware.authorize(['ADMIN']),
  validationMiddleware.validateBody(paymentValidation.createPayment()),
  paymentController.createPayment
);

router.patch(
  '/v1/payment/status/:id',
  authMiddleware.authenticate,
  authMiddleware.authorize(['ADMIN']),
  validationMiddleware.validateBody(paymentValidation.updateStatus()),
  paymentController.updatePaymentStatus
);

router.post(
  '/v1/payment/cancel/:id',
  authMiddleware.authenticate,
  authMiddleware.authorize(['ADMIN']),
  paymentController.cancelPayment
);

// New SPP endpoints for admin
router.get(
  '/v1/payment/spp/current-month',
  authMiddleware.authenticate,
  authMiddleware.authorize(['ADMIN']),
  validationMiddleware.validateQuery(paymentValidation.getCurrentMonthSpp()),
  paymentController.getCurrentMonthSpp
);

// Student endpoints for viewing and paying SPP
router.get(
  '/v1/payment/spp/my',
  authMiddleware.authenticate,
  authMiddleware.authorize(['SISWA']),
  validationMiddleware.validateQuery(paymentValidation.getStudentSpp()),
  paymentController.getStudentSpp
);

// Batch payment should come before the specific ID route to avoid conflicts
router.post(
  '/v1/payment/spp/batch',
  authMiddleware.authenticate,
  authMiddleware.authorize(['SISWA']),
  validationMiddleware.validateBody(paymentValidation.batchPaySpp()),
  paymentController.batchPaySpp
);

router.post(
  '/v1/payment/spp/:periodeSppId',
  authMiddleware.authenticate,
  authMiddleware.authorize(['SISWA']),
  validationMiddleware.validateParams(paymentValidation.paySpp()),
  validationMiddleware.validateBody(paymentValidation.paySpp()),
  paymentController.paySpp
);

module.exports = router;