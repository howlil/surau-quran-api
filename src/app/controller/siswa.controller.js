const siswaService = require('../service/siswa.service');
const Http = require('../../lib/http');
const HttpRequest = require('../../lib/http/request.http');
const ErrorHandler = require('../../lib/http/error.handler.htttp');

class SiswaController {
  registerSiswa = ErrorHandler.asyncHandler(async (req, res) => {
    const data = HttpRequest.getBodyParams(req);
    const result = await siswaService.registerSiswa(data);
    return Http.Response.created(res, result, 'Pendaftaran siswa berhasil');
  });

  getById = ErrorHandler.asyncHandler(async (req, res) => {
    const { id } = HttpRequest.getUrlParams(req);
    const result = await siswaService.getById(id);
    return Http.Response.success(res, result);
  });

  getAll = ErrorHandler.asyncHandler(async (req, res) => {
    const filters = HttpRequest.getQueryParams(req, [
      'page', 'limit', 'namaMurid', 'isRegistered', 'strataPendidikan', 'jenisKelamin'
    ]);
    const result = await siswaService.getAll(filters);
    return Http.Response.success(res, result);
  });

  getProfile = ErrorHandler.asyncHandler(async (req, res) => {
    const { id: userId } = req.user;
    const result = await siswaService.getProfile(userId);
    return Http.Response.success(res, result);
  });

  updateProfile = ErrorHandler.asyncHandler(async (req, res) => {
    const { id: userId } = req.user;
    const data = HttpRequest.getBodyParams(req);
    const result = await siswaService.updateProfile(userId, data);
    return Http.Response.success(res, result, 'Profil berhasil diperbarui');
  });

  delete = ErrorHandler.asyncHandler(async (req, res) => {
    const { id } = HttpRequest.getUrlParams(req);
    await siswaService.delete(id);
    return Http.Response.success(res, { id }, 'Siswa berhasil dihapus');
  });
}

module.exports = new SiswaController();