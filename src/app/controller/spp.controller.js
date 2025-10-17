const sppService = require('../service/spp.service');
const ResponseFactory = require('../../lib/factories/response.factory');

class SppController {
    getSppForAdmin = async (req, res, next) => {
        try {
            const { status, bulan, namaSiswa, page, limit } = req.extract.getQuery(['status', 'bulan', 'namaSiswa', 'page', 'limit']);

            const filters = {
                status,
                bulan,
                namaSiswa,
                page,
                limit
            };

            const result = await sppService.getSppForAdmin(filters);

            return ResponseFactory.getAll(result.data, result.meta).send(res);
        } catch (error) {
      next(error)
        }
    };

    getSppForSiswa = async (req, res, next) => {
        try {
            const {page, limit } = req.extract.getQuery(['page', 'limit']);
            const userId = req.user.id;

            const filters = {
                page,
                limit
            };

            const result = await sppService.getSppForSiswa(userId, filters);

            return ResponseFactory.getAll(result.data, result.meta).send(res);
        } catch (error) {
      next(error)
        }
    };

    getSppInvoice = async (req, res, next) => {
        try {
            const { pembayaranId } = req.extract.getParams(['pembayaranId']);
            const result = await sppService.getSppInvoice(pembayaranId);

            return ResponseFactory.get(result).send(res);
        } catch (error) {
            next(error)
        }
    };
    
}

module.exports = new SppController();
