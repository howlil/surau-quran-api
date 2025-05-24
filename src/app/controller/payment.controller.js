const { logger } = require('../../lib/config/logger.config');
const paymentService = require('../service/payment.service');
const pendaftaranService = require('../service/pendaftaran.service');
const voucherService = require('../service/voucher.service');
const Http = require('../../lib/http');
const HttpRequest = require('../../lib/http/request.http');
const ErrorHandler = require('../../lib/http/error.handler.htttp');
const { xenditConfig } = require('../../lib/config/xendit.config');
const { prisma } = require('../../lib/config/prisma.config');
const { NotFoundError, BadRequestError } = require('../../lib/http/errors.http');

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

        if (result.payment.statusPembayaran === 'LUNAS' && result.payment.tipePembayaran === 'PENDAFTARAN') {
            try {
                await pendaftaranService.processPaidPendaftaran(result.payment.id);
                logger.info(`Successfully processed pendaftaran payment for ID: ${result.payment.id}`);
            } catch (error) {
                logger.error(`Failed to process pendaftaran for payment ID: ${result.payment.id}`, error);
            }
        }

        return Http.Response.success(res, {
            success: true,
            message: 'Callback received and processed successfully'
        });

    expirePayment = ErrorHandler.asyncHandler(async (req, res) => {
        const { id } = req.params;
        const result = await paymentService.expirePayment(id);
        return Http.Response.success(res, result, 'Payment berhasil diexpired');
    });
    });

    getPaymentStatus = ErrorHandler.asyncHandler(async (req, res) => {
        const { id } = req.params;
        const payment = await paymentService.getPaymentStatus(id);
        return Http.Response.success(res, payment);
    });

    expirePayment = ErrorHandler.asyncHandler(async (req, res) => {
        const { id } = req.params;
        const result = await paymentService.expirePayment(id);
        return Http.Response.success(res, result, 'Payment berhasil diexpired');
    });

    createSppPayment = ErrorHandler.asyncHandler(async (req, res) => {
        const { periodeSppId, kodeVoucher, successRedirectUrl, failureRedirectUrl } = req.body;
        const userId = req.user.id;

        const siswa = await prisma.siswa.findUnique({
            where: { userId },
            include: {
                user: true
            }
        });

        if (!siswa) {
            throw new NotFoundError('Data siswa tidak ditemukan');
        }

        const periodeSpp = await prisma.periodeSpp.findUnique({
            where: { id: periodeSppId },
            include: {
                programSiswa: {
                    include: {
                        siswa: true
                    }
                },
                pembayaran: true
            }
        });

        if (!periodeSpp) {
            throw new NotFoundError('Periode SPP tidak ditemukan');
        }

        if (periodeSpp.programSiswa.siswaId !== siswa.id) {
            throw new BadRequestError('Periode SPP ini bukan milik Anda');
        }

        if (periodeSpp.pembayaran) {
            throw new BadRequestError('Periode SPP sudah memiliki pembayaran');
        }

        let totalBiaya = Number(periodeSpp.totalTagihan);
        let voucherId = null;

        if (kodeVoucher) {
            const voucher = await voucherService.getVoucherByKode(kodeVoucher);
            if (voucher && voucher.isActive && voucher.jumlahPenggunaan > 0) {
                voucherId = voucher.id;
                
                let diskon = 0;
                if (voucher.tipe === 'NOMINAL') {
                    diskon = Number(voucher.nominal);
                } else if (voucher.tipe === 'PERSENTASE') {
                    diskon = totalBiaya * (Number(voucher.nominal) / 100);
                }

                totalBiaya = Math.max(0, totalBiaya - diskon);

                await prisma.periodeSpp.update({
                    where: { id: periodeSppId },
                    data: {
                        diskon: diskon,
                        totalTagihan: totalBiaya,
                        voucher_id: voucherId
                    }
                });
            }
        }

        const paymentData = await paymentService.createSppInvoice({
            email: siswa.user.email,
            namaSiswa: siswa.namaMurid,
            totalBiaya,
            periodeSppId,
            successRedirectUrl,
            failureRedirectUrl
        });

        return Http.Response.success(res, {
            pembayaranId: paymentData.pembayaranId,
            invoiceUrl: paymentData.xenditInvoiceUrl,
            expireDate: paymentData.expireDate,
            amount: paymentData.amount,
            periodeSppId
        }, 'Invoice SPP berhasil dibuat');
    });

    createBatchSppPayment = ErrorHandler.asyncHandler(async (req, res) => {
        const { periodeSppIds, kodeVoucher, successRedirectUrl, failureRedirectUrl } = req.body;
        const userId = req.user.id;

        const siswa = await prisma.siswa.findUnique({
            where: { userId },
            include: {
                user: true
            }
        });

        if (!siswa) {
            throw new NotFoundError('Data siswa tidak ditemukan');
        }

        const periodeSppList = await prisma.periodeSpp.findMany({
            where: {
                id: { in: periodeSppIds },
                programSiswa: {
                    siswaId: siswa.id
                },
                pembayaran: null
            },
            include: {
                programSiswa: {
                    include: {
                        program: true
                    }
                }
            }
        });

        if (periodeSppList.length !== periodeSppIds.length) {
            throw new BadRequestError('Beberapa periode SPP tidak valid atau sudah dibayar');
        }

        let totalBiaya = periodeSppList.reduce((sum, periode) => sum + Number(periode.totalTagihan), 0);
        let voucherId = null;

        if (kodeVoucher) {
            const voucher = await voucherService.getVoucherByKode(kodeVoucher);
            if (voucher && voucher.isActive && voucher.jumlahPenggunaan > 0) {
                voucherId = voucher.id;
                
                let diskon = 0;
                if (voucher.tipe === 'NOMINAL') {
                    diskon = Number(voucher.nominal);
                } else if (voucher.tipe === 'PERSENTASE') {
                    diskon = totalBiaya * (Number(voucher.nominal) / 100);
                }

                totalBiaya = Math.max(0, totalBiaya - diskon);
            }
        }

        const months = periodeSppList.map(p => p.bulan).join(', ');
        const programs = [...new Set(periodeSppList.map(p => p.programSiswa.program.namaProgram))].join(', ');

        const paymentData = await paymentService.createSppInvoice({
            email: siswa.user.email,
            namaSiswa: `${siswa.namaMurid} - ${months}`,
            totalBiaya,
            periodeSppId: periodeSppIds[0],
            successRedirectUrl,
            failureRedirectUrl
        });

        for (const periodeSpp of periodeSppList) {
            await prisma.periodeSpp.update({
                where: { id: periodeSpp.id },
                data: {
                    pembayaranId: paymentData.pembayaranId,
                    voucher_id: voucherId
                }
            });
        }

        return Http.Response.success(res, {
            pembayaranId: paymentData.pembayaranId,
            invoiceUrl: paymentData.xenditInvoiceUrl,
            expireDate: paymentData.expireDate,
            amount: paymentData.amount,
            periodeSppIds,
            description: `SPP ${months} - ${programs}`
        }, 'Invoice SPP batch berhasil dibuat');
    });

    validateVoucher = ErrorHandler.asyncHandler(async (req, res) => {
        const { kodeVoucher, totalBiaya } = req.body;

        const voucher = await voucherService.getVoucherByKode(kodeVoucher);
        
        if (!voucher) {
            throw new NotFoundError('Voucher tidak ditemukan');
        }

        if (!voucher.isActive) {
            throw new BadRequestError('Voucher tidak aktif');
        }

        if (voucher.jumlahPenggunaan <= 0) {
            throw new BadRequestError('Voucher sudah habis digunakan');
        }

        let diskon = 0;
        if (voucher.tipe === 'NOMINAL') {
            diskon = Number(voucher.nominal);
        } else if (voucher.tipe === 'PERSENTASE') {
            diskon = Number(totalBiaya) * (Number(voucher.nominal) / 100);
        }

        const finalAmount = Math.max(0, Number(totalBiaya) - diskon);

        return Http.Response.success(res, {
            valid: true,
            voucher: {
                id: voucher.id,
                kodeVoucher: voucher.kodeVoucher,
                tipe: voucher.tipe,
                nominal: voucher.nominal
            },
            calculation: {
                originalAmount: Number(totalBiaya),
                discount: diskon,
                finalAmount
            }
        }, 'Voucher valid');
    });
}

module.exports = new PaymentController();