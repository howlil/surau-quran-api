const express = require('express');
const router = express.Router();
const paymentController = require('../../controller/payment.controller');
const authMiddleware = require('../../middleware/auth.middleware');

// Xendit callback endpoint - no auth middleware needed as it's called by Xendit
router.post(
    '/v1/payment/xendit/callback',
    express.raw({ type: 'application/json' }),
    paymentController.handleXenditCallback
);

// Get payment status - authenticated route
router.get(
    '/v1/payment/:id',
    authMiddleware.authenticate,
    paymentController.getPaymentStatus
);

module.exports = router;
