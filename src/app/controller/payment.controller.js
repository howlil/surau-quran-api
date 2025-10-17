const { logger } = require('../../lib/config/logger.config');
const paymentService = require('../service/payment.service');
const siswaService = require('../service/siswa.service');
const sppService = require('../service/spp.service');
const ResponseFactory = require('../../lib/factories/response.factory');
const ErrorFactory = require('../../lib/factories/error.factory');
const { xenditConfig } = require('../../lib/config/xendit.config');
const FileUtils = require('../../lib/utils/file.utils');

class PaymentController {

    handleXenditCallback = async (req, res, next) => {
        try {
            const callbackToken = req.extract.getHeaders(['x-callback-token'])['x-callback-token'];
            const rawBody = req.body;

            const isValidToken = xenditConfig.validateCallbackToken(callbackToken);
            if (!isValidToken) {
                logger.warn('Invalid Xendit callback token received');
                throw ErrorFactory.unauthorized('Invalid callback token');
            }

            logger.info('Processing Xendit callback:', rawBody);
            const result = await paymentService.handleXenditCallback(rawBody);
            
            if (!result) {
                logger.warn('No result returned from handleXenditCallback');
                throw ErrorFactory.internalServerError('Callback processing failed - no result returned');
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
                        return ResponseFactory.get({
                            success: false,
                            message: 'Payment processed but SPP update failed',
                            error: error.message
                        }).send(res);
                    }
                }
            }

            return ResponseFactory.get({
                success: true,
                message: 'Callback received and processed successfully',
                payment: result
            }).send(res);
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
                return ResponseFactory.get({
                    success: true,
                    message: 'Callback acknowledged but skipped processing (duplicate or already processed)',
                }).send(res);
            }

      next(error)
        }
    };

    createSppPayment = async (req, res, next) => {
        try {
            const { periodeSppIds, kodeVoucher, metodePembayaran } = req.extract.getBody(['periodeSppIds', 'kodeVoucher', 'metodePembayaran']);
            const userId = req.user.id;

            if (!periodeSppIds || !Array.isArray(periodeSppIds) || periodeSppIds.length === 0) {
                throw ErrorFactory.badRequest('Pilih minimal satu periode SPP untuk dibayar');
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
                
                return ResponseFactory.get({
                    success: true,
                    message: 'Pembayaran SPP tunai berhasil',
                    data: {
                        pembayaran: transformedResult,
                        periodeSppIds,
                        description: `SPP ${paymentData.payment.periods} - ${paymentData.payment.programs}`
                    }
                }).send(res);
            }

            // Jika payment gateway, buat invoice Xendit
            const invoiceData = await paymentService.createBatchSppInvoice({
                periodeSppIds,
                siswa: paymentData.siswa,
                payment: paymentData.payment,
                voucherId: paymentData.payment.voucherId
            });

            return ResponseFactory.get({
                pembayaranId: invoiceData.pembayaranId,
                invoiceUrl: invoiceData.xenditInvoiceUrl,
                expireDate: invoiceData.expireDate,
                amount: invoiceData.amount,
                periodeSppIds,
                description: `SPP ${paymentData.payment.periods} - ${paymentData.payment.programs}`
            }).send(res);
        } catch (error) {
            next(error)
        }
    };


}

module.exports = new PaymentController();