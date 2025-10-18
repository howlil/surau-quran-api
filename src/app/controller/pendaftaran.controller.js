const pendaftaranService = require('../service/pendaftaran.service');
const ResponseFactory = require('../../lib/factories/response.factory');
const logger = require('../../lib/config/logger.config');

class PendaftaranController {

  pendaftaranSiswa = async (req, res, next) => {
    try {
      const data = req.extract.getBody();

      if (req.file && req.file.fieldname === 'evidence') {
        data.evidence = req.file.filename;
      } else if (req.files) {
        if (Array.isArray(req.files)) {
          const evidenceFile = req.files.find(file => file.fieldname === 'evidence');
          if (evidenceFile) {
            data.evidence = evidenceFile.filename;
          }
        } else if (req.files.evidence) {
          data.evidence = req.files.evidence.filename;
        }
      }

      const result = await pendaftaranService.createPendaftaran({ data });

      return ResponseFactory.get(result).send(res);

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

      if (kartuKeluargaFile) {
        data.kartuKeluarga = kartuKeluargaFile;
      }

      const result = await pendaftaranService.createPendaftaranV2({ data });

      return ResponseFactory.get(result).send(res);

    } catch (error) {
      logger.error(error);
      next(error)
    }
  };

}

module.exports = new PendaftaranController();
