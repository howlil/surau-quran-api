const testimoniService = require('../service/testimoni.service');
const ResponseFactory = require('../../lib/factories/response.factory');

class TestimoniController {
    create = async (req, res, next) => {
        try {
            const data = req.extract.getBody();

            if (req.file && req.file.fieldname === 'fotoUrl') {
                data.fotoUrl = req.file.filename;
            }

            const result = await testimoniService.create({ data });
            return ResponseFactory.created(result).send(res);
        } catch (error) {
            next(error)
        }
    };

    getAll = async (req, res, next) => {
        try {
            const filters = req.extract.getQuery(['page', 'limit', 'nama']);
            const result = await testimoniService.getAll({ data: filters });
            return ResponseFactory.getAll(result.data, result.meta).send(res);
        } catch (error) {
            next(error)
        }
    };


    update = async (req, res, next) => {
        try {
            const { id } = req.extract.getParams(['id']);
            const data = req.extract.getBody();

            if (req.file && req.file.fieldname === 'fotoUrl') {
                data.fotoUrl = req.file.filename;
            } else {
                delete data.fotoUrl;
            }

            const result = await testimoniService.update({ data, where: { id } });
            return ResponseFactory.updated(result).send(res);
        } catch (error) {
            next(error)
        }
    };

    delete = async (req, res, next) => {
        try {
            const { id } = req.extract.getParams(['id']);
            await testimoniService.delete({ where: { id } });
            return ResponseFactory.deleted().send(res);
        } catch (error) {
            next(error)
        }
    };
}

module.exports = new TestimoniController(); 