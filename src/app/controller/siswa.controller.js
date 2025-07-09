const siswaService = require('../service/siswa.service');
const Http = require('../../lib/http');
const HttpRequest = require('../../lib/http/request.http');
const ErrorHandler = require('../../lib/http/error.handler.htttp');
const XenditUtils = require('../../lib/utils/xendit.utils');

class SiswaController {

  getAll = ErrorHandler.asyncHandler(async (req, res) => {
    const filters = HttpRequest.getQueryParams(req, [
      'nama', 'programId', 'page', 'limit'
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
    return Http.Response.success(res, result);
  });

  updateStatusSiswa = ErrorHandler.asyncHandler(async (req, res) => {
    const { id } = HttpRequest.getUrlParams(req);
    const data = HttpRequest.getBodyParams(req);
    const result = await siswaService.updateStatusSiswa(data.programId, id, data.status);
    return Http.Response.success(res, {
      message: 'Status program siswa berhasil diperbarui',
      data: {
        siswaId: id,
        programId: result.programId,
        statusBaru: result.status
      }
    });
  });

  getJadwalSiswa = ErrorHandler.asyncHandler(async (req, res) => {
    const { rfid } = HttpRequest.getQueryParams(req, ['rfid']);
    const result = await siswaService.getJadwalSiswa(rfid);
    return Http.Response.success(res, result);
  });

  pindahProgram = ErrorHandler.asyncHandler(async (req, res) => {
    const { id } = HttpRequest.getUrlParams(req);
    const data = HttpRequest.getBodyParams(req);
    const result = await siswaService.pindahProgram(id, data);
    return Http.Response.success(res, result, 'Siswa berhasil pindah program');
  });
}

module.exports = new SiswaController();