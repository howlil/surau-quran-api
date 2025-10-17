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


  forgotPassword = async (req, res, next) => {
    try {
      const { email } = req.extract.getBody(['email']);

      if (!email) {
        throw ErrorFactory.badRequest('Email is required');
      }

      const result = await authService.requestPasswordReset(email);

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