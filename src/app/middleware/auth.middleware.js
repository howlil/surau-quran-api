const TokenUtils = require('../../lib/utils/token.utils');
const { UnauthorizedError, ForbiddenError } = require('../../lib/http/errors.http');
const HttpRequest = require('../../lib/http/request.http');

class AuthMiddleware {
  async authenticate(req, res, next) {
    try {
      const token = HttpRequest.getAuthToken(req);
      
      if (!token) {
        return next(new UnauthorizedError('Akses ditolak. Token tidak ditemukan'));
      }
      
      const user = await TokenUtils.verifyToken(token);
      
      req.user = user;
      
      next();
    } catch (error) {
      next(error);
    }
  }

  authorize(allowedRoles = []) {
    return (req, res, next) => {
      try {
        if (!req.user) {
          return next(new UnauthorizedError('Akses ditolak. User tidak terautentikasi'));
        }
        
        if (allowedRoles.length > 0 && !allowedRoles.includes(req.user.role)) {
          return next(new ForbiddenError('Akses ditolak. Anda tidak memiliki hak akses'));
        }
        
        next();
      } catch (error) {
        next(error);
      }
    };
  }

  // Method baru untuk menangani role-based access control yang lebih kompleks
  authorizeByRole(restrictedRoles = []) {
    return (req, res, next) => {
      try {
        if (!req.user) {
          return next(new UnauthorizedError('Akses ditolak. User tidak terautentikasi'));
        }
        
        // Jika role user ada dalam daftar restricted, tolak akses
        if (restrictedRoles.includes(req.user.role)) {
          return next(new ForbiddenError('Akses ditolak. Anda tidak memiliki hak akses'));
        }
        
        next();
      } catch (error) {
        next(error);
      }
    };
  }


}

module.exports = new AuthMiddleware();