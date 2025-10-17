const absensiService = require('../service/absensi.service');
const ResponseFactory = require('../../lib/factories/response.factory');
const ErrorFactory = require('../../lib/factories/error.factory');
const { prisma } = require('../../lib/config/prisma.config');
const FileUtils = require('../../lib/utils/file.utils');

class AbsensiController {
    getAbsensiSiswaForAdmin = async (req, res, next) => {
        try {
            const { kelasId } = req.extract.getParams(['kelasId']);
            const { tanggal } = req.extract.getQuery(['tanggal']);
            const result = await absensiService.getAbsensiSiswaForAdmin({ kelasId, tanggal });
            return ResponseFactory.get(result).send(res);
        } catch (error) {
      next(error)
        }
    };

    getAbsensiGuruByDate = async (req, res, next) => {
        try {
            const filters = req.extract.getQuery(['tanggal', 'page', 'limit']);
            const baseUrl = process.env.BACKEND_URL || 'http://localhost:3000';
            const result = await absensiService.getAbsensiGuruByDate(filters, baseUrl);
            return ResponseFactory.getAll(result.data, result.meta).send(res);
        } catch (error) {
      next(error)
        }
    };

    updateAbsensiGuru = async (req, res, next) => {
        try {
            const { id } = req.extract.getParams(['id']);
            const data = req.extract.getBody();
            const baseUrl = process.env.BACKEND_URL || `${req.protocol}://${req.get('host')}`;

            if (req.file) {
                data.suratIzin = req.file.filename;
            }

            const result = await absensiService.updateAbsensiGuru(id, data);

            if (result.suratIzin) {
                result.suratIzin = FileUtils.getSuratIzinUrl(baseUrl, result.suratIzin);
            }

            return ResponseFactory.updated(result).send(res);
        } catch (error) {
            next(error)
        }
    };

    updateAbsensiSiswa = async (req, res, next) => {
        try {
            const { kelasProgramId } = req.extract.getParams(['kelasProgramId']);
            const { siswaId, statusKehadiran } = req.extract.getBody(['siswaId', 'statusKehadiran']);
            const userId = req.user.id;

            const guru = await prisma.guru.findUnique({
                where: { userId }
            });
            if (!guru) {
                throw ErrorFactory.notFound('Profil guru tidak ditemukan');
            }

            const result = await absensiService.updateAbsensiSiswa(kelasProgramId, siswaId, guru.id, statusKehadiran);
            return ResponseFactory.updated(result).send(res);
        } catch (error) {
            next(error);
        }
    };

    getAbsensiSiswaByKelasProgram = async (req, res, next) => {
        try {
            const { kelasProgramId } = req.extract.getParams(['kelasProgramId']);
            const { tanggal } = req.extract.getQuery(['tanggal']);
            const userId = req.user.id;

            // Get guru profile
            const guru = await prisma.guru.findUnique({
                where: { userId }
            });

            if (!guru) {
                throw ErrorFactory.notFound('Profil guru tidak ditemukan');
            }

            const result = await absensiService.getAbsensiSiswaByKelasProgram(kelasProgramId, guru.id, tanggal);
            return ResponseFactory.get(result).send(res);
        } catch (error) {
            next(error);
        }
    };

    createAbsensiSiswa = async (req, res, next) => {
        try {
            const { kelasProgramId, tanggal } = req.extract.getBody(['kelasProgramId', 'tanggal']);
            
            const result = await absensiService.createAbsensiSiswa(kelasProgramId, tanggal);
            return ResponseFactory.created({ message: 'Absensi siswa berhasil dibuat' }).send(res);
        } catch (error) {
            next(error)
        }
    };

    // Update absensi guru dengan RFID (tanpa autentikasi)
    updateAbsensiGuruWithRfid = async (req, res, next) => {
        try {
            const { rfid, tanggal, jam } = req.extract.getBody(['rfid', 'tanggal', 'jam']);

            const result = await absensiService.updateAbsensiGuruWithRfid(rfid, tanggal, jam);

            const message = result.isUpdate 
                ? 'Absensi guru berhasil diperbarui dengan RFID' 
                : 'Absensi guru berhasil dibuat dengan RFID';

            return ResponseFactory.get({ ...result, message }).send(res);
        } catch (error) {
            next(error)
        }
    };

    // Public endpoint untuk mendapatkan absensi guru hari ini (tanpa autentikasi)
    getAbsensiGuruTodayPublic = async (req, res, next) => {
        try {
            const baseUrl = process.env.BACKEND_URL || `${req.protocol}://${req.get('host')}`;
            const result = await absensiService.getAbsensiGuruTodayPublic(baseUrl);
            return ResponseFactory.get(result).send(res);
        } catch (error) {
      next(error)
        }
    };


}

module.exports = new AbsensiController();