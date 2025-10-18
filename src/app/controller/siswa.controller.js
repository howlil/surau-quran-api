const siswaService = require('../service/siswa.service');
const ResponseFactory = require('../../lib/factories/response.factory');
const logger = require('../../lib/config/logger.config');

class SiswaController {

  getAll = async (req, res, next) => {
    try {
      const filters = req.extract.getQuery([
        'nama', 'programId', 'page', 'limit'
      ]);
      const result = await siswaService.getAll({ filters });
      return ResponseFactory.getAll(result.data, result.meta).send(res);
    } catch (error) {
      logger.error(error);
      next(error)
    }
  };

  getProfile = async (req, res, next) => {
    try {
      const { id: userId } = req.user;
      const filters = req.extract.getQuery(['bulan', 'page', 'limit']);
      const result = await siswaService.getProfile({ 
        data: { userId }, 
        filters 
      });
      return ResponseFactory.getAll(result.data, result.meta).send(res);
    } catch (error) {
      logger.error(error);
      next(error)
    }
  };

  adminUpdateSiswa = async (req, res, next) => {
    try {
      const { id } = req.extract.getParams(['id']);
      const data = req.extract.getBody();
      await siswaService.adminUpdateSiswa({ 
        data, 
        where: { id } 
      });
      return ResponseFactory.updated().send(res);
    } catch (error) {
      logger.error(error);
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
      logger.error(error);
      next(error)
    }
  };

  getJadwalSiswa = async (req, res, next) => {
    try {
      const { rfid } = req.extract.getQuery(['rfid']);
      const result = await siswaService.getJadwalSiswa({ 
        data: { rfid } 
      });
      return ResponseFactory.get(result).send(res);
    } catch (error) {
      logger.error(error);
      next(error)
    }
  };

  pindahProgram = async (req, res, next) => {
    try {
      const { id } = req.extract.getParams(['id']);
      const data = req.extract.getBody();
      const result = await siswaService.pindahProgram({ 
        data, 
        where: { id } 
      });
      return ResponseFactory.updated(result).send(res);
    } catch (error) {
      logger.error(error);
      next(error)
    }
  };

}

module.exports = new SiswaController();