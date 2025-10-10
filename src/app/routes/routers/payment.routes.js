const express = require('express');
const router = express.Router();
const paymentController = require('../../controller/payment.controller');
const authMiddleware = require('../../middleware/auth.middleware');
const validationMiddleware = require('../../middleware/validation.middleware');
const { uploadEvidencePaymentMiddleware } = require('../../middleware/upload.middleware');
const paymentValidation = require('../../validation/payment.validation');

router.post(
    '/v1/callback',
    paymentController.handleXenditCallback
);

router.patch(
    '/v1/payment/spp',
    authMiddleware.authenticate,
    authMiddleware.authorize(['SISWA']),
    uploadEvidencePaymentMiddleware,
    validationMiddleware.validateBody(paymentValidation.createSppPayment()),
    paymentController.createSppPayment
);




module.exports = router;