const authService = require('../service/auth.service');
const Http = require('../../lib/http');
const HttpRequest = require('../../lib/http/request.http');
const ErrorHandler = require('../../lib/http/error.handler.htttp');
const { logger } = require('../../lib/config/logger.config');
const { NotFoundError } = require('../../lib/http/error.handler.http');

class AuthController {

  login = ErrorHandler.asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    const result = await authService.login(email, password);
    return Http.Response.success(res, result, 'Login berhasil');
  }
  );

  logout = ErrorHandler.asyncHandler(async (req, res) => {
    const token = Http.Request.getAuthToken(req);
    if (!token) {
      return Http.Response.unauthorized(res, 'Token tidak ditemukan');
    }
    await authService.logout(token);
    return Http.Response.success(res, 'Logout berhasil');
  });

  createAdmin = ErrorHandler.asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const result = await authService.createAdmin(req.body, userId);
    return Http.Response.created(res, result, 'Admin berhasil dibuat');
  });

  getAllAdmins = ErrorHandler.asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const filters = HttpRequest.getQueryParams(req, ['page', 'limit', 'nama']);
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
    
    return Http.Response.success(res, transformedData, 'Daftar admin berhasil diambil');
  });

  updateAdmin = ErrorHandler.asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const adminId = req.params.id;
    const result = await authService.updateAdmin(adminId, req.body, userId);
    return Http.Response.success(res, result, 'Admin berhasil diperbarui');
  });

  deleteAdmin = ErrorHandler.asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const adminId = req.params.id;
    await authService.deleteAdmin(adminId, userId);
    return Http.Response.success(res, 'Admin berhasil dihapus');
  });

  forgotPassword = ErrorHandler.asyncHandler(async (req, res) => {
    try {
      const { email } = req.body;

      if (!email) {
        return Http.Response.badRequest(res, 'Email is required');
      }

      const result = await authService.requestPasswordReset(email);

      // Check if token was returned (email sending failed)
      if (result.token) {
        // In development mode, return the token for testing
        if (process.env.NODE_ENV === 'development') {
          return Http.Response.success(res, {
            message: result.message,
            token: result.token,
            resetLink: `${process.env.FRONTEND_URL}/reset-password?token=${result.token}`
          }, 'Password reset token generated but email could not be sent');
        }
      }

      return Http.Response.success(res, result, 'Password reset email sent');
    } catch (error) {
      logger.error('Error processing forgot password request:', error);

      // Don't expose whether an email exists or not
      if (error instanceof NotFoundError) {
        return Http.Response.success(res, {
          message: 'If the email exists, a password reset email has been sent'
        });
      }

      return Http.Response.error(res, error.message);
    }
  });

  resetPassword = ErrorHandler.asyncHandler(async (req, res) => {
    const { token, newPassword } = req.body;
    const result = await authService.resetPassword(token, newPassword);
    return Http.Response.success(res, result, result.message);
  });

  changePassword = ErrorHandler.asyncHandler(async (req, res) => {
    const { oldPassword, newPassword } = req.body;
    const userId = req.user.id;
    const result = await authService.changePassword(userId, oldPassword, newPassword);
    return Http.Response.success(res, null, result.message);
  });

  checkRoleByRfid = ErrorHandler.asyncHandler(async (req, res) => {
    const { rfid } = req.body;
    const result = await authService.checkRoleByRfid(rfid);
    return Http.Response.success(res, result, 'Role berhasil ditemukan');
  });
}

module.exports = new AuthController();