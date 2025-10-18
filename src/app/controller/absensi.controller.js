const absensiService = require('../service/absensi.service');
const ResponseFactory = require('../../lib/factories/response.factory');
const ErrorFactory = require('../../lib/factories/error.factory');
const prisma = require('../../lib/config/prisma.config');
const FileUtils = require('../../lib/utils/file.utils');
const logger = require('../../lib/config/logger.config');

class AbsensiController {
    getAbsensiSiswaForAdmin = async (req, res, next) => {
        try {
            const { kelasId } = req.extract.getParams(['kelasId']);
            const { tanggal } = req.extract.getQuery(['tanggal']);
            const result = await absensiService.getAbsensiSiswaForAdmin({
                filters: { kelasId, tanggal }
            });
            return ResponseFactory.get(result).send(res);
        } catch (error) {
            logger.error(error);
            next(error)
        }
    };

    getAbsensiGuruByDate = async (req, res, next) => {
        try {
            const filters = req.extract.getQuery(['tanggal', 'page', 'limit']);
            const result = await absensiService.getAbsensiGuruByDate({
                filters
            });
            return ResponseFactory.getAll(result.data, result.meta).send(res);
        } catch (error) {
            logger.error(error);
            next(error)
        }
    };

    updateAbsensiGuru = async (req, res, next) => {
        try {
            const { id } = req.extract.getParams(['id']);
            const data = req.extract.getBody();
            if (req.file) {
                data.suratIzin = req.file.filename;
            }

            const result = await absensiService.updateAbsensiGuru({
                data,
                where: { id }
            });

            if (result.suratIzin) {
                result.suratIzin = FileUtils.getSuratIzinUrl(result.suratIzin);
            }

            return ResponseFactory.updated(result).send(res);

        } catch (error) {
            logger.error(error);
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

            const result = await absensiService.updateAbsensiSiswa({
                data: {
                    kelasProgramId,
                    siswaId,
                    guruId: guru.id,
                    statusKehadiran
                }
            });
            return ResponseFactory.updated(result).send(res);
        } catch (error) {
            logger.error(error);
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

            const result = await absensiService.getAbsensiSiswaByKelasProgram({
                data: {
                    kelasProgramId,
                    guruId: guru.id
                },
                filters: {
                    tanggal
                }
            });
            return ResponseFactory.get(result).send(res);
        } catch (error) {
            logger.error(error);
            next(error);
        }
    };

    createAbsensiSiswa = async (req, res, next) => {
        try {
            const { kelasProgramId, tanggal } = req.extract.getBody(['kelasProgramId', 'tanggal']);

            const result = await absensiService.createAbsensiSiswa({
                data: {
                    kelasProgramId,
                    tanggal
                }
            });
            return ResponseFactory.created(result).send(res);
        } catch (error) {
            logger.error(error);
            next(error)
        }
    };

    updateAbsensiGuruWithRfid = async (req, res, next) => {
        try {
            const { rfid, tanggal, jam } = req.extract.getBody(['rfid', 'tanggal', 'jam']);

            const result = await absensiService.updateAbsensiGuruWithRfid({
                data: {
                    rfid,
                    tanggal,
                    jam
                }
            });

            return ResponseFactory.get(result).send(res);
        } catch (error) {
            logger.error(error);
            next(error)
        }
    };

    getAbsensiGuruTodayPublic = async (req, res, next) => {
        try {
            const result = await absensiService.getAbsensiGuruTodayPublic();
            return ResponseFactory.get(result).send(res);
        } catch (error) {
            logger.error(error);
            next(error)
        }
    };


}

module.exports = new AbsensiController();