const paymentService = require('../service/payment.service');
const { prisma } = require('../../lib/config/prisma.config');
const Http = require('../../lib/http');
const HttpRequest = require('../../lib/http/request.http');
const ErrorHandler = require('../../lib/http/error.handler.htttp');
const { logger } = require('../../lib/config/logger.config');

class PaymentController {
  getById = ErrorHandler.asyncHandler(async (req, res) => {
    const { id } = HttpRequest.getUrlParams(req);
    const result = await paymentService.getPaymentById(id);
    return Http.Response.success(res, result);
  });

  getAll = ErrorHandler.asyncHandler(async (req, res) => {
    const filters = HttpRequest.getQueryParams(req, [
      'page', 'limit', 'tipePembayaran', 'statusPembayaran', 'metodePembayaran'
    ]);
    const result = await paymentService.getAllPayments(filters);
    return Http.Response.success(res, result);
  });

  verifyPayment = ErrorHandler.asyncHandler(async (req, res) => {
    const { id } = HttpRequest.getUrlParams(req);
    const result = await paymentService.verifyPayment(id);
    return Http.Response.success(res, result, 'Pembayaran berhasil diverifikasi');
  });

  handleInvoiceCallback = async (req, res) => {
    try {
      const callbackData = HttpRequest.getBodyParams(req);

      // Log the incoming webhook data
      logger.info('Received Xendit invoice callback', {
        invoiceId: callbackData.id,
        externalId: callbackData.external_id,
        status: callbackData.status
      });

      // Try to process the callback
      const result = await paymentService.handleInvoiceCallback(callbackData);
      return Http.Response.success(res, result, 'Callback berhasil diproses');
    } catch (error) {
      // Log the error but don't return it to Xendit
      logger.error('[ERROR] ' + error.statusCode + ' - ' + error.message);

      // Always return a 200 response to Xendit to acknowledge receipt
      // This prevents Xendit from retrying the webhook unnecessarily
      return Http.Response.success(res, { acknowledged: true, success: false, message: error.message },
        'Callback diterima dengan error: ' + error.message);
    }
  };

  createPayment = ErrorHandler.asyncHandler(async (req, res) => {
    const data = HttpRequest.getBodyParams(req);
    const result = await paymentService.createPayment(data);
    return Http.Response.created(res, result, 'Pembayaran berhasil dibuat');
  });

  updatePaymentStatus = ErrorHandler.asyncHandler(async (req, res) => {
    const { id } = HttpRequest.getUrlParams(req);
    const { status } = HttpRequest.getBodyParams(req);
    const result = await paymentService.updatePaymentStatus(id, status);
    return Http.Response.success(res, result, 'Status pembayaran berhasil diperbarui');
  });

  cancelPayment = ErrorHandler.asyncHandler(async (req, res) => {
    const { id } = HttpRequest.getUrlParams(req);
    const result = await paymentService.cancelPayment(id);
    return Http.Response.success(res, result, 'Pembayaran berhasil dibatalkan');
  });

  // Admin: Get current month's SPP payments with filtering
  getCurrentMonthSpp = ErrorHandler.asyncHandler(async (req, res) => {
    const filters = HttpRequest.getQueryParams(req, [
      'page', 'limit', 'statusPembayaran', 'bulan', 'tahun', 'search'
    ]);
    const result = await paymentService.getCurrentMonthSpp(filters);
    return Http.Response.success(res, result, 'Data SPP bulan ini berhasil diambil');
  });

  // Student: Get their own SPP payments
  getStudentSpp = ErrorHandler.asyncHandler(async (req, res) => {
    const { id: userId } = req.user;

    // Get the siswa record first
    const siswa = await prisma.siswa.findUnique({
      where: { userId }
    });

    if (!siswa) {
      return Http.Response.notFound(res, null, 'Profil siswa tidak ditemukan');
    }

    const filters = HttpRequest.getQueryParams(req, [
      'page', 'limit', 'statusPembayaran', 'bulan', 'tahun'
    ]);

    const result = await paymentService.getStudentSpp(siswa.id, filters);
    return Http.Response.success(res, result, 'Data SPP siswa berhasil diambil');
  });

  // Student: Pay for a single SPP period
  paySpp = ErrorHandler.asyncHandler(async (req, res) => {
    const { periodeSppId } = HttpRequest.getUrlParams(req);
    const paymentData = HttpRequest.getBodyParams(req);

    // Verify that the SPP belongs to the authenticated student
    const { id: userId } = req.user;
    const siswa = await prisma.siswa.findUnique({
      where: { userId }
    });

    if (!siswa) {
      return Http.Response.notFound(res, null, 'Profil siswa tidak ditemukan');
    }

    const periodeSpp = await prisma.periodeSpp.findUnique({
      where: { id: periodeSppId },
      include: {
        programSiswa: true
      }
    });

    if (!periodeSpp) {
      return Http.Response.notFound(res, null, 'Periode SPP tidak ditemukan');
    }

    if (periodeSpp.programSiswa.siswaId !== siswa.id) {
      return Http.Response.forbidden(res, null, 'Anda tidak memiliki akses ke periode SPP ini');
    }

    const result = await paymentService.paySpp(periodeSppId, paymentData);
    return Http.Response.success(res, result, 'Pembayaran SPP berhasil dibuat');
  });

  // Student: Pay for multiple SPP periods in one go
  batchPaySpp = ErrorHandler.asyncHandler(async (req, res) => {
    const { periodeSppIds, paymentData } = HttpRequest.getBodyParams(req);

    // Verify that the user is a student
    const { id: userId, role } = req.user;

    if (role !== 'SISWA') {
      return Http.Response.forbidden(res, null, 'Hanya siswa yang dapat melakukan pembayaran batch');
    }

    const siswa = await prisma.siswa.findUnique({
      where: { userId }
    });

    if (!siswa) {
      return Http.Response.notFound(res, null, 'Profil siswa tidak ditemukan');
    }

    // Validate that all SPP periods belong to this student (will be checked in the service)
    const result = await paymentService.batchPaySpp(periodeSppIds, paymentData);
    return Http.Response.success(res, result, 'Pembayaran batch SPP berhasil dibuat');
  });
}

module.exports = new PaymentController();