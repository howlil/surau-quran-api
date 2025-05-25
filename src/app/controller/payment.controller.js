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

        const result = await paymentService.handleXenditCallback(rawBody);

        if (result.payment.statusPembayaran === 'PAID') {
            if (result.payment.tipePembayaran === 'PENDAFTARAN') {
                try {
                    await siswaService.processPaidPendaftaran(result.payment.id);
                    logger.info(`Successfully processed pendaftaran payment for ID: ${result.payment.id}`);
                } catch (error) {
                    logger.error(`Failed to process pendaftaran for payment ID: ${result.payment.id}`, error);
                }
            } else if (result.payment.tipePembayaran === 'SPP') {
                try {
                    await paymentService.processPaidSpp(result.payment.id);
                    logger.info(`Successfully processed SPP payment for ID: ${result.payment.id}`);
                } catch (error) {
                    logger.error(`Failed to process SPP for payment ID: ${result.payment.id}`, error);
                }
            }
        }

        return Http.Response.success(res, {
            success: true,
            message: 'Callback received and processed successfully'
        });
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