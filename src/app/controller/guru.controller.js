const guruService = require('../service/guru.service');
const Http = require('../../lib/http');
const HttpRequest = require('../../lib/http/request.http');
const ErrorHandler = require('../../lib/http/error.handler.htttp');

class GuruController {
  create = ErrorHandler.asyncHandler(async (req, res) => {
    const data = HttpRequest.getBodyParams(req);
    const result = await guruService.create(data);
    return Http.Response.created(res, result, 'Guru berhasil dibuat');
  });

  update = ErrorHandler.asyncHandler(async (req, res) => {
    const { id } = HttpRequest.getUrlParams(req);
    const data = HttpRequest.getBodyParams(req);
    const result = await guruService.update(id, data);
    return Http.Response.success(res, result, 'Guru berhasil diperbarui');
  });

  delete = ErrorHandler.asyncHandler(async (req, res) => {
    const { id } = HttpRequest.getUrlParams(req);
    await guruService.delete(id);
    return Http.Response.success(res, { id }, 'Guru berhasil dihapus');
  });



  getAll = ErrorHandler.asyncHandler(async (req, res) => {
    const filters = HttpRequest.getQueryParams(req, [
      'page', 'limit'
    ]);
    const result = await guruService.getAll(filters);
    return Http.Response.success(res, result);
  });

}

module.exports = new GuruController();