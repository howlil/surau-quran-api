const guruService = require('../service/guru.service');
const Http = require('../../lib/http');
const HttpRequest = require('../../lib/http/request.http');
const ErrorHandler = require('../../lib/http/error.handler.htttp');
const { prisma } = require('../../lib/config/prisma.config');
const { NotFoundError } = require('../../lib/http/errors.http');

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

  // Admin: Get all teachers with their schedules
  getAllWithSchedules = ErrorHandler.asyncHandler(async (req, res) => {
    const result = await guruService.getAllGuruWithSchedules();
    return Http.Response.success(res, result, 'Data guru dan jadwal berhasil diambil');
  });

  // Get all class programs with enrolled students
  getKelasProgramWithStudents = ErrorHandler.asyncHandler(async (req, res) => {
    const userId = req.user.id;

    const guru = await prisma.guru.findUnique({
      where: { userId }
    });

    // Check if guru exists
    if (!guru) {
      throw new NotFoundError('Profil guru tidak ditemukan');
    }

    const result = await guruService.getKelasProgramWithStudents(guru.id);
    return Http.Response.success(res, result, 'Data kelas program dengan siswa berhasil diambil');
  });


}

module.exports = new GuruController();