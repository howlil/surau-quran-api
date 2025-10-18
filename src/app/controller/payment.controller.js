const paymentService = require('../service/payment.service');
const siswaService = require('../service/siswa.service');
const sppService = require('../service/spp.service');
const ResponseFactory = require('../../lib/factories/response.factory');
const ErrorFactory = require('../../lib/factories/error.factory');
const FileUtils = require('../../lib/utils/file.utils');
const logger = require('../../lib/config/logger.config');

class PaymentController {

    handleXenditCallback = async (req, res, next) => {
        // try {
        //     const callbackToken = req.extract.getHeaders(['x-callback-token'])['x-callback-token'];
        //     const rawBody = req.body;

        //     const isValidToken = xenditConfig.validateCallbackToken(callbackToken);
        //     if (!isValidToken) {
        //         throw ErrorFactory.unauthorized('Invalid callback token');
        //     }

        //     const result = await paymentService.handleXenditCallback(rawBody);

        //     if (!result) {
        //         throw ErrorFactory.internalServerError('Callback processing failed - no result returned');
        //     }


        //     if (result.statusPembayaran === 'PAID') {
        //         if (result.tipePembayaran === 'PENDAFTARAN') {
        //         } else if (result.tipePembayaran === 'SPP') {
        //             try {
        //                 const sppResult = await paymentService.processPaidSpp(result.id);
        //             } catch (error) {
        //                 logger.error(`Failed to process SPP for payment ID: ${result.id}`, error);
        //                 return ResponseFactory.get({
        //                     error: error.message
        //                 }).send(res);
        //             }
        //         }
        //     }

        //     return ResponseFactory.get(result).send(res);
        // } catch (error) {
        //     next(error)
        // }
    };

    createSppPayment = async (req, res, next) => {
        try {
            const { periodeSppIds, kodeVoucher, metodePembayaran } = req.extract.getBody(['periodeSppIds', 'kodeVoucher', 'metodePembayaran']);
            const userId = req.user.id;

            if (!periodeSppIds || !Array.isArray(periodeSppIds) || periodeSppIds.length === 0) {
                throw ErrorFactory.badRequest('Pilih minimal satu periode SPP untuk dibayar');
            }

            let evidence = null;
            if (req.file && req.file.fieldname === 'evidence') {
                evidence = req.file.filename;
            }

            const paymentData = await sppService.createSppPayment({
                data: {
                    userId,
                    periodeSppIds,
                    kodeVoucher,
                    metodePembayaran,
                    evidence
                }
            });

            if (metodePembayaran === 'TUNAI') {
                const transformedResult = FileUtils.transformPembayaranFiles(paymentData.pembayaran);

                return ResponseFactory.get({
                    pembayaran: transformedResult,
                    periodeSppIds,
                    description: `SPP ${paymentData.payment.periods} - ${paymentData.payment.programs}`
                }).send(res);
            }

            // Jika payment gateway, buat invoice Xendit
            const invoiceData = await paymentService.createBatchSppInvoice({
                data: {
                    periodeSppIds,
                    siswa: paymentData.siswa,
                    payment: paymentData.payment,
                    voucherId: paymentData.payment.voucherId
                }
            })

            return ResponseFactory.get({
                pembayaranId: invoiceData.pembayaranId,
                invoiceUrl: invoiceData.xenditInvoiceUrl,
                expireDate: invoiceData.expireDate,
                amount: invoiceData.amount,
                periodeSppIds,
                description: `SPP ${paymentData.payment.periods} - ${paymentData.payment.programs}`
            }).send(res);
        } catch (error) {
            logger.error(error);
      next(error)
        }
    };

}

module.exports = new PaymentController();