const kelasService = require('../service/kelas.service');
const Http = require('../../lib/http');
const HttpRequest = require('../../lib/http/request.http');
const ErrorHandler = require('../../lib/http/error.handler.htttp');

class KelasController {
    create = ErrorHandler.asyncHandler(async (req, res) => {
        const data = HttpRequest.getBodyParams(req);
        const result = await kelasService.create(data);
        return Http.Response.created(res, result, 'Kelas berhasil dibuat');
    });

    update = ErrorHandler.asyncHandler(async (req, res) => {
        const { id } = HttpRequest.getUrlParams(req);
        const data = HttpRequest.getBodyParams(req);
        const result = await kelasService.update(id, data);
        return Http.Response.success(res, result, 'Kelas berhasil diperbarui');
    });

    delete = ErrorHandler.asyncHandler(async (req, res) => {
        const { id } = HttpRequest.getUrlParams(req);
        await kelasService.delete(id);
        return Http.Response.success(res, { id }, 'Kelas berhasil dihapus');
    });

 

    getAll = ErrorHandler.asyncHandler(async (req, res) => {
        const filters = HttpRequest.getQueryParams(req, ['page', 'limit', 'namaKelas']);
        const result = await kelasService.getAll(filters);
        return Http.Response.success(res, result);
    });
}

module.exports = new KelasController();