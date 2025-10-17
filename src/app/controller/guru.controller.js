const guruService = require('../service/guru.service');
const ResponseFactory = require('../../lib/factories/response.factory');
const ErrorFactory = require('../../lib/factories/error.factory');
const { prisma } = require('../../lib/config/prisma.config');

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

      const result = await guruService.create({ data });
      return ResponseFactory.created(result).send(res);
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

      const result = await guruService.update({ data, where: { id } });
      return ResponseFactory.updated(result).send(res);
    } catch (error) {
      next(error)
    }
  };

  delete = async (req, res, next) => {
    try {
      const { id } = req.extract.getParams(['id']);
      await guruService.delete({ where: { id } });
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
      const result = await guruService.getAll({ data: filters });
      return ResponseFactory.getAll(result.data, result.meta).send(res);
    } catch (error) {
      next(error)
    }
  };

  
  getAllWithSchedules = async (req, res, next) => {
    try {
      const filters = req.extract.getQuery(['page', 'limit', 'nama']);
      const result = await guruService.getAllGuruWithSchedules(filters);
      return ResponseFactory.getAll(result.data, result.meta).send(res);
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

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

      const fileStream = require('fs').createReadStream(filePath);
      fileStream.pipe(res);
    } catch (error) {
      next(error)
    }
  };
}

module.exports = new GuruController();