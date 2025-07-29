const guruService = require('../service/guru.service');
const Http = require('../../lib/http');
const HttpRequest = require('../../lib/http/request.http');
const ErrorHandler = require('../../lib/http/error.handler.htttp');
const { prisma } = require('../../lib/config/prisma.config');
const { NotFoundError } = require('../../lib/http/errors.http');
const FileUtils = require('../../lib/utils/file.utils');

class GuruController {
  create = ErrorHandler.asyncHandler(async (req, res) => {
    const data = HttpRequest.getBodyParams(req);

    if (req.files) {
      if (req.files.fotoProfile && req.files.fotoProfile[0]) {
        data.fotoProfile = req.files.fotoProfile[0].path;
      }
      if (req.files.suratKontrak && req.files.suratKontrak[0]) {
        data.suratKontrak = req.files.suratKontrak[0].path;
      }
    }

    const baseUrl = process.env.BACKEND_URL || `${req.protocol}://${req.get('host')}`;
    data.baseUrl = baseUrl;

    const result = await guruService.create(data);
    const transformedResult = FileUtils.transformGuruFiles(result, baseUrl);
    return Http.Response.created(res, transformedResult, 'Guru berhasil dibuat');
  });

  update = ErrorHandler.asyncHandler(async (req, res) => {
    const { id } = HttpRequest.getUrlParams(req);
    const data = HttpRequest.getBodyParams(req);

    

    if (req.files) {
      if (req.files.fotoProfile && req.files.fotoProfile[0]) {
        data.fotoProfile = req.files.fotoProfile[0].path;
      }
      if (req.files.suratKontrak && req.files.suratKontrak[0]) {
        data.suratKontrak = req.files.suratKontrak[0].path;
      }
    }

    const baseUrl = process.env.BACKEND_URL || `${req.protocol}://${req.get('host')}`;
    data.baseUrl = baseUrl;

    const result = await guruService.update(id, data);
    const transformedResult = FileUtils.transformGuruFiles(result, baseUrl);
    return Http.Response.success(res, transformedResult, 'Guru berhasil diperbarui');
  });

  delete = ErrorHandler.asyncHandler(async (req, res) => {
    const { id } = HttpRequest.getUrlParams(req);
    await guruService.delete(id);
    return Http.Response.success(res, { id }, 'Guru berhasil dihapus');
  });

  getAll = ErrorHandler.asyncHandler(async (req, res) => {
    const filters = HttpRequest.getQueryParams(req, [
      'page', 'limit', 'nama'
    ]);
    const baseUrl = process.env.BACKEND_URL || `${req.protocol}://${req.get('host')}`;
    const result = await guruService.getAll(filters);

    const transformedData = {
      ...result,
      data: FileUtils.transformGuruListFiles(result.data, baseUrl)
    };

    return Http.Response.success(res, transformedData);
  });

  getAllWithSchedules = ErrorHandler.asyncHandler(async (req, res) => {
    const baseUrl = process.env.BACKEND_URL || `${req.protocol}://${req.get('host')}`;
    const filters = HttpRequest.getQueryParams(req, ['page', 'limit', 'nama']);
    const result = await guruService.getAllGuruWithSchedules(filters);

    const transformedResult = {
      ...result,
      data: result.data.map(guru => ({
        ...guru,
        fotoProfile: FileUtils.getImageUrl(baseUrl, guru.fotoProfile)
      }))
    };

    return Http.Response.success(res, transformedResult, 'Data guru dan jadwal berhasil diambil');
  });

  getKelasProgramWithStudents = ErrorHandler.asyncHandler(async (req, res) => {
    const userId = req.user.id;

    const guru = await prisma.guru.findUnique({
      where: { userId }
    });

    if (!guru) {
      throw new NotFoundError('Profil guru tidak ditemukan');
    }

    const result = await guruService.getKelasProgramWithStudents(guru.id);
    return Http.Response.success(res, result, 'Data kelas program dengan siswa berhasil diambil');
  });

  downloadContract = ErrorHandler.asyncHandler(async (req, res) => {
    const userId = req.user.id;

    const guru = await prisma.guru.findUnique({
      where: { userId }
    });

    const { filePath, fileName } = await guruService.getContractFile(guru.id);

    // Set headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

    // Stream the file
    const fileStream = require('fs').createReadStream(filePath);
    fileStream.pipe(res);
  });
}

module.exports = new GuruController();