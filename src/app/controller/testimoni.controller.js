const testimoniService = require('../service/testimoni.service');
const ResponseFactory = require('../../lib/factories/response.factory');
const ErrorFactory = require('../../lib/factories/error.factory');
const FileUtils = require('../../lib/utils/file.utils');

class TestimoniController {
    create = async (req, res, next) => {
        try {
            const data = req.extract.getBody();

            if (req.file && req.file.fieldname === 'fotoUrl') {
                data.fotoUrl = req.file.filename;
            }

            const baseUrl = process.env.BACKEND_URL || `${req.protocol}://${req.get('host')}`;
            const result = await testimoniService.create(data);
            const transformedResult = FileUtils.transformTestimoniFiles(result, baseUrl);

            const responseData = {
                testimoniId: transformedResult.id,
                nama: transformedResult.nama,
                posisi: transformedResult.posisi,
                isi: transformedResult.isi,
                fotoUrl: transformedResult.fotoUrl
            };
            return ResponseFactory.created(responseData).send(res);
        } catch (error) {
            next(error)
        }
    };

    getAll = async (req, res, next) => {
        try {
            const filters = req.extract.getQuery(['page', 'limit', 'nama']);
            const baseUrl = process.env.BACKEND_URL || `${req.protocol}://${req.get('host')}`;
            const result = await testimoniService.getAll(filters);
            
            const transformedData = {
                ...result,
                data: result.data.map(testimoni => ({
                    testimoniId: testimoni.id,
                    nama: testimoni.nama,
                    posisi: testimoni.posisi,
                    isi: testimoni.isi,
                    fotoUrl: FileUtils.getImageUrl(baseUrl, testimoni.fotoUrl)
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

            // Handle fotoUrl file upload - only update if new file uploaded
            if (req.file && req.file.fieldname === 'fotoUrl') {
                // Use the filename instead of full path for consistency
                data.fotoUrl = req.file.filename;
            } else {
                // Remove fotoUrl from data if no file uploaded to prevent object being saved
                delete data.fotoUrl;
            }

            const baseUrl = process.env.BACKEND_URL || `${req.protocol}://${req.get('host')}`;
            const result = await testimoniService.update(id, data);
            const transformedResult = FileUtils.transformTestimoniFiles(result, baseUrl);

            const responseData = {
                testimoniId: transformedResult.id,
                nama: transformedResult.nama,
                posisi: transformedResult.posisi,
                isi: transformedResult.isi,
                fotoUrl: transformedResult.fotoUrl
            };
            return ResponseFactory.updated(responseData).send(res);
        } catch (error) {
            next(error)
        }
    };

    delete = async (req, res, next) => {
        try {
            const { id } = req.extract.getParams(['id']);
            await testimoniService.delete(id);
            return ResponseFactory.deleted().send(res);
        } catch (error) {
            next(error)
        }
    };
}

module.exports = new TestimoniController(); 