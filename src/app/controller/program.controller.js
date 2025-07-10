const programService = require('../service/program.service');
const Http = require('../../lib/http');
const HttpRequest = require('../../lib/http/request.http');
const ErrorHandler = require('../../lib/http/error.handler.htttp');
const FileUtils = require('../../lib/utils/file.utils');

class ProgramController {
  create = ErrorHandler.asyncHandler(async (req, res) => {
    const data = HttpRequest.getBodyParams(req);

    // Handle cover file upload - file is required and validated by middleware
    if (req.file && req.file.fieldname === 'cover') {
      data.cover = req.file.filename;
    }

    const baseUrl = process.env.BACKEND_URL || `${req.protocol}://${req.get('host')}`;
    const result = await programService.create(data);
    const transformedResult = FileUtils.transformProgramFiles(result, baseUrl);

    const responseData = {
      programId: transformedResult.id,
      namaProgram: transformedResult.namaProgram,
      deskripsi: transformedResult.deskripsi,
      cover: transformedResult.cover
    };
    return Http.Response.created(res, responseData, 'Program berhasil dibuat');
  });

  update = ErrorHandler.asyncHandler(async (req, res) => {
    const { id } = HttpRequest.getUrlParams(req);
    const data = HttpRequest.getBodyParams(req);

    // Handle cover file upload - only update if new file uploaded
    if (req.file && req.file.fieldname === 'cover') {
      data.cover = req.file.filename;
    } else {
      // Remove cover from data if no file uploaded
      delete data.cover;
    }

    const baseUrl = process.env.BACKEND_URL || `${req.protocol}://${req.get('host')}`;
    const result = await programService.update(id, data);
    const transformedResult = FileUtils.transformProgramFiles(result, baseUrl);

    const responseData = {
      programId: transformedResult.id,
      namaProgram: transformedResult.namaProgram,
      deskripsi: transformedResult.deskripsi,
      cover: transformedResult.cover
    };
    return Http.Response.success(res, responseData, 'Program berhasil diperbarui');
  });

  delete = ErrorHandler.asyncHandler(async (req, res) => {
    const { id } = HttpRequest.getUrlParams(req);
    await programService.delete(id);
    return Http.Response.success(res, null, 'Program berhasil dihapus');
  });

  getAll = ErrorHandler.asyncHandler(async (req, res) => {
    const result = await programService.getAll();
    const mappedResult = result.map(program => ({
      programId: program.id,
      namaProgram: program.namaProgram
    }));
    return Http.Response.success(res, mappedResult, 'Data program berhasil diambil');
  });

  getAllPublic = ErrorHandler.asyncHandler(async (req, res) => {
    const baseUrl = process.env.BACKEND_URL || `${req.protocol}://${req.get('host')}`;
    const result = await programService.getAllPublic();
    const transformedResult = FileUtils.transformProgramListFiles(result, baseUrl);
    const mappedResult = transformedResult.map(program => ({
      programId: program.id,
      namaProgram: program.namaProgram,
      deskripsi: program.deskripsi,
      cover: program.cover
    }));
    return Http.Response.success(res, mappedResult, 'Data program publik berhasil diambil');
  });

  getProgramStudents = ErrorHandler.asyncHandler(async (req, res) => {
    const { programId } = HttpRequest.getUrlParams(req);
    const result = await programService.getProgramStudents(programId);
    return Http.Response.success(res, result);
  });

  addKelasPengganti = ErrorHandler.asyncHandler(async (req, res) => {
    const guruId = req.user.id;
    const data = HttpRequest.getBodyParams(req);
    const result = await programService.addKelasPengganti(guruId, data);
    return Http.Response.created(res, result, 'Siswa berhasil ditambahkan ke kelas pengganti');
  });

  removeKelasPengganti = ErrorHandler.asyncHandler(async (req, res) => {
    const guruId = req.user.id;
    const { kelasProgramId } = HttpRequest.getUrlParams(req);
    const result = await programService.removeKelasPengganti(guruId, kelasProgramId);
    return Http.Response.success(res, result, result.message);
  });

  getSiswaKelasPengganti = ErrorHandler.asyncHandler(async (req, res) => {
    const filters = HttpRequest.getQueryParams(req, ['search', 'page', 'limit']);
    
    const result = await programService.getSiswaKelasPengganti(filters);
    return Http.Response.success(res, result, 'Data kelas pengganti berhasil diambil');
  });

}

module.exports = new ProgramController();