const programService = require('../service/program.service');
const ResponseFactory = require('../../lib/factories/response.factory');
const ErrorFactory = require('../../lib/factories/error.factory');
const FileUtils = require('../../lib/utils/file.utils');
const { prisma } = require('../../lib/config/prisma.config');

class ProgramController {
  create = async (req, res, next) => {
    try {
      const data = req.extract.getBody();

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
      return ResponseFactory.created(responseData).send(res);
    } catch (error) {
      next(error)
    }
  };

  update = async (req, res, next) => {
    try {
      const { id } = req.extract.getParams(['id']);
      const data = req.extract.getBody();

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
      return ResponseFactory.updated(responseData).send(res);
    } catch (error) {
      next(error)
    }
  };

  delete = async (req, res, next) => {
    try {
      const { id } = req.extract.getParams(['id']);
      await programService.delete(id);
      return ResponseFactory.deleted().send(res);
    } catch (error) {
      next(error)
    }
  };

  getAll = async (req, res, next) => {
    try {
      const filters = req.extract.getQuery(['namaProgram']);
      const baseUrl = process.env.BACKEND_URL || `${req.protocol}://${req.get('host')}`;
      const result = await programService.getAllNoPagination(filters);
      
      const transformedData = result.map(program => ({
        programId: program.id,
        namaProgram: program.namaProgram,
        deskripsi: program.deskripsi,
        cover: FileUtils.getImageUrl(baseUrl, program.cover),
        tipeProgram: program.tipeProgram,
        biayaSpp: Number(program.biayaSpp),
        createdAt: program.createdAt,
        updatedAt: program.updatedAt
      }));
      
      return ResponseFactory.get(transformedData).send(res);
    } catch (error) {
next(error)
    }
  };

  getAllPublic = async (req, res, next) => {
    try {
      const baseUrl = process.env.BACKEND_URL || `${req.protocol}://${req.get('host')}`;
      const result = await programService.getAllPublic();
      const transformedResult = FileUtils.transformProgramListFiles(result, baseUrl);
      const mappedResult = transformedResult.map(program => ({
        programId: program.id,
        namaProgram: program.namaProgram,
        deskripsi: program.deskripsi,
        tipeProgram: program.tipeProgram,
        cover: program.cover
      }));
      return ResponseFactory.get(mappedResult).send(res);
    } catch (error) {
next(error)
    }
  };

  getProgramStudents = async (req, res, next) => {
    try {
      const { programId } = req.extract.getParams(['programId']);
      const filters = req.extract.getQuery(['page', 'limit']);
      const result = await programService.getProgramStudents(programId, filters);
      return ResponseFactory.getAll(result.data, result.meta).send(res);
    } catch (error) {
next(error)
    }
  };

  addKelasPengganti = async (req, res, next) => {
    try {
      const userId = req.user.id;

      // Convert userId to guruId
      const guru = await prisma.guru.findUnique({
        where: { userId }
      });

      if (!guru) {
        throw ErrorFactory.notFound('Profil guru tidak ditemukan');
      }

      const data = req.extract.getBody();
      const result = await programService.addKelasPengganti(guru.id, data);
      return ResponseFactory.created(result).send(res);
    } catch (error) {
      next(error);
    }
  };

  removeKelasPengganti = async (req, res, next) => {
    try {
      const userId = req.user.id;

      // Convert userId to guruId
      const guru = await prisma.guru.findUnique({
        where: { userId }
      });

      if (!guru) {
        throw ErrorFactory.notFound('Profil guru tidak ditemukan');
      }

      const { kelasProgramId } = req.extract.getParams(['kelasProgramId']);
      const result = await programService.removeKelasPengganti(guru.id, kelasProgramId);
      return ResponseFactory.get(result).send(res);
    } catch (error) {
      next(error);
    }
  };

  getSiswaKelasPengganti = async (req, res, next) => {
    try {
      const filters = req.extract.getQuery(['search', 'page', 'limit']);

      const result = await programService.getSiswaKelasPengganti(filters);
      return ResponseFactory.getAll(result.data, result.meta).send(res);
    } catch (error) {
next(error)
    }
  };

}

module.exports = new ProgramController();