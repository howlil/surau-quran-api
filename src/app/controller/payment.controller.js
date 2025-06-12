// src/app/controller/payment.controller.js
const { logger } = require('../../lib/config/logger.config');
const paymentService = require('../service/payment.service');
const siswaService = require('../service/siswa.service');
const sppService = require('../service/spp.service');
const Http = require('../../lib/http');
const ErrorHandler = require('../../lib/http/error.handler.htttp');
const { xenditConfig } = require('../../lib/config/xendit.config');
const { prisma } = require('../../lib/config/prisma.config');
const { NotFoundError, BadRequestError } = require('../../lib/http/errors.http');
const PrismaUtils = require('../../lib/utils/prisma.utils');

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
            logger.info(`Payment status: ${result.statusPembayaran} for payment ID: ${result.id}`);

            let pendaftaranResult = null;
            let sppResult = null;

            if (result.statusPembayaran === 'PAID') {
                if (result.tipePembayaran === 'PENDAFTARAN') {
                    try {
                        pendaftaranResult = await siswaService.processPaidPendaftaran(result.id);
                        logger.info(`Successfully processed pendaftaran payment for ID: ${result.id}`);
                    } catch (error) {
                        if (error.message.includes('already been processed')) {
                            logger.info(`Payment ID ${result.id} was already processed. Duplicate callback handled gracefully.`);
                            return Http.Response.success(res, {
                                success: true,
                                payment: result,
                                pendaftaran_status: 'already_processed',
                                message: error.message
                            }, 'Payment already processed');
                        }

                        logger.error(`Failed to process pendaftaran for payment ID: ${result.id}`, {
                            error: error.message,
                            stack: error.stack
                        });
                        // Don't throw error here to prevent webhook retries
                        // Instead, return success but with error details
                        return Http.Response.success(res, {
                            success: true,
                            payment: result,
                            pendaftaran_status: 'failed',
                            error_message: error.message
                        }, 'Payment processed but student creation failed');
                    }
                } else if (result.tipePembayaran === 'SPP') {
                    try {
                        sppResult = await paymentService.processPaidSpp(result.id);
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

            return res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: error.message
            });
        }
    });

    createSppPayment = ErrorHandler.asyncHandler(async (req, res) => {
        const { periodeSppIds, kodeVoucher } = req.body;
        const userId = req.user.id;

        if (!periodeSppIds || !Array.isArray(periodeSppIds) || periodeSppIds.length === 0) {
            throw new BadRequestError('Pilih minimal satu periode SPP untuk dibayar');
        }

        const paymentData = await sppService.createSppPayment(userId, {
            periodeSppIds,
            kodeVoucher
        });

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