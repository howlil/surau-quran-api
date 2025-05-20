const absensiService = require('../service/absensi.service');
const Http = require('../../lib/http');
const HttpRequest = require('../../lib/http/request.http');
const ErrorHandler = require('../../lib/http/error.handler.htttp');

class AbsensiController {
    // Admin: Get student attendance with date filter
    getAbsensiSiswaForAdmin = ErrorHandler.asyncHandler(async (req, res) => {
        const filters = HttpRequest.getQueryParams(req, [
            'tanggal', 'page', 'limit'
        ]);
        const result = await absensiService.getAbsensiSiswaForAdmin(filters);
        return Http.Response.success(res, result, 'Data absensi siswa berhasil diambil');
    });

    // Admin: Get teacher attendance with date filter
    getAbsensiGuruForAdmin = ErrorHandler.asyncHandler(async (req, res) => {
        const filters = HttpRequest.getQueryParams(req, [
            'tanggal', 'page', 'limit'
        ]);
        const result = await absensiService.getAbsensiGuruForAdmin(filters);
        return Http.Response.success(res, result, 'Data absensi guru berhasil diambil');
    });

    // Admin: Update teacher attendance
    updateAbsensiGuru = ErrorHandler.asyncHandler(async (req, res) => {
        const { id } = HttpRequest.getUrlParams(req);
        const data = HttpRequest.getBodyParams(req);
        const result = await absensiService.updateAbsensiGuru(id, data);
        return Http.Response.success(res, result, 'Absensi guru berhasil diperbarui');
    });

    // Student: Get attendance counts (absent, sick leave, permission)
    getAbsensiCountForSiswa = ErrorHandler.asyncHandler(async (req, res) => {
        const { id: siswaId } = req.user;
        const result = await absensiService.getAbsensiCountForSiswa(siswaId);
        return Http.Response.success(res, result, 'Data jumlah absensi berhasil diambil');
    });

    // Student: Get attendance details with monthly filter
    getAbsensiDetailForSiswa = ErrorHandler.asyncHandler(async (req, res) => {
        const { id: siswaId } = req.user;
        const filters = HttpRequest.getQueryParams(req, [
            'bulan', 'page', 'limit'
        ]);
        const result = await absensiService.getAbsensiDetailForSiswa(siswaId, filters);
        return Http.Response.success(res, result, 'Data detail absensi berhasil diambil');
    });

    // Teacher: Mark student attendance
    markAbsensiSiswa = ErrorHandler.asyncHandler(async (req, res) => {
        const guruId = req.user.guru.id;
        const data = HttpRequest.getBodyParams(req);
        const result = await absensiService.markAbsensiSiswa(guruId, data);
        return Http.Response.success(res, result, 'Absensi siswa berhasil diisi');
    });
}

module.exports = new AbsensiController();    