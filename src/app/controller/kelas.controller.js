const kelasService = require('../service/kelas.service');
const ResponseFactory = require('../../lib/factories/response.factory');
const ErrorFactory = require('../../lib/factories/error.factory');

class KelasController {
    create = async (req, res, next) => {
        try {
            const data = req.extract.getBody();
            const result = await kelasService.create(data);
            return ResponseFactory.created(result).send(res);
        } catch (error) {
            next(error)
        }
    };

    update = async (req, res, next) => {
        try {
            const { id } = req.extract.getParams(['id']);
            const data = req.extract.getBody();
            const result = await kelasService.update(id, data);
            return ResponseFactory.updated(result).send(res);
        } catch (error) {
            next(error)
        }
    };

    delete = async (req, res, next) => {
        try {
            const { id } = req.extract.getParams(['id']);
            await kelasService.delete(id);
            return ResponseFactory.deleted().send(res);
        } catch (error) {
            next(error)
        }
    };

    getAll = async (req, res, next) => {
        try {
            const result = await kelasService.getAll();
            return ResponseFactory.get(result).send(res);
        } catch (error) {
      next(error)
        }
    };

    getInitialStudentIntoClass = async (req, res, next) => {
        try {
            const query = req.extract.getQuery();
            const result = await kelasService.getInitialStudentIntoClass(query);
            return ResponseFactory.get(result).send(res);
        } catch (error) {
      next(error)
        }
    };

    createKelasProgram = async (req, res, next) => {
        try {
            const data = req.extract.getBody();
            const result = await kelasService.createKelasProgram(data);
            return ResponseFactory.created(result).send(res);
        } catch (error) {
            next(error)
        }
    };

    patchInitialStudentIntoClass = async (req, res, next) => {
        try {
            const { kelasProgramId } = req.extract.getParams(['kelasProgramId']);
            const data = req.extract.getBody();

            const result = await kelasService.patchInitialStudentIntoClass(kelasProgramId, data);
            return ResponseFactory.updated(result).send(res);
        } catch (error) {
            next(error)
        }
    };

    deleteKelasProgram = async (req, res, next) => {
        try {
            const { kelasProgramId } = req.extract.getParams(['kelasProgramId']);
            const result = await kelasService.deleteKelasProgram(kelasProgramId);
            return ResponseFactory.deleted().send(res);
        } catch (error) {
            next(error)
        }
    };

    getCCTV = async (req, res, next) => {
        try {
            const userId = req.user.id;
            const result = await kelasService.getCCTVByUserId(userId);
            return ResponseFactory.get(result).send(res);
        } catch (error) {
      next(error)
        }
    };

}

module.exports = new KelasController();