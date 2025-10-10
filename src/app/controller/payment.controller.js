// src/app/controller/payment.controller.js
const { logger } = require('../../lib/config/logger.config');
const paymentService = require('../service/payment.service');
const siswaService = require('../service/siswa.service');
const sppService = require('../service/spp.service');
const Http = require('../../lib/http');
const ErrorHandler = require('../../lib/http/error.handler.htttp');
const { xenditConfig } = require('../../lib/config/xendit.config');
const { BadRequestError } = require('../../lib/http/errors.http');
const FileUtils = require('../../lib/utils/file.utils');

class PaymentController {

    handleXenditCallback = ErrorHandler.asyncHandler(async (req, res) => {
        const callbackToken = req.headers['x-callback-token'];
        const rawBody = req.body;

        const isValidToken = xenditConfig.validateCallbackToken(callbackToken);
        if (!isValidToken) {
            logger.warn('Invalid Xendit callback token received');
            return Http.Response.unauthorized(res, 'Invalid callback token');
        }

        logger.info('Processing Xendit callback:', rawBody);
        try {
            const result = await paymentService.handleXenditCallback(rawBody);
            
            if (!result) {
                logger.warn('No result returned from handleXenditCallback');
                return res.status(500).json({
                    success: false,
                    message: 'Callback processing failed - no result returned'
                });
            }

            logger.info(`Payment status: ${result.statusPembayaran || 'UNKNOWN'} for payment ID: ${result.id || 'UNKNOWN'}`);

            if (result.statusPembayaran === 'PAID') {
                if (result.tipePembayaran === 'PENDAFTARAN') {
                    // Pendaftaran sudah diproses otomatis di handleXenditCallback
                    logger.info(`Pendaftaran payment for ID: ${result.id} already processed in callback handler`);
                } else if (result.tipePembayaran === 'SPP') {
                    try {
                        const sppResult = await paymentService.processPaidSpp(result.id);
                        logger.info(`Successfully processed SPP payment for ID: ${result.id}`);
                    } catch (error) {
                        logger.error(`Failed to process SPP for payment ID: ${result.id}`, error);
                        // Don't throw error here to prevent webhook retries
                        return Http.Response.success(res, {
                            success: false,
                            message: 'Payment processed but SPP update failed',
                            error: error.message
                        });
                    }
                }
            }

            return Http.Response.success(res, {
                success: true,
                message: 'Callback received and processed successfully',
                payment: result
            });
        } catch (error) {
            logger.error('Error handling Xendit callback:', {
                error: error.message,
                stack: error.stack,
                body: req.body
            });

            // Check if this is a duplicate callback that was already processed
            if (error.message && error.message.includes('duplicate') ||
                error.message && error.message.includes('already processed') ||
                error.message && error.message.includes('not found')) {
                // Still return 200 for Xendit to prevent retries
                return res.status(200).json({
                    success: true,
                    message: 'Callback acknowledged but skipped processing (duplicate or already processed)',
                });
            }

            // Return error response for critical failures
            return res.status(500).json({
                success: false,
                message: 'Callback processing failed',
                error: error.message
            });
        }
    });

    createSppPayment = ErrorHandler.asyncHandler(async (req, res) => {
        const { periodeSppIds, kodeVoucher, metodePembayaran } = req.body;
        const userId = req.user.id;

        if (!periodeSppIds || !Array.isArray(periodeSppIds) || periodeSppIds.length === 0) {
            throw new BadRequestError('Pilih minimal satu periode SPP untuk dibayar');
        }

        // Handle evidence file upload untuk pembayaran tunai
        let evidence = null;
        if (req.file && req.file.fieldname === 'evidence') {
            evidence = req.file.filename;
        }

        const paymentData = await sppService.createSppPayment(userId, {
            periodeSppIds,
            kodeVoucher,
            metodePembayaran,
            evidence
        });

        // Jika pembayaran tunai, langsung proses dan return success
        if (metodePembayaran === 'TUNAI') {
            const baseUrl = process.env.BACKEND_URL || `${req.protocol}://${req.get('host')}`;
            const transformedResult = FileUtils.transformPembayaranFiles(paymentData.pembayaran, baseUrl);
            
            return Http.Response.success(res, {
                success: true,
                message: 'Pembayaran SPP tunai berhasil',
                data: {
                    pembayaran: transformedResult,
                    periodeSppIds,
                    description: `SPP ${paymentData.payment.periods} - ${paymentData.payment.programs}`
                }
            }, 'Pembayaran SPP tunai berhasil');
        }

        // Jika payment gateway, buat invoice Xendit
        const invoiceData = await paymentService.createBatchSppInvoice({
            periodeSppIds,
            siswa: paymentData.siswa,
            payment: paymentData.payment,
            voucherId: paymentData.payment.voucherId
        });

        return Http.Response.success(res, {
            pembayaranId: invoiceData.pembayaranId,
            invoiceUrl: invoiceData.xenditInvoiceUrl,
            expireDate: invoiceData.expireDate,
            amount: invoiceData.amount,
            periodeSppIds,
            description: `SPP ${paymentData.payment.periods} - ${paymentData.payment.programs}`
        }, 'Invoice SPP berhasil dibuat');
    });


}

module.exports = new PaymentController();