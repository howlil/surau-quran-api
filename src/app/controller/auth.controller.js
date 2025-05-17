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
    return Http.Response.success(res, null, 'Logout berhasil');
  });

}

module.exports = new AuthController();