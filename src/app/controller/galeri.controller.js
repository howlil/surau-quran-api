const galeriService = require('../service/galeri.service');
const Http = require('../../lib/http');
const HttpRequest = require('../../lib/http/request.http');
const ErrorHandler = require('../../lib/http/error.handler.htttp');
const FileUtils = require('../../lib/utils/file.utils');

class GaleriController {
    create = ErrorHandler.asyncHandler(async (req, res) => {
        const data = HttpRequest.getBodyParams(req);

        // Handle coverGaleri file upload
        if (req.file && req.file.fieldname === 'coverGaleri') {
            data.coverGaleri = req.file.path;
        }

        const baseUrl = process.env.BACKEND_URL || `${req.protocol}://${req.get('host')}`;
        const result = await galeriService.create(data);
        const transformedResult = FileUtils.transformGaleriFiles(result, baseUrl);

        const responseData = {
            galeriId: transformedResult.id,
            judulFoto: transformedResult.judulFoto,
            coverGaleri: transformedResult.coverGaleri
        };
        return Http.Response.created(res, responseData, 'Galeri berhasil dibuat');
    });

    getAll = ErrorHandler.asyncHandler(async (req, res) => {
        const baseUrl = process.env.BACKEND_URL || `${req.protocol}://${req.get('host')}`;
        const result = await galeriService.getAll();
        const transformedResult = FileUtils.transformGaleriListFiles(result, baseUrl);
        const mappedResult = transformedResult.map(galeri => ({
            galeriId: galeri.id,
            judulFoto: galeri.judulFoto,
            coverGaleri: galeri.coverGaleri
        }));
        return Http.Response.success(res, mappedResult, 'Data galeri berhasil diambil');
    });



    update = ErrorHandler.asyncHandler(async (req, res) => {
        const { id } = HttpRequest.getUrlParams(req);
        const data = HttpRequest.getBodyParams(req);

        // Handle coverGaleri file upload
        if (req.file && req.file.fieldname === 'coverGaleri') {
            data.coverGaleri = req.file.path;
        }

        const baseUrl = process.env.BACKEND_URL || `${req.protocol}://${req.get('host')}`;
        const result = await galeriService.update(id, data);
        const transformedResult = FileUtils.transformGaleriFiles(result, baseUrl);

        const responseData = {
            galeriId: transformedResult.id,
            judulFoto: transformedResult.judulFoto,
            coverGaleri: transformedResult.coverGaleri
        };
        return Http.Response.success(res, responseData, 'Galeri berhasil diperbarui');
    });

    delete = ErrorHandler.asyncHandler(async (req, res) => {
        const { id } = HttpRequest.getUrlParams(req);
        await galeriService.delete(id);
        return Http.Response.success(res, null, 'Galeri berhasil dihapus');
    });
}

module.exports = new GaleriController(); 