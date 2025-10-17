const authService = require('../service/auth.service');
const ResponseFactory = require('../../lib/factories/response.factory');
const ErrorFactory = require('../../lib/factories/error.factory');
const { logger } = require('../../lib/config/logger.config');

class AuthController {

  login = async (req, res, next) => {
    try {
      const { email, password } = req.extract.getBody(['email', 'password']);
      const result = await authService.login(email, password);
      return ResponseFactory.get(result).send(res);
    } catch (error) {
      next(ErrorFactory.unauthorized(error.message));
    }
  };

  logout = async (req, res, next) => {
    try {
      const token = req.extract.getHeaders(['authorization']).authorization?.replace('Bearer ', '');
      if (!token) {
        throw ErrorFactory.unauthorized('Token tidak ditemukan');
      }
      await authService.logout(token);
      return ResponseFactory.get({ message: 'Logout berhasil' }).send(res);
    } catch (error) {
      next(error);
    }
  };

  createAdmin = async (req, res, next) => {
    try {
      const userId = req.user.id;
      const data = req.extract.getBody();
      const result = await authService.createAdmin(data, userId);
      return ResponseFactory.created(result).send(res);
    } catch (error) {
      next(error)
    }
  };

  getAllAdmins = async (req, res, next) => {
    try {
      const userId = req.user.id;
      const filters = req.extract.getQuery(['page', 'limit', 'nama']);
      const result = await authService.getAllAdmins(userId, filters);
      
      const transformedData = {
        ...result,
        data: result.data
          .filter(admin => admin.user.role === 'ADMIN')
          .map(admin => ({
            id: admin.id,
            nama: admin.nama,
            email: admin.user.email,
          }))
      };
      
      return ResponseFactory.getAll(transformedData.data, transformedData.meta).send(res);
    } catch (error) {
next(error)
    }
  };

  updateAdmin = async (req, res, next) => {
    try {
      const userId = req.user.id;
      const { id: adminId } = req.extract.getParams(['id']);
      const data = req.extract.getBody();
      const result = await authService.updateAdmin(adminId, data, userId);
      return ResponseFactory.updated(result).send(res);
    } catch (error) {
      next(error)
    }
  };

  deleteAdmin = async (req, res, next) => {
    try {
      const userId = req.user.id;
      const { id: adminId } = req.extract.getParams(['id']);
      await authService.deleteAdmin(adminId, userId);
      return ResponseFactory.deleted().send(res);
    } catch (error) {
      next(error)
    }
  };

  forgotPassword = async (req, res, next) => {
    try {
      const { email } = req.extract.getBody(['email']);

      if (!email) {
        throw ErrorFactory.badRequest('Email is required');
      }

      const result = await authService.requestPasswordReset(email);

      // Check if token was returned (email sending failed)
      if (result.token) {
        // In development mode, return the token for testing
        if (process.env.NODE_ENV === 'development') {
          return ResponseFactory.get({
            message: result.message,
            token: result.token,
            resetLink: `${process.env.FRONTEND_URL}/reset-password?token=${result.token}`
          }).send(res);
        }
      }

      return ResponseFactory.get(result).send(res);
    } catch (error) {
      logger.error('Error processing forgot password request:', error);

      if (error.name === 'NotFoundError') {
        return ResponseFactory.get({
          message: 'If the email exists, a password reset email has been sent'
        }).send(res);
      }

next(error)
    }
  };

  resetPassword = async (req, res, next) => {
    try {
      const { token, newPassword } = req.extract.getBody(['token', 'newPassword']);
      const result = await authService.resetPassword(token, newPassword);
      return ResponseFactory.get(result).send(res);
    } catch (error) {
      next(error)
    }
  };

  changePassword = async (req, res, next) => {
    try {
      const { oldPassword, newPassword } = req.extract.getBody(['oldPassword', 'newPassword']);
      const userId = req.user.id;
      const result = await authService.changePassword(userId, oldPassword, newPassword);
      return ResponseFactory.get({ message: result.message }).send(res);
    } catch (error) {
      next(error)
    }
  };

  checkRoleByRfid = async (req, res, next) => {
    try {
      const { rfid } = req.extract.getBody(['rfid']);
      const result = await authService.checkRoleByRfid(rfid);
      return ResponseFactory.get(result).send(res);
    } catch (error) {
      next(error)
    }
  };
}

module.exports = new AuthController();