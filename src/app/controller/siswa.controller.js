const siswaService = require('../service/siswa.service');
const pendaftaranService = require('../service/pendaftaran.service');
const Http = require('../../lib/http');
const HttpRequest = require('../../lib/http/request.http');
const ErrorHandler = require('../../lib/http/error.handler.htttp');

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
    const pendaftaranData = HttpRequest.getBodyParams(req);
    const result = await pendaftaranService.createPendaftaran(pendaftaranData);

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
}

module.exports = new SiswaController();