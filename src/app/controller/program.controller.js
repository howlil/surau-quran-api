
const programService = require('../service/program.service');
const Http = require('../../lib/http');
const HttpRequest = require('../../lib/http/request.http');
const ErrorHandler = require('../../lib/http/error.handler.htttp');

class ProgramController {
  create = ErrorHandler.asyncHandler(async (req, res) => {
    const data = HttpRequest.getBodyParams(req);
    const result = await programService.create(data);
    return Http.Response.created(res, result, 'Program berhasil dibuat');
  });

  update = ErrorHandler.asyncHandler(async (req, res) => {
    const { id } = HttpRequest.getUrlParams(req);
    const data = HttpRequest.getBodyParams(req);
    const result = await programService.update(id, data);
    return Http.Response.success(res, result, 'Program berhasil diperbarui');
  });

  delete = ErrorHandler.asyncHandler(async (req, res) => {
    const { id } = HttpRequest.getUrlParams(req);
    await programService.delete(id);
    return Http.Response.success(res, { id }, 'Program berhasil dihapus');
  });

  getAll = ErrorHandler.asyncHandler(async (req, res) => {
    const filters = HttpRequest.getQueryParams(req, ['page', 'limit', 'namaProgram']);
    const result = await programService.getAll(filters);
    return Http.Response.success(res, result);
  });
}

module.exports = new ProgramController();