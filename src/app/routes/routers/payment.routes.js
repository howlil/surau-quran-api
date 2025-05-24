const express = require('express');
const router = express.Router();
const paymentController = require('../../controller/payment.controller');
const authMiddleware = require('../../middleware/auth.middleware');
const validationMiddleware = require('../../middleware/validation.middleware');
const paymentValidation = require('../../validation/payment.validation');

router.post(
    '/v1/callback',
    paymentController.handleXenditCallback
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


module.exports = router;