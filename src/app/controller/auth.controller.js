const authService = require('../service/auth.service');
const Http = require('../../lib/http');
const ErrorHandler = require('../../lib/http/error.handler.htttp');

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
    const admins = await authService.getAllAdmins(userId);
    return Http.Response.success(res, admins, 'Daftar admin berhasil diambil');
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
    const { email } = req.body;
    const result = await authService.requestPasswordReset(email);
    return Http.Response.success(res, result, result.message);
  });

  resetPassword = ErrorHandler.asyncHandler(async (req, res) => {
    const { token, newPassword } = req.body;
    const result = await authService.resetPassword(token, newPassword);
    return Http.Response.success(res, result, result.message);
  });
}

module.exports = new AuthController();