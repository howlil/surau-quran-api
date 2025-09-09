const absensiService = require('../service/absensi.service');
const Http = require('../../lib/http');
const HttpRequest = require('../../lib/http/request.http');
const ErrorHandler = require('../../lib/http/error.handler.htttp');
const { NotFoundError } = require('../../lib/http/error.handler.htttp');
const { prisma } = require('../../lib/config/prisma.config');
const FileUtils = require('../../lib/utils/file.utils');

class AbsensiController {
    getAbsensiSiswaForAdmin = ErrorHandler.asyncHandler(async (req, res) => {
        const { kelasId } = HttpRequest.getUrlParams(req);
        const { tanggal } = HttpRequest.getQueryParams(req, ['tanggal']);
        const result = await absensiService.getAbsensiSiswaForAdmin({ kelasId, tanggal });
        return Http.Response.success(res, result);
    });

    getAbsensiGuruByDate = ErrorHandler.asyncHandler(async (req, res) => {
        const filters = HttpRequest.getQueryParams(req, ['tanggal', 'page', 'limit']);
        const baseUrl = process.env.BACKEND_URL || 'http://localhost:3000';
        const result = await absensiService.getAbsensiGuruByDate(filters, baseUrl);
        return Http.Response.success(res, result, 'Data absensi guru berhasil diambil');
    });

    updateAbsensiGuru = ErrorHandler.asyncHandler(async (req, res) => {
        const { id } = HttpRequest.getUrlParams(req);
        const data = HttpRequest.getBodyParams(req);
        const baseUrl = process.env.BACKEND_URL || `${req.protocol}://${req.get('host')}`;

        if (req.file) {
            data.suratIzin = req.file.filename;
        }

        const result = await absensiService.updateAbsensiGuru(id, data);

        if (result.suratIzin) {
            result.suratIzin = FileUtils.getSuratIzinUrl(baseUrl, result.suratIzin);
        }

        return Http.Response.success(res, result, 'Data absensi guru berhasil diperbarui');
    });

    updateAbsensiSiswa = ErrorHandler.asyncHandler(async (req, res) => {
        const { kelasProgramId } = req.params;
        const { siswaId, statusKehadiran } = req.body;
        const userId = req.user.id;

        const guru = await prisma.guru.findUnique({
            where: { userId }
        });
        if (!guru) {
            throw new NotFoundError('Profil guru tidak ditemukan');
        }

        const result = await absensiService.updateAbsensiSiswa(kelasProgramId, siswaId, guru.id, statusKehadiran);
        return Http.Response.success(res, result, 'Berhasil mengupdate absensi siswa');
    });

    getAbsensiSiswaByKelasProgram = ErrorHandler.asyncHandler(async (req, res) => {
        const { kelasProgramId } = HttpRequest.getUrlParams(req);
        const { tanggal } = HttpRequest.getQueryParams(req, ['tanggal']);
        const userId = req.user.id;

        // Get guru profile
        const guru = await prisma.guru.findUnique({
            where: { userId }
        });

        if (!guru) {
            throw new NotFoundError('Profil guru tidak ditemukan');
        }

        const result = await absensiService.getAbsensiSiswaByKelasProgram(kelasProgramId, guru.id, tanggal);
        return Http.Response.success(res, result, 'Data absensi siswa berhasil diambil');
    });

    createAbsensiSiswa = ErrorHandler.asyncHandler(async (req, res) => {
        const { kelasProgramId, tanggal } = HttpRequest.getBodyParams(req);
        
        const result = await absensiService.createAbsensiSiswa(kelasProgramId, tanggal);
        return Http.Response.success(res,  'Absensi siswa berhasil dibuat');
    });

    // Update absensi guru dengan RFID (tanpa autentikasi)
    updateAbsensiGuruWithRfid = ErrorHandler.asyncHandler(async (req, res) => {
        const { rfid, tanggal, jam } = req.body;

        const result = await absensiService.updateAbsensiGuruWithRfid(rfid, tanggal, jam);

        const message = result.isUpdate 
            ? 'Absensi guru berhasil diperbarui dengan RFID' 
            : 'Absensi guru berhasil dibuat dengan RFID';

        return Http.Response.success(res, result, message);
    });

    // Public endpoint untuk mendapatkan absensi guru hari ini (tanpa autentikasi)
    getAbsensiGuruTodayPublic = ErrorHandler.asyncHandler(async (req, res) => {
        const baseUrl = process.env.BACKEND_URL || `${req.protocol}://${req.get('host')}`;
        const result = await absensiService.getAbsensiGuruTodayPublic(baseUrl);
        return Http.Response.success(res, result, 'Data absensi guru hari ini berhasil diambil');
    });


}

module.exports = new AbsensiController();