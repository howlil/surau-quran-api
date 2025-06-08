const siswaService = require('../service/siswa.service');
const Http = require('../../lib/http');
const HttpRequest = require('../../lib/http/request.http');
const ErrorHandler = require('../../lib/http/error.handler.htttp');
const XenditUtils = require('../../lib/utils/xendit.utils');

class SiswaController {

  getAll = ErrorHandler.asyncHandler(async (req, res) => {
    const filters = HttpRequest.getQueryParams(req, [
      'page', 'limit'
    ]);
    const result = await siswaService.getAll(filters);
    return Http.Response.success(res, result);
  });

  getProfile = ErrorHandler.asyncHandler(async (req, res) => {
    const { id: userId } = req.user;
    const filters = HttpRequest.getQueryParams(req, ['bulan', 'page', 'limit']);
    const result = await siswaService.getProfile(userId, filters);
    return Http.Response.success(res, result);
  });

  adminUpdateSiswa = ErrorHandler.asyncHandler(async (req, res) => {
    const { id } = HttpRequest.getUrlParams(req);
    const data = HttpRequest.getBodyParams(req);
    await siswaService.adminUpdateSiswa(id, data);
    return Http.Response.success(res, 'Data siswa berhasil diperbarui');
  });

  pendaftaranSiswa = ErrorHandler.asyncHandler(async (req, res) => {
    const data = HttpRequest.getBodyParams(req);
    const result = await siswaService.createPendaftaran(data);
    return Http.Response.success(res, {
      message: 'Pendaftaran berhasil dibuat, silahkan lakukan pembayaran',
      data: {
        pendaftaranId: result.pendaftaranId,
        invoiceUrl: result.paymentInfo.xenditInvoiceUrl,
        expiryDate: result.paymentInfo.expireDate,
        amount: result.paymentInfo.amount
      }
    });
  });

  getPendaftaranInvoice = ErrorHandler.asyncHandler(async (req, res) => {
    const filters = HttpRequest.getQueryParams(req, ['tanggal', 'status', 'page', 'limit']);

    const invoices = await XenditUtils.getAllInvoice()

    const result = await siswaService.getPendaftaranInvoice(invoices, filters);
    return Http.Response.success(res, {
      message: 'Invoice pendaftaran berhasil ditemukan',
      data: result
    });
  });


  updateStatusSiswa = ErrorHandler.asyncHandler(async (req, res) => {
    const { id } = HttpRequest.getUrlParams(req);
    const data = HttpRequest.getBodyParams(req);
    await siswaService.updateStatusSiswa(data.programId, id, data.status);
    return Http.Response.success(res, 'Status siswa berhasil diperbarui');
  });
}

module.exports = new SiswaController();