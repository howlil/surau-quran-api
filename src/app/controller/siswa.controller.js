const siswaService = require('../service/siswa.service');
const { prisma } = require('../../lib/config/prisma.config');
const Http = require('../../lib/http');
const HttpRequest = require('../../lib/http/request.http');
const ErrorHandler = require('../../lib/http/error.handler.htttp');

class SiswaController {

  getAll = ErrorHandler.asyncHandler(async (req, res) => {
    const filters = HttpRequest.getQueryParams(req, [
      'page', 'limit'
    ]);
    const result = await siswaService.getAll(filters);
    return Http.Response.success(res, result);
  });

  getProfile = ErrorHandler.asyncHandler(async (req, res) => {
    const { id: userId } = req.user;
    const filters = HttpRequest.getQueryParams(req, ['bulan', 'page', 'limit']);
    const result = await siswaService.getProfile(userId, filters);
    return Http.Response.success(res, result);
  });


  adminUpdateSiswa = ErrorHandler.asyncHandler(async (req, res) => {
    const { id } = HttpRequest.getUrlParams(req);
    const data = HttpRequest.getBodyParams(req);
    await siswaService.adminUpdateSiswa(id, data);
    return Http.Response.success(res, 'Data siswa berhasil diperbarui');
  });
}

module.exports = new SiswaController();