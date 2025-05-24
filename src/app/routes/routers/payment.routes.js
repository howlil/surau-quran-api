const express = require('express');
const router = express.Router();
const paymentController = require('../../controller/payment.controller');
const authMiddleware = require('../../middleware/auth.middleware');
const validationMiddleware = require('../../middleware/validation.middleware');
const paymentValidation = require('../../validation/payment.validation');
const RawBodyMiddleware = require('../../middleware/raw-body.middleware');

router.post(
    '/v1/payment/xendit/callback',
    RawBodyMiddleware.captureRawBody,
    paymentController.handleXenditCallback
);

router.get(
    '/v1/payment/:id',
    authMiddleware.authenticate,
    paymentController.getPaymentStatus
);

router.post(
    '/v1/payment/:id/expire',
    authMiddleware.authenticate,
    authMiddleware.authorize(['ADMIN']),
    paymentController.expirePayment
);

router.post(
    '/v1/payment/spp/create',
    authMiddleware.authenticate,
    authMiddleware.authorize(['SISWA']),
    validationMiddleware.validateBody(paymentValidation.createSppPayment()),
    paymentController.createSppPayment
);

router.post(
    '/v1/payment/spp/batch',
    authMiddleware.authenticate,
    authMiddleware.authorize(['SISWA']),
    validationMiddleware.validateBody(paymentValidation.createBatchSppPayment()),
    paymentController.createBatchSppPayment
);

router.post(
    '/v1/payment/voucher/validate',
    validationMiddleware.validateBody(paymentValidation.validateVoucher()),
    paymentController.validateVoucher
);

module.exports = router;