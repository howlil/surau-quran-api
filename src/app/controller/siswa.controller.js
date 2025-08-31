const siswaService = require('../service/siswa.service');
const Http = require('../../lib/http');
const HttpRequest = require('../../lib/http/request.http');
const ErrorHandler = require('../../lib/http/error.handler.htttp');
const XenditUtils = require('../../lib/utils/xendit.utils');
const { BadRequestError } = require('../../lib/http/errors.http');

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
    const filters = HttpRequest.getQueryParams(req, ['tanggal', 'status', 'nama', 'page', 'limit']);

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
        siswaNama: result.siswa.namaMurid,
        siswaNis: result.siswa.nis,
        programId: result.programId,
        programNama: result.program.namaProgram,
        statusLama: result.statusLama,
        statusBaru: result.statusBaru
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

  // Pendaftaran V2 dengan support private program
  pendaftaranSiswaV2 = ErrorHandler.asyncHandler(async (req, res) => {
    // Handle multipart form data - data bisa langsung di req.body atau dalam field 'data'
    let data;

    if (req.body.data) {
      // Jika data ada dalam field 'data' sebagai JSON string
      try {
        data = JSON.parse(req.body.data);
      } catch (error) {
        throw new BadRequestError('Format data JSON tidak valid');
      }
    } else {
      // Jika data langsung ada di req.body
      data = req.body;
    }

    // Validate that data is not empty
    if (!data || Object.keys(data).length === 0) {
      throw new BadRequestError('Data pendaftaran tidak boleh kosong');
    }



    // Get uploaded file (kartuKeluarga) if any
    const kartuKeluargaFile = req.file ? req.file.filename : null;

    const result = await siswaService.createPendaftaranV2(data, kartuKeluargaFile);

    return Http.Response.success(res, {
      pendaftaranId: result.pendaftaranId,
      pembayaranId: result.pembayaranId,
      invoiceUrl: result.invoiceUrl,
      totalBiaya: result.totalBiaya,
      siswaCount: result.siswaCount
    }, 'Pendaftaran berhasil dilakukan, silakan lakukan pembayaran');
  });
}

module.exports = new SiswaController();