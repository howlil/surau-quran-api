const sppService = require('../service/spp.service');
const Http = require('../../lib/http');
const ErrorHandler = require('../../lib/http/error.handler.htttp');

class SppController {
    getSppForAdmin = ErrorHandler.asyncHandler(async (req, res) => {
        const { status, bulan, namaSiswa, page, limit } = req.query;

        const filters = {
            status,
            bulan,
            namaSiswa,
            page,
            limit
        };

        const result = await sppService.getSppForAdmin(filters);

        return Http.Response.success(res, result, 'Data SPP berhasil diambil');
    });

    getSppForSiswa = ErrorHandler.asyncHandler(async (req, res) => {
        const {page, limit } = req.query;
        const userId = req.user.id;

        const filters = {
            page,
            limit
        };

        const result = await sppService.getSppForSiswa(userId, filters);

        return Http.Response.success(res, result, 'Data SPP siswa berhasil diambil');
    });
}

module.exports = new SppController();
