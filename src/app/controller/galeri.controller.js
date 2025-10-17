const galeriService = require('../service/galeri.service');
const ResponseFactory = require('../../lib/factories/response.factory');
const ErrorFactory = require('../../lib/factories/error.factory');
const FileUtils = require('../../lib/utils/file.utils');

class GaleriController {
    create = async (req, res, next) => {
        try {
            const data = req.extract.getBody();

            // Check if coverGaleri file is uploaded
            if (!req.file || req.file.fieldname !== 'coverGaleri') {
                throw ErrorFactory.badRequest('Cover galeri wajib diisi');
            }

            // Handle coverGaleri file upload
            if (req.file && req.file.fieldname === 'coverGaleri') {
                data.coverGaleri = req.file.filename; // Use filename instead of path
            }

            const baseUrl = process.env.BACKEND_URL || `${req.protocol}://${req.get('host')}`;
            const result = await galeriService.create(data);
            const transformedResult = FileUtils.transformGaleriFiles(result, baseUrl);

            const responseData = {
                galeriId: transformedResult.id,
                judulFoto: transformedResult.judulFoto,
                coverGaleri: transformedResult.coverGaleri
            };
            return ResponseFactory.created(responseData).send(res);
        } catch (error) {
            next(error)
        }
    };

    getAll = async (req, res, next) => {
        try {
            const filters = req.extract.getQuery(['page', 'limit', 'judul']);
            const baseUrl = process.env.BACKEND_URL || `${req.protocol}://${req.get('host')}`;
            const result = await galeriService.getAll(filters);
            
            const transformedData = {
                ...result,
                data: result.data.map(galeri => ({
                    galeriId: galeri.id,
                    judulFoto: galeri.judulFoto,
                    coverGaleri: FileUtils.getImageUrl(baseUrl, galeri.coverGaleri)
                }))
            };
            
            return ResponseFactory.getAll(transformedData.data, transformedData.meta).send(res);
        } catch (error) {
      next(error)
        }
    };

    update = async (req, res, next) => {
        try {
            const { id } = req.extract.getParams(['id']);
            const data = req.extract.getBody();

            // Handle coverGaleri file upload
            if (req.file && req.file.fieldname === 'coverGaleri') {
                data.coverGaleri = req.file.filename; // Use filename instead of path
            }

            const baseUrl = process.env.BACKEND_URL || `${req.protocol}://${req.get('host')}`;
            const result = await galeriService.update(id, data);
            const transformedResult = FileUtils.transformGaleriFiles(result, baseUrl);

            const responseData = {
                galeriId: transformedResult.id,
                judulFoto: transformedResult.judulFoto,
                coverGaleri: transformedResult.coverGaleri
            };
            return ResponseFactory.updated(responseData).send(res);
        } catch (error) {
            next(error)
        }
    };

    delete = async (req, res, next) => {
        try {
            const { id } = req.extract.getParams(['id']);
            await galeriService.delete(id);
            return ResponseFactory.deleted().send(res);
        } catch (error) {
            next(error)
        }
    };
}

module.exports = new GaleriController(); 