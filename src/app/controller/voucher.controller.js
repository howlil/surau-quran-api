const voucherService = require('../service/voucher.service');
const Http = require('../../lib/http');
const HttpRequest = require('../../lib/http/request.http');
const ErrorHandler = require('../../lib/http/error.handler.htttp');

class VoucherController {
  create = ErrorHandler.asyncHandler(async (req, res) => {
    const data = HttpRequest.getBodyParams(req);
    const result = await voucherService.create(data);
    return Http.Response.created(res, result, 'Voucher berhasil dibuat');
  });

  update = ErrorHandler.asyncHandler(async (req, res) => {
    const { id } = HttpRequest.getUrlParams(req);
    const data = HttpRequest.getBodyParams(req);
    const result = await voucherService.update(id, data);
    return Http.Response.success(res, result, 'Voucher berhasil diperbarui');
  });

  delete = ErrorHandler.asyncHandler(async (req, res) => {
    const { id } = HttpRequest.getUrlParams(req);
    await voucherService.delete(id);
    return Http.Response.success(res, { id }, 'Voucher berhasil dihapus');
  });


  getAll = ErrorHandler.asyncHandler(async (req, res) => {
    const filters = HttpRequest.getQueryParams(req, ['page', 'limit', 'nama']);
    const result = await voucherService.getAll(filters);
    return Http.Response.success(res, result);
  });

}
module.exports = new VoucherController();