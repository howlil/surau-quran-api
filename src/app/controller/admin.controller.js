const adminService = require('../service/admin.service');
const ResponseFactory = require('../../lib/factories/response.factory');
const logger = require('../../lib/config/logger.config');
class AdminController {

  createAdmin = async (req, res, next) => {
    try {
      const userId = req.user.id;
      const data = req.extract.getBody();
      const result = await adminService.createAdmin({
        data,
        where: { requestUserId: userId }
      });
      return ResponseFactory.created(result).send(res);
    } catch (error) {
      logger.error(error);
      next(error)
    }
  };

  getAllAdmins = async (req, res, next) => {
    try {
      const userId = req.user.id;
      const filters = req.extract.getQuery(['page', 'limit', 'nama']);
      const result = await adminService.getAllAdmins({
        data: { requestUserId: userId },
        filters
      });
      return ResponseFactory.getAll(result.data, result.meta).send(res);
    } catch (error) {
      logger.error(error);
      next(error)
    }
  };

  updateAdmin = async (req, res, next) => {
    try {
      const userId = req.user.id;
      const { id: adminId } = req.extract.getParams(['id']);
      const data = req.extract.getBody();
      const result = await adminService.updateAdmin({
        data,
        where: { adminId, requestUserId: userId }
      });
      return ResponseFactory.updated(result).send(res);
    } catch (error) {
      logger.error(error);
      next(error)
    }
  };

  deleteAdmin = async (req, res, next) => {
    try {
      const userId = req.user.id;
      const { id: adminId } = req.extract.getParams(['id']);
      await adminService.deleteAdmin({
        where: { adminId, requestUserId: userId }
      });
      return ResponseFactory.deleted().send(res);
    } catch (error) {
      logger.error(error);
      next(error)
    }
  };

}

module.exports = new AdminController();
