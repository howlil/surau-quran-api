const authService = require('../service/auth.service');
const Http = require('../../lib/http');

class AuthController {
  async login(req, res, next) {
    try {
      const { email, password } = req.body;
      const result = await authService.login(email, password);
      
      return Http.Response.success(res, result, 'Login berhasil');
    } catch (error) {
      next(error);
    }
  }

  async logout(req, res, next) {
    try {
      const token = Http.Request.getAuthToken(req);
      
      if (!token) {
        return Http.Response.unauthorized(res, 'Token tidak ditemukan');
      }
      
      await authService.logout(token);
      
      return Http.Response.success(res, null, 'Logout berhasil');
    } catch (error) {
      next(error);
    }
  }

  async createGuru(req, res, next) {
    try {
      const guruData = req.body;
      const result = await authService.createGuru(guruData);
      
      return Http.Response.created(res, result, 'Akun guru berhasil dibuat');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AuthController();