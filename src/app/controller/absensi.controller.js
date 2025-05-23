const absensiService = require('../service/absensi.service');
const Http = require('../../lib/http');
const HttpRequest = require('../../lib/http/request.http');
const ErrorHandler = require('../../lib/http/error.handler.htttp');

class AbsensiController {
    // Admin: Get student attendance with date filter
    getAbsensiSiswaForAdmin = ErrorHandler.asyncHandler(async (req, res) => {

        const filters = req.validatedQuery || HttpRequest.getQueryParams(req, [
            'tanggal', 'page', 'limit'
        ]);

        const result = await absensiService.getAbsensiSiswaForAdmin(filters);
        return Http.Response.success(res, result, 'Data absensi siswa berhasil diambil');
    });

    // Admin: Get teacher attendance grouped by date
    getAbsensiGuruByDate = ErrorHandler.asyncHandler(async (req, res) => {
        const filters = HttpRequest.getQueryParams(req, ['tanggal']);
        const result = await absensiService.getAbsensiGuruByDate(filters);
        return Http.Response.success(res, result, 'Data absensi guru berhasil diambil');
    });

    // Admin: Update teacher attendance
    // TODO : PAKAI MULTER UNTUK UPLOAD FILE
    updateAbsensiGuru = ErrorHandler.asyncHandler(async (req, res) => {
        const { id } = HttpRequest.getUrlParams(req);
        const data = HttpRequest.getBodyParams(req);
        await absensiService.updateAbsensiGuru(id, data);
        return Http.Response.success(res, 'Data absensi guru berhasil diperbarui');
    });
}

module.exports = new AbsensiController();    