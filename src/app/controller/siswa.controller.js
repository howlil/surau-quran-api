const siswaService = require('../service/siswa.service');
const Http = require('../../lib/http');
const HttpRequest = require('../../lib/http/request.http');
const ErrorHandler = require('../../lib/http/error.handler.htttp');
const XenditUtils = require('../../lib/utils/xendit.utils');
const FileUtils = require('../../lib/utils/file.utils');
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
    
    // Handle evidence file upload untuk pembayaran tunai
    if (req.file && req.file.fieldname === 'evidence') {
      data.evidence = req.file.filename;
    }

    const result = await siswaService.createPendaftaran(data);
    
    // Handle response berdasarkan metode pembayaran
    if (result.success && result.data) {
      const baseUrl = process.env.BACKEND_URL || `${req.protocol}://${req.get('host')}`;
      const transformedResult = FileUtils.transformPembayaranFiles(result.data, baseUrl);
      
      return Http.Response.success(res, {
        success: true,
        message: result.message,
        data: transformedResult
      }, 'Pendaftaran tunai berhasil, akun siswa telah dibuat');
    } else {
      // Response untuk pembayaran gateway (Xendit)
      return Http.Response.success(res, {
        pendaftaranId: result.pendaftaranId,
        invoiceUrl: result.paymentInfo.xenditInvoiceUrl,
        expiryDate: result.paymentInfo.expireDate,
        amount: result.paymentInfo.amount
      }, 'Pendaftaran berhasil dibuat, silahkan lakukan pembayaran');
    }
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

  pendaftaranSiswaV2 = ErrorHandler.asyncHandler(async (req, res) => {
    let data;

    if (req.body.data) {
      try {
        data = JSON.parse(req.body.data);
      } catch (error) {
        throw new BadRequestError('Format data JSON tidak valid');
      }
    } else {
      data = req.body;
    }

    if (!data || Object.keys(data).length === 0) {
      throw new BadRequestError('Data pendaftaran tidak boleh kosong');
    }

    // Handle file uploads - bisa ada kartu keluarga, evidence, atau keduanya
    let kartuKeluargaFile = null;
    let evidenceFile = null;

    // Handle single file upload
    if (req.file) {
      if (req.file.fieldname === 'kartuKeluarga') {
        kartuKeluargaFile = req.file.filename;
      } else if (req.file.fieldname === 'evidence') {
        evidenceFile = req.file.filename;
      }
    }

    // Handle multiple files upload (bisa ada kartu keluarga + evidence)
    if (req.files && Array.isArray(req.files)) {
      req.files.forEach(file => {
        if (file.fieldname === 'kartuKeluarga') {
          kartuKeluargaFile = file.filename;
        } else if (file.fieldname === 'evidence') {
          evidenceFile = file.filename;
        }
      });
    }

    // Handle multiple files dalam object (multer dengan multiple fields)
    if (req.files && typeof req.files === 'object' && !Array.isArray(req.files)) {
      Object.keys(req.files).forEach(fieldname => {
        const file = req.files[fieldname];
        if (fieldname === 'kartuKeluarga') {
          kartuKeluargaFile = file.filename;
        } else if (fieldname === 'evidence') {
          evidenceFile = file.filename;
        }
      });
    }

    if (evidenceFile) {
      data.evidence = evidenceFile;
    }

  
    const result = await siswaService.createPendaftaranV2(data, kartuKeluargaFile);

    if (result.success && result.data) {
      const baseUrl = process.env.BACKEND_URL || `${req.protocol}://${req.get('host')}`;
      const transformedResult = FileUtils.transformPembayaranFiles(result.data, baseUrl);
      
      return Http.Response.success(res, {
        success: true,
        message: result.message,
        data: transformedResult
      }, 'Pendaftaran tunai V2 berhasil, akun siswa telah dibuat');
    } else {
      return Http.Response.success(res, {
        pendaftaranId: result.pendaftaranId,
        pembayaranId: result.pembayaranId,
        invoiceUrl: result.invoiceUrl,
        totalBiaya: result.totalBiaya,
        siswaCount: result.siswaCount
      }, 'Pendaftaran berhasil dilakukan, silakan lakukan pembayaran');
    }
  });
}

module.exports = new SiswaController();