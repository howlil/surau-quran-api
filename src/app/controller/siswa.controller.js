const siswaService = require('../service/siswa.service');
const ResponseFactory = require('../../lib/factories/response.factory');
const ErrorFactory = require('../../lib/factories/error.factory');
const XenditUtils = require('../../lib/utils/xendit.utils');
const FileUtils = require('../../lib/utils/file.utils');

class SiswaController {

  getAll = async (req, res, next) => {
    try {
      const filters = req.extract.getQuery([
        'nama', 'programId', 'page', 'limit'
      ]);
      const result = await siswaService.getAll({ data: filters });
      return ResponseFactory.getAll(result.data, result.meta).send(res);
    } catch (error) {
      next(error)
    }
  };

  getProfile = async (req, res, next) => {
    try {
      const { id: userId } = req.user;
      const filters = req.extract.getQuery(['bulan', 'page', 'limit']);
      const result = await siswaService.getProfile(userId, filters);
      return ResponseFactory.getAll(result.data, result.meta).send(res);
    } catch (error) {
      next(error)
    }
  };

  adminUpdateSiswa = async (req, res, next) => {
    try {
      const { id } = req.extract.getParams(['id']);
      const data = req.extract.getBody();
      await siswaService.adminUpdateSiswa(id, data);
      return ResponseFactory.updated({ message: 'Data siswa berhasil diperbarui' }).send(res);
    } catch (error) {
      next(error)
    }
  };

  pendaftaranSiswa = async (req, res, next) => {
    try {
      const data = req.extract.getBody();

      if (req.file && req.file.fieldname === 'evidence') {
        data.evidence = req.file.filename;
      }

      const result = await siswaService.createPendaftaran(data);

      if (result.success && result.data) {
        const transformedResult = FileUtils.transformPembayaranFiles(result.data);

        return ResponseFactory.get({
          success: true,
          message: result.message,
          data: transformedResult
        }).send(res);
      } else {
        return ResponseFactory.get({
          pendaftaranId: result.pendaftaranId,
          invoiceUrl: result.paymentInfo.xenditInvoiceUrl,
          expiryDate: result.paymentInfo.expireDate,
          amount: result.paymentInfo.amount
        }).send(res);
      }
    } catch (error) {
      next(error)
    }
  };

  getPendaftaranInvoice = async (req, res, next) => {
    try {
      const filters = req.extract.getQuery(['tanggal', 'status', 'nama', 'page', 'limit']);

      const invoices = await XenditUtils.getAllInvoice()

      const result = await siswaService.getPendaftaranInvoice(invoices, filters);
      return ResponseFactory.getAll(result.data, result.meta).send(res);
    } catch (error) {
      next(error)
    }
  };

  updateStatusSiswa = async (req, res, next) => {
    try {
      const { id } = req.extract.getParams(['id']);
      const data = req.extract.getBody(['programId', 'status']);
      const result = await siswaService.updateStatusSiswa({ 
        data: { programId: data.programId, siswaId: id, status: data.status } 
      });
      return ResponseFactory.updated(result).send(res);
    } catch (error) {
      next(error)
    }
  };

  getJadwalSiswa = async (req, res, next) => {
    try {
      const { rfid } = req.extract.getQuery(['rfid']);
      const result = await siswaService.getJadwalSiswa(rfid);
      return ResponseFactory.get(result).send(res);
    } catch (error) {
      next(error)
    }
  };

  pindahProgram = async (req, res, next) => {
    try {
      const { id } = req.extract.getParams(['id']);
      const data = req.extract.getBody();
      const result = await siswaService.pindahProgram(id, data);
      return ResponseFactory.updated(result).send(res);
    } catch (error) {
      next(error)
    }
  };

  pendaftaranSiswaV2 = async (req, res, next) => {
    try {
      let data;

      if (req.body.data) {
        try {
          data = JSON.parse(req.body.data);
        } catch (error) {
          throw ErrorFactory.badRequest('Format data JSON tidak valid');
        }
      } else {
        data = req.body;
      }

      if (!data || Object.keys(data).length === 0) {
        throw ErrorFactory.badRequest('Data pendaftaran tidak boleh kosong');
      }

      let kartuKeluargaFile = null;
      let evidenceFile = null;

      if (req.file) {
        if (req.file.fieldname === 'kartuKeluarga') {
          kartuKeluargaFile = req.file.filename;
        } else if (req.file.fieldname === 'evidence') {
          evidenceFile = req.file.filename;
        }
      }

      if (req.files && Array.isArray(req.files)) {
        req.files.forEach(file => {
          if (file.fieldname === 'kartuKeluarga') {
            kartuKeluargaFile = file.filename;
          } else if (file.fieldname === 'evidence') {
            evidenceFile = file.filename;
          }
        });
      }

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
        const transformedResult = FileUtils.transformPembayaranFiles(result.data);

        return ResponseFactory.get({
          success: true,
          message: result.message,
          data: transformedResult
        }).send(res);
      } else {
        return ResponseFactory.get({
          pendaftaranId: result.pendaftaranId,
          pembayaranId: result.pembayaranId,
          invoiceUrl: result.invoiceUrl,
          totalBiaya: result.totalBiaya,
          siswaCount: result.siswaCount
        }).send(res);
      }
    } catch (error) {
      next(error)
    }
  };
}

module.exports = new SiswaController();