const absensiService = require('../service/absensi.service');
const Http = require('../../lib/http');
const HttpRequest = require('../../lib/http/request.http');
const ErrorHandler = require('../../lib/http/error.handler.htttp');
const FileUtils = require('../../lib/utils/file.utils');
const { NotFoundError } = require('../../lib/http/error.handler.htttp');
const { prisma } = require('../../lib/config/prisma.config');


class AbsensiController {
    getAbsensiSiswaForAdmin = ErrorHandler.asyncHandler(async (req, res) => {
        const filters = HttpRequest.getQueryParams(req, ['tanggal']);
        const result = await absensiService.getAbsensiSiswaForAdmin(filters);
        return Http.Response.success(res, result);
    });

    getAbsensiSiswaForGuru = ErrorHandler.asyncHandler(async (req, res) => {
        const userId = req.user.id;
        const filters = HttpRequest.getQueryParams(req, ['tanggal']);

        const guru = await prisma.guru.findUnique({
            where: { userId }
        });

        if (!guru) {
            throw new NotFoundError('Profil guru tidak ditemukan');
        }

        const result = await absensiService.getAbsensiSiswaForGuru(guru.id, filters);
        return Http.Response.success(res, result);
    });

    getAbsensiGuruByDate = ErrorHandler.asyncHandler(async (req, res) => {
        const filters = HttpRequest.getQueryParams(req, ['tanggal']);
        const result = await absensiService.getAbsensiGuruByDate(filters);
        const baseUrl = process.env.BACKEND_URL || `${req.protocol}://${req.get('host')}`;
        const transformedResult = FileUtils.transformAbsensiGuruListFiles(result, baseUrl);
        return Http.Response.success(res, transformedResult, 'Data absensi guru berhasil diambil');
    });

    updateAbsensiGuru = ErrorHandler.asyncHandler(async (req, res) => {
        const { id } = HttpRequest.getUrlParams(req);
        const data = HttpRequest.getBodyParams(req);
        const baseUrl = process.env.BACKEND_URL || `${req.protocol}://${req.get('host')}`;

        if (req.file) {
            data.suratIzin = req.file.filename;
        }

        const result = await absensiService.updateAbsensiGuru(id, data);
        const transformedResult = FileUtils.transformAbsensiGuruFiles(result, baseUrl);
        return Http.Response.success(res, 'Data absensi guru berhasil diperbarui');
    });

    updateAbsensiSiswa = ErrorHandler.asyncHandler(async (req, res) => {
        const { siswaId } = req.params;
        const userId = req.user.id;

        const guru = await prisma.guru.findUnique({
            where: { userId }
        });
        if (!guru) {
            throw new NotFoundError('Profil guru tidak ditemukan');
        }

        const result = await absensiService.updateAbsensiSiswa(siswaId, guru.id, { value: req.body });
        return Http.Response.success(res, 'Berhasil mengupdate absensi siswa');
    });
}

module.exports = new AbsensiController();