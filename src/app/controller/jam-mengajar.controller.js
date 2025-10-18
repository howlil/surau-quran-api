const jamMengajarService = require('../service/jam-mengajar.service');
const ResponseFactory = require('../../lib/factories/response.factory');
const logger = require('../../lib/config/logger.config');

class JamMengajarController {
    create = async (req, res, next) => {
        try {
            const data = req.extract.getBody();
            const result = await jamMengajarService.create({ data });
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
            const result = await jamMengajarService.update({ data, where: { id } });
            return ResponseFactory.updated(result).send(res);
        } catch (error) {
            logger.error(error);
      next(error)
        }
    };

    delete = async (req, res, next) => {
        try {
            const { id } = req.extract.getParams(['id']);
            await jamMengajarService.delete({ where: { id } });
            return ResponseFactory.deleted().send(res);
        } catch (error) {
            logger.error(error);
      next(error)
        }
    };

    getAll = async (req, res, next) => {
        try {
            const result = await jamMengajarService.getAll();
            return ResponseFactory.get(result).send(res);
        } catch (error) {
            logger.error(error);
      next(error)
        }
    };
}

module.exports = new JamMengajarController();