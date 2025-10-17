const guruService = require('../service/guru.service');
const ResponseFactory = require('../../lib/factories/response.factory');
const ErrorFactory = require('../../lib/factories/error.factory');
const { prisma } = require('../../lib/config/prisma.config');
const FileUtils = require('../../lib/utils/file.utils');

class GuruController {
  create = async (req, res, next) => {
    try {
      const data = req.extract.getBody();

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
      return ResponseFactory.created(transformedResult).send(res);
    } catch (error) {
      next(error)
    }
  };

  update = async (req, res, next) => {
    try {
      const { id } = req.extract.getParams(['id']);
      const data = req.extract.getBody();

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
      return ResponseFactory.updated(transformedResult).send(res);
    } catch (error) {
      next(error)
    }
  };

  delete = async (req, res, next) => {
    try {
      const { id } = req.extract.getParams(['id']);
      await guruService.delete(id);
      return ResponseFactory.deleted().send(res);
    } catch (error) {
      next(error)
    }
  };

  getAll = async (req, res, next) => {
    try {
      const filters = req.extract.getQuery([
        'page', 'limit', 'nama'
      ]);
      const baseUrl = process.env.BACKEND_URL || `${req.protocol}://${req.get('host')}`;
      const result = await guruService.getAll(filters);

      const transformedData = {
        ...result,
        data: FileUtils.transformGuruListFiles(result.data, baseUrl)
      };

      return ResponseFactory.getAll(transformedData.data, transformedData.meta).send(res);
    } catch (error) {
next(error)
    }
  };

  getAllWithSchedules = async (req, res, next) => {
    try {
      const baseUrl = process.env.BACKEND_URL || `${req.protocol}://${req.get('host')}`;
      const filters = req.extract.getQuery(['page', 'limit', 'nama']);
      const result = await guruService.getAllGuruWithSchedules(filters);

      const transformedResult = {
        ...result,
        data: result.data.map(guru => ({
          ...guru,
          fotoProfile: FileUtils.getImageUrl(baseUrl, guru.fotoProfile)
        }))
      };

      return ResponseFactory.getAll(transformedResult.data, transformedResult.meta).send(res);
    } catch (error) {
next(error)
    }
  };

  getKelasProgramWithStudents = async (req, res, next) => {
    try {
      const userId = req.user.id;

      const guru = await prisma.guru.findUnique({
        where: { userId }
      });

      if (!guru) {
        throw ErrorFactory.notFound('Profil guru tidak ditemukan');
      }

      const result = await guruService.getKelasProgramWithStudents(guru.id);
      return ResponseFactory.get(result).send(res);
    } catch (error) {
      next(error);
    }
  };

  downloadContract = async (req, res, next) => {
    try {
      const userId = req.user.id;

      const guru = await prisma.guru.findUnique({
        where: { userId }
      });

      if (!guru) {
        throw ErrorFactory.notFound('Profil guru tidak ditemukan');
      }

      const { filePath, fileName } = await guruService.getContractFile(guru.id);

      // Set headers for PDF download
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

      // Stream the file
      const fileStream = require('fs').createReadStream(filePath);
      fileStream.pipe(res);
    } catch (error) {
      next(error)
    }
  };
}

module.exports = new GuruController();