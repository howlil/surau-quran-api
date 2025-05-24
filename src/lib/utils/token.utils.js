const jwt = require('jsonwebtoken');
const { prisma } = require('../config/prisma.config');
const { UnauthorizedError } = require('../http/errors.http');
require('dotenv').config();


class TokenUtils {
  static #jwtSecret = process.env.JWT_SECRET;
  static #jwtExpires = process.env.JWT_EXPIRES || '24h';

  static async generateToken(userId) {
    const expiresIn = this.#jwtExpires;

    const token = jwt.sign({ userId }, this.#jwtSecret, { expiresIn });

    await prisma.token.create({
      data: {
        userId,
        token
      }
    });

    return token;
  }

  static async verifyToken(token) {
    try {
      const decoded = jwt.verify(token, this.#jwtSecret);

      const tokenRecord = await prisma.token.findFirst({
        where: {
          token,
          userId: decoded.userId
        }
      });

      if (!tokenRecord) {
        throw new UnauthorizedError('Token tidak valid');
      }

      const user = await prisma.user.findUnique({
        where: { id: decoded.userId }
      });

      if (!user) {
        throw new UnauthorizedError('User tidak ditemukan');
      }

      return user;
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        throw new UnauthorizedError('Token tidak valid');
      }

      if (error instanceof jwt.TokenExpiredError) {
        throw new UnauthorizedError('Token kadaluarsa');
      }

      throw error;
    }
  }

  static async revokeToken(token) {
    await prisma.token.deleteMany({
      where: { token }
    });
    return true;
  }

  static async revokeAllUserTokens(userId) {
    await prisma.token.deleteMany({
      where: { userId }
    });
    return true;
  }
}

module.exports = TokenUtils;