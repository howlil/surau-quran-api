const rfidService = require('../service/rfid.service');
const ResponseFactory = require('../../lib/factories/response.factory');
const ErrorFactory = require('../../lib/factories/error.factory');

class RfidController {
    // Search users (guru dan siswa) untuk pendaftaran RFID
    searchUser = async (req, res, next) => {
        try {
            const filters = req.extract.getQuery(['search', 'role', 'page', 'limit']);
            const result = await rfidService.searchUser(filters);
            return ResponseFactory.getAll(result.data, result.meta).send(res);
        } catch (error) {
      next(error)
        }
    };

    // Register RFID untuk user
    registerRfid = async (req, res, next) => {
        try {
            const { userId, rfid } = req.extract.getBody(['userId', 'rfid']);
            const result = await rfidService.registerRfid(userId, rfid);
            return ResponseFactory.created(result).send(res);
        } catch (error) {
            next(error)
        }
    };

    // Update RFID user
    updateRfid = async (req, res, next) => {
        try {
            const { id } = req.extract.getParams(['id']);
            const { rfid } = req.extract.getBody(['rfid']);
            const result = await rfidService.updateRfid(id, rfid);
            return ResponseFactory.updated(result).send(res);
        } catch (error) {
            next(error)
        }
    };

    // Delete RFID user
    deleteRfid = async (req, res, next) => {
        try {
            const { id } = req.extract.getParams(['id']);
            const result = await rfidService.deleteRfid(id);
            return ResponseFactory.deleted().send(res);
        } catch (error) {
            next(error)
        }
    };

    // Get list semua user dengan status RFID
    getRfidList = async (req, res, next) => {
        try {
            const filters = req.extract.getQuery(['search', 'role', 'hasRfid', 'page', 'limit']);
            const result = await rfidService.getRfidList(filters);
            return ResponseFactory.getAll(result.data, result.meta).send(res);
        } catch (error) {
      next(error)
        }
    };

    // Get detail RFID user
    
}

module.exports = new RfidController(); 