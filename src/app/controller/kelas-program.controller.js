const kelasProgramService = require('../service/kelas-program.service');
const ResponseFactory = require('../../lib/factories/response.factory');
const ErrorFactory = require('../../lib/factories/error.factory');
const prisma  = require('../../lib/config/prisma.config');
const logger = require('../../lib/config/logger.config');

class KelasProgramController {
    createKelasProgram = async (req, res, next) => {
        try {
            const data = req.extract.getBody();
            const result = await kelasProgramService.createKelasProgram({ data });
            return ResponseFactory.created(result).send(res);
        } catch (error) {
            logger.error(error);
      next(error)
        }
    };

    patchInitialStudentIntoClass = async (req, res, next) => {
        try {
            const { kelasProgramId } = req.extract.getParams(['kelasProgramId']);
            const data = req.extract.getBody();

            const result = await kelasProgramService.patchInitialStudentIntoClass({ 
                data, 
                where: { kelasProgramId } 
            });
            return ResponseFactory.updated(result).send(res);
        } catch (error) {
            logger.error(error);
      next(error)
        }
    };

    deleteKelasProgram = async (req, res, next) => {
        try {
            const { kelasProgramId } = req.extract.getParams(['kelasProgramId']);
            const result = await kelasProgramService.deleteKelasProgram({ 
                where: { kelasProgramId } 
            });
            return ResponseFactory.deleted().send(res);
        } catch (error) {
            logger.error(error);
      next(error)
        }
    };


    getInitialStudentIntoClass = async (req, res, next) => {
        try {
            const query = req.extract.getQuery();
            const result = await kelasProgramService.getInitialStudentIntoClass({ 
                filters: query 
            });
            return ResponseFactory.get(result).send(res);
        } catch (error) {
            logger.error(error);
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
            const result = await kelasProgramService.addKelasPengganti({ 
                data, 
                where: { guruId: guru.id } 
            });
            return ResponseFactory.created(result).send(res);
        } catch (error) {
            logger.error(error);
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
            const result = await kelasProgramService.removeKelasPengganti({ 
                where: { guruId: guru.id, kelasProgramId } 
            });
            return ResponseFactory.get(result).send(res);
        } catch (error) {
            logger.error(error);
      next(error);
        }
    };

    getSiswaKelasPengganti = async (req, res, next) => {
        try {
            const filters = req.extract.getQuery(['search', 'page', 'limit']);

            const result = await kelasProgramService.getSiswaKelasPengganti({ filters });
            return ResponseFactory.getAll(result.data, result.meta).send(res);
        } catch (error) {
            logger.error(error);
      next(error)
        }
    };
}

module.exports = new KelasProgramController();
