const { logger } = require('../../lib/config/logger.config');
const paymentService = require('../service/payment.service');
const pendaftaranService = require('../service/pendaftaran.service');
const Http = require('../../lib/http');
const ErrorHandler = require('../../lib/http/error.handler.htttp');
const { xenditConfig } = require('../../lib/config/xendit.config');

class PaymentController {
    handleXenditCallback = ErrorHandler.asyncHandler(async (req, res) => {
        // Get token from headers
        const callbackToken = req.headers['x-callback-token'];
        const rawBody = req.body;

        // Validate token
        const isValidToken = xenditConfig.validateCallbackToken(callbackToken);
        if (!isValidToken) {
            logger.warn('Invalid Xendit callback token received');
            return Http.Response.unauthorized(res, 'Invalid callback token');
        }

        // Process callback data
        const result = await paymentService.handleXenditCallback(rawBody);

        // If payment is successful and it's for pendaftaran, process the registration
        if (result.payment.statusPembayaran === 'PAID' && result.payment.tipePembayaran === 'PENDAFTARAN') {
            try {
                await pendaftaranService.processPaidPendaftaran(result.payment.id);
                logger.info(`Successfully processed pendaftaran payment for ID: ${result.payment.id}`);
            } catch (error) {
                logger.error(`Failed to process pendaftaran for payment ID: ${result.payment.id}`, error);
                // Don't send error response, still acknowledge to Xendit that we received the callback
            }
        }

        // Always return success to acknowledge receipt
        return Http.Response.success(res, {
            success: true,
            message: 'Callback received and processed successfully'
        });
    });

    getPaymentStatus = ErrorHandler.asyncHandler(async (req, res) => {
        const { id } = req.params;
        const payment = await paymentService.getPaymentStatus(id);
        return Http.Response.success(res, payment);
    });
}

module.exports = new PaymentController();
