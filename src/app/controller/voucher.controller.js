const voucherService = require('../service/voucher.service');
const ResponseFactory = require('../../lib/factories/response.factory');
const logger = require('../../lib/config/logger.config');

class VoucherController {
  create = async (req, res, next) => {
    try {
      const data = req.extract.getBody();
      const result = await voucherService.create({ data });
      return ResponseFactory.created(result).send(res);
    } catch (error) {
      logger.error(error);
      next(error)
    }
  };

  update = async (req, res, next) => {
    try {
      const { id } = req.extract.getParams(['id']);
      const data = req.extract.getBody();
      const result = await voucherService.update({ data, where: { id } });
      return ResponseFactory.updated(result).send(res);
    } catch (error) {
      logger.error(error);
      next(error)
    }
  };

  delete = async (req, res, next) => {
    try {
      const { id } = req.extract.getParams(['id']);
      await voucherService.delete({ where: { id } });
      return ResponseFactory.deleted().send(res);
    } catch (error) {
      logger.error(error);
      next(error)
    }
  };


  getAll = async (req, res, next) => {
    try {
      const filters = req.extract.getQuery(['page', 'limit', 'nama']);
      const result = await voucherService.getAll({ filters });
      return ResponseFactory.getAll(result.data, result.meta).send(res);
    } catch (error) {
      logger.error(error);
      next(error)
    }
  };

  getVoucherByKode = async (req, res, next) => {
    try {
      const { kodeVoucher } = req.extract.getParams(['kodeVoucher']);
      const result = await voucherService.getVoucherByKode({ data: { kodeVoucher } });
      return ResponseFactory.get(result).send(res);
    } catch (error) {
      logger.error(error);
      next(error)
    }
  };

}
module.exports = new VoucherController();