const jamMengajarService = require('../service/jam-mengajar.service');
const Http = require('../../lib/http');
const HttpRequest = require('../../lib/http/request.http');
const ErrorHandler = require('../../lib/http/error.handler.htttp');

class JamMengajarController {
    create = ErrorHandler.asyncHandler(async (req, res) => {
        const data = HttpRequest.getBodyParams(req);
        const result = await jamMengajarService.create(data);
        return Http.Response.created(res, result, 'Jam mengajar berhasil dibuat');
    });

    update = ErrorHandler.asyncHandler(async (req, res) => {
        const { id } = HttpRequest.getUrlParams(req);
        const data = HttpRequest.getBodyParams(req);
        const result = await jamMengajarService.update(id, data);
        return Http.Response.success(res, result, 'Jam mengajar berhasil diperbarui');
    });

    delete = ErrorHandler.asyncHandler(async (req, res) => {
        const { id } = HttpRequest.getUrlParams(req);
        await jamMengajarService.delete(id);
        return Http.Response.success(res, { id }, 'Jam mengajar berhasil dihapus');
    });

    getById = ErrorHandler.asyncHandler(async (req, res) => {
        const { id } = HttpRequest.getUrlParams(req);
        const result = await jamMengajarService.getById(id);
        return Http.Response.success(res, result);
    });

    getAll = ErrorHandler.asyncHandler(async (req, res) => {
        const filters = HttpRequest.getQueryParams(req, ['page', 'limit', 'jamMulai', 'jamSelesai']);
        const result = await jamMengajarService.getAll(filters);
        return Http.Response.success(res, result);
    });
}

module.exports = new JamMengajarController();