const kelasProgramService = require('../service/kelas-program.service');
const Http = require('../../lib/http');
const HttpRequest = require('../../lib/http/request.http');
const ErrorHandler = require('../../lib/http/error.handler.htttp');

class KelasProgramController {
    // Admin: Get all kelas programs by kelasId with filtering options
    getByKelasId = ErrorHandler.asyncHandler(async (req, res) => {
        const { kelasId } = HttpRequest.getUrlParams(req);
        const filters = HttpRequest.getQueryParams(req, ['page', 'limit', 'hari', 'programId']);
        const result = await kelasProgramService.getByKelasId(kelasId, filters);
        return Http.Response.success(res, result, 'Data kelas program berhasil diambil');
    });

    // Admin: Get detailed kelas program by ID including enrolled students
    getDetailById = ErrorHandler.asyncHandler(async (req, res) => {
        const { id } = HttpRequest.getUrlParams(req);
        const result = await kelasProgramService.getDetailById(id);
        return Http.Response.success(res, result, 'Detail kelas program berhasil diambil');
    });

    // Admin: Update kelas program details and enrolled students
    updateKelasProgramDetail = ErrorHandler.asyncHandler(async (req, res) => {
        const { id } = HttpRequest.getUrlParams(req);
        const data = HttpRequest.getBodyParams(req);
        const result = await kelasProgramService.updateKelasProgramDetail(id, data);
        return Http.Response.success(res, result, 'Detail kelas program berhasil diperbarui');
    });
}

module.exports = new KelasProgramController();
