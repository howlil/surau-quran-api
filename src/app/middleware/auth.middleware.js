const TokenUtils = require('../../lib/utils/token.utils');
const ErrorFactory = require('../../lib/factories/error.factory');
const logger = require('../../lib/config/logger.config');

class AuthMiddleware {
  async authenticate(req, res, next) {
    try {
      const authHeader = req.headers.authorization;
      let token = null;
      
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }
      
      if (!token) {
        return next(ErrorFactory.unauthorized('Akses ditolak. Token tidak ditemukan'));
      }
      
      const decoded = await TokenUtils.verifyToken(token);
      
      const  prisma  = require('../../lib/config/prisma.config');
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        include: {
          siswa: true,
          guru: true,
          admin: true
        }
      });
      
      if (!user) {
        return next(ErrorFactory.unauthorized('User tidak ditemukan'));
      }
      
      req.user = {
        id: user.id,
        email: user.email,
        role: user.role,
      };
      
      next();
    } catch (error) {
      logger.error('Auth middleware error:', error);
      next(error);
    }
  }

  getUserNama(user) {
    if (user.role === 'SISWA' && user.siswa) {
      return user.siswa.namaMurid;
    } else if (user.role === 'GURU' && user.guru) {
      return user.guru.nama;
    } else if (user.role === 'ADMIN_SURAU' && user.admin) {
      return user.admin.nama;
    } else if (user.role === 'SUPER_ADMIN') {
      return 'Super Admin';
    }
    return 'User';
  }

  authorize(allowedRoles = []) {
    return (req, res, next) => {
      try {
        if (!req.user) {
          return next(ErrorFactory.unauthorized('Akses ditolak. User tidak terautentikasi'));
        }
        
        if (allowedRoles.length > 0 && !allowedRoles.includes(req.user.role)) {
          logger.error(`Access denied for user ${req.user.email} with role ${req.user.role}. Allowed roles: ${allowedRoles.join(', ')}`);
          return next(ErrorFactory.forbidden('Akses ditolak. Anda tidak memiliki hak akses'));
        }
        
        next();
      } catch (error) {
        logger.error('Authorize middleware error:', error);
        next(error);
      }
    };
  }


}

module.exports = new AuthMiddleware();