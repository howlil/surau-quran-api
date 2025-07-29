const rfidService = require('../service/rfid.service');
const Http = require('../../lib/http');
const HttpRequest = require('../../lib/http/request.http');
const ErrorHandler = require('../../lib/http/error.handler.htttp');

class RfidController {
    // Search users (guru dan siswa) untuk pendaftaran RFID
    searchUser = ErrorHandler.asyncHandler(async (req, res) => {
        const filters = HttpRequest.getQueryParams(req, ['search', 'role', 'page', 'limit']);
        const result = await rfidService.searchUser(filters);
        return Http.Response.success(res, result, 'Pencarian user berhasil');
    });

    // Register RFID untuk user
    registerRfid = ErrorHandler.asyncHandler(async (req, res) => {
        const { userId, rfid } = HttpRequest.getBodyParams(req);
        const result = await rfidService.registerRfid(userId, rfid);
        return Http.Response.created(res, result, 'RFID berhasil didaftarkan');
    });

    // Update RFID user
    updateRfid = ErrorHandler.asyncHandler(async (req, res) => {
        const { id } = HttpRequest.getUrlParams(req);
        const { rfid } = HttpRequest.getBodyParams(req);
        const result = await rfidService.updateRfid(id, rfid);
        return Http.Response.success(res, result, 'RFID berhasil diperbarui');
    });

    // Delete RFID user
    deleteRfid = ErrorHandler.asyncHandler(async (req, res) => {
        const { id } = HttpRequest.getUrlParams(req);
        const result = await rfidService.deleteRfid(id);
        return Http.Response.success(res, result, 'RFID berhasil dihapus');
    });

    // Get list semua user dengan status RFID
    getRfidList = ErrorHandler.asyncHandler(async (req, res) => {
        const filters = HttpRequest.getQueryParams(req, ['search', 'role', 'hasRfid', 'page', 'limit']);
        const result = await rfidService.getRfidList(filters);
        return Http.Response.success(res, result, 'Daftar RFID berhasil diambil');
    });

    // Get detail RFID user
    
}

module.exports = new RfidController(); 