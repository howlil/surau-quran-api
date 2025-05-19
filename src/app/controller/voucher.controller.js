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

  getById = ErrorHandler.asyncHandler(async (req, res) => {
    const { id } = HttpRequest.getUrlParams(req);
    const result = await voucherService.getById(id);
    return Http.Response.success(res, result);
  });

  getAll = ErrorHandler.asyncHandler(async (req, res) => {
    const filters = HttpRequest.getQueryParams(req, [
      'page', 'limit', 'kodeVoucher', 'tipe', 'isActive'
    ]);
    const result = await voucherService.getAll(filters);
    return Http.Response.success(res, result);
  });

  getByCode = ErrorHandler.asyncHandler(async (req, res) => {
    const { kodeVoucher } = HttpRequest.getUrlParams(req);
    const result = await voucherService.getByCode(kodeVoucher);
    return Http.Response.success(res, result);
  });

  toggleStatus = ErrorHandler.asyncHandler(async (req, res) => {
    const { id } = HttpRequest.getUrlParams(req);
    const result = await voucherService.toggleStatus(id);
    return Http.Response.success(res, result, 'Status voucher berhasil diubah');
  });

  getUsageReport = ErrorHandler.asyncHandler(async (req, res) => {
    const { id } = HttpRequest.getUrlParams(req);
    const result = await voucherService.getUsageReport(id);
    return Http.Response.success(res, result);
  });
}

module.exports = new VoucherController();