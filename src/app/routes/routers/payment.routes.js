
const express = require('express');
const router = express.Router();
const paymentController = require('../../controller/payment.controller');
const authMiddleware = require('../../middleware/auth.middleware');

router.post(
  '/v1/payment/callback/invoice',
  paymentController.invoiceCallback
);

router.post(
  '/v1/payment/retry/:paymentId',
  authMiddleware.authenticate,
  authMiddleware.authorize(['ADMIN']),
  paymentController.retryPayment
);

router.get(
  '/v1/payment/history',
  authMiddleware.authenticate,
  authMiddleware.authorize(['ADMIN']),
  paymentController.getPaymentHistory
);

router.get(
  '/v1/payment/:paymentId',
  authMiddleware.authenticate,
  authMiddleware.authorize(['ADMIN', 'SISWA']),
  paymentController.getPaymentDetails
);

router.get(
  '/v1/payment/callback-history/:externalId',
  authMiddleware.authenticate,
  authMiddleware.authorize(['ADMIN']),
  paymentController.getCallbackHistory
);

router.get(
  '/v1/payment/check/:invoiceId',
  authMiddleware.authenticate,
  paymentController.checkPaymentStatus
);

router.post(
  '/v1/payment/expire/:invoiceId',
  authMiddleware.authenticate,
  authMiddleware.authorize(['ADMIN']),
  paymentController.expirePayment
);

module.exports = router;