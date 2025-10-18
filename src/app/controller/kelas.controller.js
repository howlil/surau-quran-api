const kelasService = require('../service/kelas.service');
const ResponseFactory = require('../../lib/factories/response.factory');
const logger = require('../../lib/config/logger.config');

class KelasController {
    create = async (req, res, next) => {
        try {
            const data = req.extract.getBody();
            const result = await kelasService.create({ data });
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
            const result = await kelasService.update({ data, where: { id } });
            return ResponseFactory.updated(result).send(res);
        } catch (error) {
            logger.error(error);
      next(error)
        }
    };

    delete = async (req, res, next) => {
        try {
            const { id } = req.extract.getParams(['id']);
            await kelasService.delete({ where: { id } });
            return ResponseFactory.deleted().send(res);
        } catch (error) {
            logger.error(error);
      next(error)
        }
    };

    getAll = async (req, res, next) => {
        try {
            const result = await kelasService.getAll();
            return ResponseFactory.get(result).send(res);
        } catch (error) {
            logger.error(error);
      next(error)
        }
    };



    getCCTV = async (req, res, next) => {
        try {
            const userId = req.user.id;
            const result = await kelasService.getCCTVByUserId({ 
                data: { userId } 
            });
            return ResponseFactory.get(result).send(res);
        } catch (error) {
            logger.error(error);
      next(error)
        }
    };

}

module.exports = new KelasController();