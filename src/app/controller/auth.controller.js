const authService = require('../service/auth.service');
const ResponseFactory = require('../../lib/factories/response.factory');
const ErrorFactory = require('../../lib/factories/error.factory');
const logger = require('../../lib/config/logger.config');

class AuthController {

  login = async (req, res, next) => {
    try {
      const data = req.extract.getBody(['email', 'password']);
      const result = await authService.login({ data });
      return ResponseFactory.get(result).send(res);
    } catch (error) {
      next(ErrorFactory.unauthorized(error.message));
    }
  };

  logout = async (req, res, next) => {
    try {
      return ResponseFactory.get().send(res);
    } catch (error) {
      logger.error(error);
      next(error);
    }
  };


  forgotPassword = async (req, res, next) => {
    try {
      const data = req.extract.getBody(['email']);

      if (!data.email) {
        throw ErrorFactory.badRequest('Email is required');
      }

      const result = await authService.requestPasswordReset({ data });

      return ResponseFactory.get(result).send(res);
    } catch (error) {
      logger.error('Error processing forgot password request:', error);

      if (error.name === 'NotFoundError') {
        return ResponseFactory.get({}).send(res);
      }

      next(error)
    }
  };

  resetPassword = async (req, res, next) => {
    try {
      const data = req.extract.getBody(['token', 'newPassword']);
      const result = await authService.resetPassword({ data });
      return ResponseFactory.get(result).send(res);
    } catch (error) {
      logger.error(error);
      next(error)
    }
  };

  changePassword = async (req, res, next) => {
    try {
      const data = req.extract.getBody(['oldPassword', 'newPassword']);
      const userId = req.user.id;
      const result = await authService.changePassword({ data, userId });
      return ResponseFactory.get(result).send(res);
    } catch (error) {
      logger.error(error);
      next(error)
    }
  };

  checkRoleByRfid = async (req, res, next) => {
    try {
      const data = req.extract.getBody(['rfid']);
      const result = await authService.checkRoleByRfid({ data });
      return ResponseFactory.get(result).send(res);
    } catch (error) {
      logger.error(error);
      next(error)
    }
  };
}

module.exports = new AuthController();