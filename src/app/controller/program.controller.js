const programService = require('../service/program.service');
const ResponseFactory = require('../../lib/factories/response.factory');
const logger = require('../../lib/config/logger.config');


class ProgramController {
  create = async (req, res, next) => {
    try {
      const data = req.extract.getBody();

      if (req.file && req.file.fieldname === 'cover') {
        data.cover = req.file.filename;
      }

      const result = await programService.create({ data });
      return ResponseFactory.created(result).send(res);
    } catch (error) {
      logger.error(error);
      next(error)
    }
  };

  update = async (req, res, next) => {
    try {
      const { id } = req.extract.getParams(['id']);
      const data = req.extract.getBody();

      if (req.file && req.file.fieldname === 'cover') {
        data.cover = req.file.filename;
      } else {
        delete data.cover;
      }

      const result = await programService.update({ data, where: { id } });
      return ResponseFactory.updated(result).send(res);
    } catch (error) {
      logger.error(error);
      next(error)
    }
  };

  delete = async (req, res, next) => {
    try {
      const { id } = req.extract.getParams(['id']);
      await programService.delete({ where: { id } });
      return ResponseFactory.deleted().send(res);
    } catch (error) {
      logger.error(error);
      next(error)
    }
  };

  getAll = async (req, res, next) => {
    try {
      const filters = req.extract.getQuery(['namaProgram']);
      const result = await programService.getAllNoPagination({ data: filters });
      return ResponseFactory.get(result).send(res);
    } catch (error) {
      logger.error(error);
      next(error)
    }
  };

  getAllPublic = async (req, res, next) => {
    try {
      const result = await programService.getAllPublic();
      return ResponseFactory.get(result).send(res);
    } catch (error) {
      logger.error(error);
      next(error)
    }
  };

  getProgramStudents = async (req, res, next) => {
    try {
      const { programId } = req.extract.getParams(['programId']);
      const filters = req.extract.getQuery(['page', 'limit']);
      const result = await programService.getProgramStudents(programId, filters);
      return ResponseFactory.getAll(result.data, result.meta).send(res);
    } catch (error) {
      logger.error(error);
      next(error)
    }
  };


}

module.exports = new ProgramController();