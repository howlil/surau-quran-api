const pendaftaranService = require('../service/pendaftaran.service');
const ResponseFactory = require('../../lib/factories/response.factory');
const FileUtils = require('../../lib/utils/file.utils');
const logger = require('../../lib/config/logger.config');

class PendaftaranController {

  pendaftaranSiswa = async (req, res, next) => {
    try {
      const data = req.extract.getBody();

      if (req.file && req.file.fieldname === 'evidence') {
        data.evidence = req.file.filename;
      }

      const result = await pendaftaranService.createPendaftaran(data);

      if (result.success && result.data) {
        const transformedResult = FileUtils.transformPembayaranFiles(result.data);
        return ResponseFactory.get(transformedResult).send(res);
      } else {
        return ResponseFactory.get({
          redirectUrl: result.redirectUrl,
          expireDate: result.expireDate
        }).send(res);
      }
    } catch (error) {
      logger.error(error);
      next(error)
    }
  };

  getPendaftaranInvoice = async (req, res, next) => {
    try {
      const filters = req.extract.getQuery(['tanggal', 'status', 'nama', 'page', 'limit']);

      // const invoices = await XenditUtils.getAllInvoice()

      // const result = await pendaftaranService.getPendaftaranInvoice(invoices, filters);
      // return ResponseFactory.getAll(result.data, result.meta).send(res);
    } catch (error) {
      logger.error(error);
      next(error)
    }
  };

  pendaftaranSiswaV2 = async (req, res, next) => {
    try {
      const data = req.extract.getBody();

      let kartuKeluargaFile = null;
      let evidenceFile = null;

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

      const result = await pendaftaranService.createPendaftaranV2(data, kartuKeluargaFile);

      if (result.success && result.data) {
        const transformedResult = FileUtils.transformPembayaranFiles(result.data);
        return ResponseFactory.get(transformedResult).send(res);
      } else {
        return ResponseFactory.get({
          redirectUrl: result.redirectUrl,
          expireDate: result.expireDate
        }).send(res);
      }
    } catch (error) {
      logger.error(error);
      next(error)
    }
  };

}

module.exports = new PendaftaranController();
