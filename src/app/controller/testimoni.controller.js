const testimoniService = require('../service/testimoni.service');
const Http = require('../../lib/http');
const HttpRequest = require('../../lib/http/request.http');
const ErrorHandler = require('../../lib/http/error.handler.htttp');
const FileUtils = require('../../lib/utils/file.utils');

class TestimoniController {
    create = ErrorHandler.asyncHandler(async (req, res) => {
        const data = HttpRequest.getBodyParams(req);

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
        return Http.Response.created(res, responseData, 'Testimoni berhasil dibuat');
    });

    getAll = ErrorHandler.asyncHandler(async (req, res) => {
        const filters = HttpRequest.getQueryParams(req, ['page', 'limit', 'nama']);
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
        
        return Http.Response.success(res, transformedData, 'Data testimoni berhasil diambil');
    });


    update = ErrorHandler.asyncHandler(async (req, res) => {
        const { id } = HttpRequest.getUrlParams(req);
        const data = HttpRequest.getBodyParams(req);

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
        return Http.Response.success(res, responseData, 'Testimoni berhasil diperbarui');
    });

    delete = ErrorHandler.asyncHandler(async (req, res) => {
        const { id } = HttpRequest.getUrlParams(req);
        await testimoniService.delete(id);
        return Http.Response.success(res, null, 'Testimoni berhasil dihapus');
    });
}

module.exports = new TestimoniController(); 