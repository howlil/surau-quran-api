const kelasService = require('../service/kelas.service');
const Http = require('../../lib/http');
const HttpRequest = require('../../lib/http/request.http');
const ErrorHandler = require('../../lib/http/error.handler.htttp');

class KelasController {
    create = ErrorHandler.asyncHandler(async (req, res) => {
        const data = HttpRequest.getBodyParams(req);
        const result = await kelasService.create(data);
        return Http.Response.created(res, result, 'Kelas berhasil dibuat');
    });

    update = ErrorHandler.asyncHandler(async (req, res) => {
        const { id } = HttpRequest.getUrlParams(req);
        const data = HttpRequest.getBodyParams(req);
        const result = await kelasService.update(id, data);
        return Http.Response.success(res, result, 'Kelas berhasil diperbarui');
    });

    delete = ErrorHandler.asyncHandler(async (req, res) => {
        const { id } = HttpRequest.getUrlParams(req);
        await kelasService.delete(id);
        return Http.Response.success(res, { id }, 'Kelas berhasil dihapus');
    });



    getAll = ErrorHandler.asyncHandler(async (req, res) => {
        const result = await kelasService.getAll();
        return Http.Response.success(res, result);
    });

    getInitialStudentIntoClass = ErrorHandler.asyncHandler(async (req, res) => {
        const query = HttpRequest.getQueryParams(req);
        const result = await kelasService.getInitialStudentIntoClass(query);
        return Http.Response.success(res, result, 'Data siswa awal untuk kelas berhasil diambil');
    });

    createKelasProgram = ErrorHandler.asyncHandler(async (req, res) => {
        const data = HttpRequest.getBodyParams(req);
        const result = await kelasService.createKelasProgram(data);
        return Http.Response.created(res, result, 'Kelas program berhasil dibuat');
    });

    patchInitialStudentIntoClass = ErrorHandler.asyncHandler(async (req, res) => {
        const { kelasProgramId } = HttpRequest.getUrlParams(req);
        const data = HttpRequest.getBodyParams(req);
        const result = await kelasService.patchInitialStudentIntoClass(kelasProgramId, data);
        return Http.Response.success(res, result, 'Kelas program berhasil diupdate');
    });

    deleteKelasProgram = ErrorHandler.asyncHandler(async (req, res) => {
        const { kelasProgramId } = HttpRequest.getUrlParams(req);
        await kelasService.deleteKelasProgram(kelasProgramId);
        return Http.Response.success(res, { kelasProgramId }, 'Kelas program berhasil dihapus');
    });
}

module.exports = new KelasController();