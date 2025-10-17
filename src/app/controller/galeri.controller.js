const galeriService = require('../service/galeri.service');
const ResponseFactory = require('../../lib/factories/response.factory');
const ErrorFactory = require('../../lib/factories/error.factory');

class GaleriController {
    create = async (req, res, next) => {
        try {
            const data = req.extract.getBody();

            if (!req.file || req.file.fieldname !== 'coverGaleri') {
                throw ErrorFactory.badRequest('Cover galeri wajib diisi');
            }

            if (req.file && req.file.fieldname === 'coverGaleri') {
                data.coverGaleri = req.file.filename;
            }

            const result = await galeriService.create({ data });
            return ResponseFactory.created(result).send(res);
        } catch (error) {
            next(error)
        }
    };

    getAll = async (req, res, next) => {
        try {
            const filters = req.extract.getQuery(['page', 'limit', 'judul']);
            const result = await galeriService.getAll({ data: filters });
            return ResponseFactory.getAll(result.data, result.meta).send(res);
        } catch (error) {
      next(error)
        }
    };

    update = async (req, res, next) => {
        try {
            const { id } = req.extract.getParams(['id']);
            const data = req.extract.getBody();

            if (req.file && req.file.fieldname === 'coverGaleri') {
                data.coverGaleri = req.file.filename; 
            }

            const result = await galeriService.update({ data, where: { id } });
            return ResponseFactory.updated(result).send(res);
        } catch (error) {
            next(error)
        }
    };

    delete = async (req, res, next) => {
        try {
            const { id } = req.extract.getParams(['id']);
            await galeriService.delete({ where: { id } });
            return ResponseFactory.deleted().send(res);
        } catch (error) {
            next(error)
        }
    };
}

module.exports = new GaleriController(); 